import { useEffect, useRef } from 'react';
import p5 from 'p5';

const P5Background = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const sketch = (p) => {
      const particles = [];
      const numParticles = 60;
      let hueValue = 0;
      let time = 0;

      const shapes = ['triangle', 'hexagon'];
      const colorPalette = [
        { h: 260, s: 90, b: 95 }, // Vibrant purple
        { h: 190, s: 95, b: 90 }, // Electric blue
        { h: 320, s: 85, b: 95 }, // Hot pink
        { h: 150, s: 80, b: 85 }  // Emerald green
      ];

      const drawShape = (p, x, y, size, shape) => {
        if (shape === 'triangle') {
          p.triangle(
            x, y - size,
            x - size * 0.866, y + size * 0.5,
            x + size * 0.866, y + size * 0.5
          );
        } else if (shape === 'hexagon') {
          p.beginShape();
          for (let i = 0; i < 6; i++) {
            const angle = i * p.TWO_PI / 6;
            const px = x + size * p.cos(angle);
            const py = y + size * p.sin(angle);
            p.vertex(px, py);
          }
          p.endShape(p.CLOSE);
        }
      };

      p.setup = () => {
        const canvas = p.createCanvas(window.innerWidth, window.innerHeight);
        canvas.position(0, 0);
        canvas.style('z-index', '-1');
        canvas.parent(containerRef.current);
        p.colorMode(p.HSB, 360, 100, 100, 1.0);

        // Initialize particles with more dynamic properties
        for (let i = 0; i < numParticles; i++) {
          const color = colorPalette[Math.floor(p.random(colorPalette.length))];
          particles.push({
            x: p.random(p.width),
            y: p.random(p.height),
            size: p.random(15, 30),
            baseSize: p.random(15, 30),
            speedX: p.random(-1, 1),
            speedY: p.random(-1, 1),
            shape: shapes[Math.floor(p.random(shapes.length))],
            rotation: p.random(p.TWO_PI),
            rotationSpeed: p.random(-0.02, 0.02),
            hue: color.h,
            saturation: color.s,
            brightness: color.b,
            alpha: p.random(0.3, 0.6),
            waveOffset: p.random(p.TWO_PI)
          });
        }
      };

      p.draw = () => {
        p.clear();
        time += 0.01;
        hueValue = (hueValue + 0.2) % 360;

        // Update and draw particles
        particles.forEach(particle => {
          // Wave motion
          let waveY = p.sin(time + particle.waveOffset) * 2;
          
          // Mouse interaction with smooth transitions
          let dx = p.mouseX - particle.x;
          let dy = p.mouseY - particle.y;
          let distance = p.sqrt(dx * dx + dy * dy);
          
          if (distance < 200) {
            let angle = p.atan2(dy, dx);
            let force = p.map(distance, 0, 200, 4, 0);
            particle.speedX = p.lerp(particle.speedX, -p.cos(angle) * force, 0.08);
            particle.speedY = p.lerp(particle.speedY, -p.sin(angle) * force, 0.08);
            particle.size = p.lerp(particle.size, particle.baseSize * 1.8, 0.1);
            particle.alpha = p.lerp(particle.alpha, 0.8, 0.1);
          } else {
            particle.size = p.lerp(particle.size, particle.baseSize, 0.1);
            particle.alpha = p.lerp(particle.alpha, 0.5, 0.1);
          }

          particle.x += particle.speedX;
          particle.y += particle.speedY + waveY;
          particle.rotation += particle.rotationSpeed;

          // Dynamic friction and attraction to center
          let speed = p.sqrt(particle.speedX * particle.speedX + particle.speedY * particle.speedY);
          let friction = p.map(speed, 0, 5, 0.99, 0.95);
          particle.speedX *= friction;
          particle.speedY *= friction;

          // Gentle repulsion between particles
          particles.forEach(otherParticle => {
            if (otherParticle !== particle) {
              let dx = otherParticle.x - particle.x;
              let dy = otherParticle.y - particle.y;
              let distance = p.sqrt(dx * dx + dy * dy);
              if (distance < 100) {
                let repulsionForce = p.map(distance, 0, 100, 0.1, 0);
                let angle = p.atan2(dy, dx);
                particle.speedX -= p.cos(angle) * repulsionForce;
                particle.speedY -= p.sin(angle) * repulsionForce;
              }
            }
          });

          // Very weak attraction to center to keep particles on screen
          let centerDx = p.width / 2 - particle.x;
          let centerDy = p.height / 2 - particle.y;
          let centerDist = p.sqrt(centerDx * centerDx + centerDy * centerDy);
          if (centerDist > 400) {
            particle.speedX += centerDx * 0.00002;
            particle.speedY += centerDy * 0.00002;
          }

          // Wrap around screen with smooth transition
          if (particle.x < -50) particle.x = p.width + 50;
          if (particle.x > p.width + 50) particle.x = -50;
          if (particle.y < -50) particle.y = p.height + 50;
          if (particle.y > p.height + 50) particle.y = -50;

          // Draw particle with enhanced visual effects
          p.push();
          p.translate(particle.x, particle.y);
          p.rotate(particle.rotation);
          
          // Create glow effect
          p.noStroke();
          let glowSize = particle.size * 1.5;
          p.fill(particle.hue, particle.saturation, particle.brightness, particle.alpha * 0.3);
          drawShape(p, 0, 0, glowSize, particle.shape);
          
          // Draw main shape
          p.fill(particle.hue, particle.saturation, particle.brightness, particle.alpha);
          drawShape(p, 0, 0, particle.size, particle.shape);
          p.pop();
        });

        // Draw enhanced connections between nearby particles
        particles.forEach((particle1, i) => {
          particles.slice(i + 1).forEach(particle2 => {
            let dx = particle2.x - particle1.x;
            let dy = particle2.y - particle1.y;
            let distance = p.sqrt(dx * dx + dy * dy);

            if (distance < 200) {
              let alpha = p.map(distance, 0, 200, 0.5, 0);
              // Create gradient effect for connections
              let gradient = p.drawingContext.createLinearGradient(
                particle1.x, particle1.y,
                particle2.x, particle2.y
              );
              
              gradient.addColorStop(0, p.color(particle1.hue, particle1.saturation, particle1.brightness, alpha));
              gradient.addColorStop(1, p.color(particle2.hue, particle2.saturation, particle2.brightness, alpha));
              
              p.drawingContext.strokeStyle = gradient;
              p.strokeWeight(p.map(distance, 0, 200, 3, 0.5));
              p.line(particle1.x, particle1.y, particle2.x, particle2.y);
            }
          });
        });
        p.strokeWeight(1);
      };

      p.windowResized = () => {
        p.resizeCanvas(window.innerWidth, window.innerHeight);
      };
    };

    const p5Instance = new p5(sketch, containerRef.current);

    return () => {
      p5Instance.remove();
    };
  }, []);

  return <div ref={containerRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
};

export default P5Background;