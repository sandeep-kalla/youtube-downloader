import express from "express";
import cors from "cors";
import multer from "multer";
import supabase from "./supabase.js";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ytdlp from "yt-dlp-exec";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const FILE_EXPIRY_TIME = 20 * 60 * 1000; // 20 minutes in milliseconds

// Store file deletion jobs so they can be canceled if needed
const fileDeletionJobs = new Map();

app.use(cors());
app.use(express.json());

if (!fs.existsSync("downloads")) {
  fs.mkdirSync("downloads");
}

app.post("/get-formats", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    // Add cookies path to avoid YouTube bot detection
    const cookiesPath = path.join(__dirname, "cookies.txt");
    
    const info = await ytdlp(url, {
      dumpSingleJson: true,
      cookies: cookiesPath,
    });

    // Create two separate arrays for video+audio formats and audio-only formats
    const videoWithAudioFormats = info.formats
      .filter(format => format.vcodec !== 'none' && format.acodec !== 'none')
      .map((format) => ({
        format_id: format.format_id,
        resolution: format.height ? `${format.height}p` : 'Unknown',
        ext: format.ext,
        filesize: format.filesize ? `${(format.filesize / 1024 / 1024).toFixed(1)}MB` : 'N/A',
        vcodec: format.vcodec,
        acodec: format.acodec,
        type: 'video' // Add type property to identify format type
      }));
      
    const audioOnlyFormats = info.formats
      .filter(format => format.vcodec === 'none' && format.acodec !== 'none')
      .map((format) => ({
        format_id: format.format_id,
        resolution: 'Audio only',
        ext: format.ext,
        filesize: format.filesize ? `${(format.filesize / 1024 / 1024).toFixed(1)}MB` : 'N/A',
        vcodec: format.vcodec,
        acodec: format.acodec,
        type: 'audio' // Add type property to identify format type
      }));
      
    // Sort video formats by resolution (highest first)
    videoWithAudioFormats.sort((a, b) => {
      const aHeight = parseInt(a.resolution) || 0;
      const bHeight = parseInt(b.resolution) || 0;
      return bHeight - aHeight;
    });
    
    // Sort audio formats by filesize (if available)
    audioOnlyFormats.sort((a, b) => {
      if (a.filesize === 'N/A' || b.filesize === 'N/A') return 0;
      const aSizeNum = parseFloat(a.filesize);
      const bSizeNum = parseFloat(b.filesize);
      // Higher quality (larger size) first
      return bSizeNum - aSizeNum;
    });

    // Combine both arrays
    const allFormats = [...videoWithAudioFormats, ...audioOnlyFormats];

    res.json({ 
      title: info.title, 
      formats: allFormats,
      hasVideoFormats: videoWithAudioFormats.length > 0,
      hasAudioFormats: audioOnlyFormats.length > 0
    });
  } catch (error) {
    console.error("Error fetching formats:", error);
    res.status(500).json({ error: "Failed to fetch formats" });
  }
});

// Schedule file deletion after the specified expiry time
const scheduleFileDeletion = async (filePath) => {
  console.log(`Scheduling deletion for ${filePath} in ${FILE_EXPIRY_TIME/60000} minutes`);
  
  const timeoutId = setTimeout(async () => {
    try {
      console.log(`Deleting expired file: ${filePath}`);
      const { data, error } = await supabase.storage.from("videos").remove([filePath]);
      
      if (error) {
        console.error(`Error deleting file ${filePath}:`, error);
      } else {
        console.log(`Successfully deleted expired file: ${filePath}`);
      }
      
      // Remove the job from the map
      fileDeletionJobs.delete(filePath);
    } catch (err) {
      console.error(`Failed to delete file ${filePath}:`, err);
    }
  }, FILE_EXPIRY_TIME);
  
  // Store the timeout ID so it can be cancelled if needed
  fileDeletionJobs.set(filePath, timeoutId);
};

// 📌 Download and upload to Supabase
app.post("/download", async (req, res) => {
  const { url, format_id } = req.body;

  if (!url || !format_id) {
    return res.status(400).json({ error: "URL and format ID are required" });
  }

  const localFilePath = path.join(__dirname, "downloads", `${Date.now()}.mp4`);
  // Add cookies path to avoid YouTube bot detection
  const cookiesPath = path.join(__dirname, "cookies.txt");

  try {
    // Download video using yt-dlp with cookies
    await ytdlp(url, {
      format: format_id,
      output: localFilePath,
      mergeOutputFormat: 'mp4',
      embedThumbnail: true,
      addMetadata: true,
      audioQuality: 0,
      cookies: cookiesPath
    });

    // Read file buffer
    const fileBuffer = fs.readFileSync(localFilePath);
    const fileName = `videos/${path.basename(localFilePath)}`;

    // Upload to Supabase (Allow overwriting)
    const { data, error } = await supabase.storage
      .from("videos")
      .upload(fileName, fileBuffer, { contentType: "video/mp4" });

    // Delete local file after uploading to free space
    fs.unlinkSync(localFilePath);

    if (error) throw error;

    // Schedule file for deletion after expiry time
    scheduleFileDeletion(fileName);

    // Fix the download URL to use the actual server URL instead of localhost
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    
    // Return the download URL for the new endpoint
    res.json({ 
      success: true, 
      downloadUrl: `${baseUrl}/download-file?filePath=${fileName}`,
      expiresIn: FILE_EXPIRY_TIME / 60000 // Convert ms to minutes for frontend display
    });
  } catch (error) {
    console.error("Download Error:", error);
    res.status(500).json({ error: "Download or upload failed" });
  }
});

// 📌 Handle file downloads with proper headers
app.get("/download-file", async (req, res) => {
  const { filePath } = req.query;

  if (!filePath) {
    return res.status(400).json({ error: "File path is required" });
  }

  try {
    // Fetch file from Supabase
    const { data, error } = await supabase.storage.from("videos").download(filePath);
    if (error) throw error;

    // Set filename from path
    const filename = path.basename(filePath);
    
    // Set headers to force download
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/octet-stream");
    
    // Convert the data to a buffer and send it
    const buffer = await data.arrayBuffer();
    res.end(Buffer.from(buffer));
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({ error: "Download failed" });
  }
});

// Cleanup route to cancel all pending deletion jobs (useful for testing or server shutdown)
app.post("/cleanup-jobs", (req, res) => {
  for (const [filePath, timeoutId] of fileDeletionJobs.entries()) {
    clearTimeout(timeoutId);
    console.log(`Cancelled deletion job for ${filePath}`);
  }
  
  fileDeletionJobs.clear();
  res.json({ success: true, message: "All deletion jobs cancelled" });
});

// Optional: Handle server shutdown gracefully
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  
  // Cancel all pending deletion jobs
  for (const timeoutId of fileDeletionJobs.values()) {
    clearTimeout(timeoutId);
  }
  
  process.exit(0);
});

// Add a simple health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});