import express from "express";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { tmpdir } from "os";
import fs from "fs";
import path from "path";

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();

// testing route
app.get("/", (req, res) => {
  return res.json({ message: "FFMPEG Server is Working", status: 200 });
});

// Raw audio buffer parsers
app.use("/convert", express.raw({ type: "audio/wav", limit: "50mb" }));
app.use("/convert-to-opus", express.raw({ type: "audio/ogg", limit: "50mb" }));

// Video processing middleware
app.use("/extract-audio", express.raw({ type: "*/*", limit: "100mb" }));
app.use("/video-info", express.raw({ type: "*/*", limit: "100mb" }));

// ✅ WAV → Mono WAV Conversion
const convertToMonoWav = async (buffer) => {
  const inputPath = path.join(tmpdir(), `input-${Date.now()}.wav`);
  const outputPath = path.join(tmpdir(), `output-${Date.now()}-mono.wav`);

  await fs.promises.writeFile(inputPath, buffer);

  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioChannels(1)
      .audioCodec("pcm_s16le")
      .output(outputPath)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });

  const monoBuffer = await fs.promises.readFile(outputPath);

  for (const file of [inputPath, outputPath]) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }

  return monoBuffer;
};

// ✅ OGG (Vorbis) → OGG (Opus) Conversion
const convertToOpusOgg = async (buffer) => {
  const inputPath = path.join(tmpdir(), `input-${Date.now()}.ogg`);
  const outputPath = path.join(tmpdir(), `output-${Date.now()}-opus.ogg`);

  await fs.promises.writeFile(inputPath, buffer);

  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioCodec("libopus")
      .audioChannels(1)
      .audioFrequency(48000)
      .format("ogg")
      .output(outputPath)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });

  const opusBuffer = await fs.promises.readFile(outputPath);

  for (const file of [inputPath, outputPath]) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }

  return opusBuffer;
};

// ✅ Video → Audio Extraction
const extractAudioFromVideo = async (buffer, format) => {
  const inputPath = path.join(tmpdir(), `video-${Date.now()}.${format}`);
  const outputPath = path.join(tmpdir(), `audio-${Date.now()}.wav`);

  await fs.promises.writeFile(inputPath, buffer);

  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioChannels(1)
      .audioCodec("pcm_s16le")
      .audioFrequency(16000)
      .output(outputPath)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });

  const audioBuffer = await fs.promises.readFile(outputPath);

  for (const file of [inputPath, outputPath]) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }

  return audioBuffer;
};

// ✅ Get Video Information
const getVideoInfo = async (buffer, format) => {
  const inputPath = path.join(tmpdir(), `video-${Date.now()}.${format}`);

  await fs.promises.writeFile(inputPath, buffer);

  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

      if (err) {
        reject(err);
        return;
      }

      const info = {
        duration: metadata.format.duration,
        size: metadata.format.size,
        bitrate: metadata.format.bit_rate,
        hasAudio: metadata.streams.some(
          (stream) => stream.codec_type === "audio"
        ),
        hasVideo: metadata.streams.some(
          (stream) => stream.codec_type === "video"
        ),
        audioStreams: metadata.streams.filter(
          (stream) => stream.codec_type === "audio"
        ),
        videoStreams: metadata.streams.filter(
          (stream) => stream.codec_type === "video"
        ),
      };

      resolve(info);
    });
  });
};

// 🔊 Route: WAV → Mono
app.post("/convert", async (req, res) => {
  try {
    const monoBuffer = await convertToMonoWav(req.body);
    res.set("Content-Type", "audio/wav");
    res.send(monoBuffer);
  } catch (err) {
    console.error("WAV Conversion error:", err);
    res.status(500).json({
      error: "WAV conversion failed",
      details: err.message || "Unknown error",
    });
  }
});

// 🔊 Route: OGG Vorbis → Opus
app.post("/convert-to-opus", async (req, res) => {
  try {
    const opusBuffer = await convertToOpusOgg(req.body);
    res.set("Content-Type", "audio/ogg");
    res.send(opusBuffer);
  } catch (err) {
    console.error("OGG Conversion error:", err);
    res.status(500).json({
      error: "OGG conversion failed",
      details: err.message || "Unknown error",
    });
  }
});

// 🎥 Route: Extract Audio from Video
app.post("/extract-audio", async (req, res) => {
  try {
    const contentType = req.headers["content-type"];
    let format = "mp4"; // default

    // Extract format from content-type header
    if (contentType) {
      if (contentType.includes("video/mp4")) format = "mp4";
      else if (contentType.includes("video/avi")) format = "avi";
      else if (contentType.includes("video/mov")) format = "mov";
      else if (contentType.includes("video/mkv")) format = "mkv";
      else if (contentType.includes("video/webm")) format = "webm";
    }

    console.log(`[FFmpeg] Extracting audio from ${format} video...`);
    const audioBuffer = await extractAudioFromVideo(req.body, format);
    console.log(
      `[FFmpeg] Audio extraction successful, size: ${audioBuffer.length} bytes`
    );

    res.set("Content-Type", "audio/wav");
    res.send(audioBuffer);
  } catch (err) {
    console.error("Video Audio Extraction error:", err);
    res.status(500).json({
      error: "Video audio extraction failed",
      details: err.message || "Unknown error",
    });
  }
});

// 🎥 Route: Get Video Information
app.post("/video-info", async (req, res) => {
  try {
    const contentType = req.headers["content-type"];
    let format = "mp4"; // default

    // Extract format from content-type header
    if (contentType) {
      if (contentType.includes("video/mp4")) format = "mp4";
      else if (contentType.includes("video/avi")) format = "avi";
      else if (contentType.includes("video/mov")) format = "mov";
      else if (contentType.includes("video/mkv")) format = "mkv";
      else if (contentType.includes("video/webm")) format = "webm";
    }

    console.log(`[FFmpeg] Getting info for ${format} video...`);
    const info = await getVideoInfo(req.body, format);
    console.log(`[FFmpeg] Video info retrieved:`, info);

    res.json({
      success: true,
      info: info,
    });
  } catch (err) {
    console.error("Video Info error:", err);
    res.status(500).json({
      error: "Video info extraction failed",
      details: err.message || "Unknown error",
    });
  }
});

// Optional: CORS for frontend
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.listen(5000, () => {
  console.log("🔊 Audio Converter running at http://localhost:5000");
  console.log("🎥 Video processing routes available:");
  console.log("  - POST /extract-audio - Extract audio from video files");
  console.log("  - POST /video-info - Get video file information");
});
