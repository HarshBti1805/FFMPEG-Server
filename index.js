import express from "express";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { tmpdir } from "os";
import fs from "fs";
import path from "path";

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();

// Raw audio buffer parsers
app.use("/convert", express.raw({ type: "audio/wav", limit: "50mb" }));
app.use("/convert-to-opus", express.raw({ type: "audio/ogg", limit: "50mb" }));

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

// Optional: CORS for frontend
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

app.listen(5000, () => {
  console.log("🔊 Audio Converter running at http://localhost:5000");
});
