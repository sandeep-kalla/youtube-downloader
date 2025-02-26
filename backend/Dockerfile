FROM node:18

WORKDIR /app

# Install Python and other dependencies
RUN apt-get update && apt-get install -y python3 python3-pip ffmpeg

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy app files
COPY . .

# Expose the port your app runs on
EXPOSE 5000

# Command to run your app
CMD ["node", "index.js"]