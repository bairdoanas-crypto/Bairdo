const express = require('express');
const multer  = require('multer');
const ffmpeg  = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const os      = require('os');

ffmpeg.setFfmpegPath(ffmpegPath);

const app    = express();
const upload = multer({ dest: os.tmpdir() });

app.use(cors());
app.use(express.static(__dirname)); // يخدم ملفات HTML

app.post('/process', upload.single('video'), (req, res) => {
  const inputPath  = req.file.path;
  const format     = req.body.format || 'mp4';
  const startTime  = parseFloat(req.body.start) || 0;
  const duration   = parseFloat(req.body.duration) || null;
  const outputPath = path.join(os.tmpdir(), `out_${Date.now()}.${format}`);

  let cmd = ffmpeg(inputPath).output(outputPath);

  if (startTime > 0) cmd = cmd.setStartTime(startTime);
  if (duration)      cmd = cmd.setDuration(duration);

  if (format === 'mp4' || format === 'mov') {
    cmd = cmd.videoCodec('libx264').audioCodec('aac');
  } else if (format === 'webm') {
    cmd = cmd.videoCodec('libvpx-vp9').audioCodec('libopus');
  } else if (format === 'gif') {
    cmd = cmd.outputOptions(['-vf','fps=10,scale=480:-1:flags=lanczos','-loop','0']);
  }

  cmd
    .on('end', () => {
      res.download(outputPath, `output.${format}`, () => {
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
      });
    })
    .on('error', (err) => {
      console.error(err);
      res.status(500).json({ error: err.message });
    })
    .run();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bairdo server running on port ${PORT}`));
