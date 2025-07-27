# FFmpeg Server for Video Processing

This server handles video file processing and audio extraction for the Speech Translator application.

## 🚀 Quick Start

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Start the server:**

   ```bash
   npm start
   # or
   npm run start-server
   ```

3. **Server will be available at:** `http://localhost:5000`

## 📋 Available Routes

### Audio Processing

- `POST /convert` - Convert WAV to mono WAV
- `POST /convert-to-opus` - Convert OGG Vorbis to OGG Opus

### Video Processing

- `POST /extract-audio` - Extract audio from video files
- `POST /video-info` - Get video file information

## 🎥 Video Processing

### Supported Video Formats

- MP4
- AVI
- MOV
- MKV
- WebM

### Usage Example

```bash
# Extract audio from video
curl -X POST http://localhost:5000/extract-audio \
  -H "Content-Type: video/mp4" \
  --data-binary @video.mp4 \
  --output audio.wav

# Get video information
curl -X POST http://localhost:5000/video-info \
  -H "Content-Type: video/mp4" \
  --data-binary @video.mp4
```

## 🔧 Configuration

The server automatically:

- Extracts audio to 16kHz mono WAV format (optimal for speech recognition)
- Handles multiple video formats
- Cleans up temporary files
- Provides detailed error messages

## 🛠️ Development

```bash
# Development mode with auto-restart
npm run dev
```

## 📝 Logs

The server provides detailed logging:

- `[FFmpeg] Extracting audio from mp4 video...`
- `[FFmpeg] Audio extraction successful, size: 123456 bytes`
- `[FFmpeg] Video info retrieved: {...}`

## ⚠️ Troubleshooting

1. **Port 5000 already in use:**

   - Change the port in `index.js` line 114
   - Update the Next.js API to use the new port

2. **FFmpeg not found:**

   - Ensure `ffmpeg-static` is installed
   - Check that FFmpeg binaries are available

3. **Large file uploads:**
   - Default limit is 100MB
   - Adjust in the middleware configuration

## 🔗 Integration with Next.js

The Next.js video API (`/api/video`) automatically connects to this server at `http://localhost:5000` to process video files and extract audio for speech recognition.
