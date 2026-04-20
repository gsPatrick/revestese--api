const { spawn }  = require('child_process');
const path        = require('path');
const fs          = require('fs');
const { v4: uuidv4 } = require('uuid');

// In-memory job store: jobId → { progress, status, error, url }
const jobs = new Map();

const uploadDir = path.join(__dirname, '..', 'uploads', 'videos');
const tmpDir    = path.join(__dirname, '..', 'uploads', 'tmp');
[uploadDir, tmpDir].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

/* ────────────────────────────────────────────────────────
   POST /api/admin/videos/upload
   Recebe o arquivo, dispara encoding async, retorna jobId
──────────────────────────────────────────────────────── */
exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado.' });

    const jobId      = uuidv4();
    const inputPath  = req.file.path;
    const tempOutput = path.join(tmpDir,    `tmp-${jobId}.mp4`);
    const finalOutput = path.join(uploadDir, 'brand-scroll.mp4');

    jobs.set(jobId, { progress: 0, status: 'encoding', error: null, url: null });

    // Responde imediatamente — encoding roda em background
    res.json({ jobId });

    encodeVideo(jobId, inputPath, tempOutput, finalOutput).catch(console.error);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

/* ─────────────────────────────────────────
   GET /api/admin/videos/status/:jobId
───────────────────────────────────────── */
exports.getStatus = (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ erro: 'Job não encontrado.' });
  res.json(job);
};

/* ══════════════════════════════════════════
   Encoding via ffmpeg child_process
══════════════════════════════════════════ */
async function encodeVideo(jobId, inputPath, tempOutput, finalOutput) {
  const duration = await getVideoDuration(inputPath).catch(() => 0);

  return new Promise((resolve) => {
    const args = [
      '-i', inputPath,
      '-vf', 'scale=1280:-2',
      '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.1',
      '-preset', 'fast', '-crf', '23', '-movflags', '+faststart',
      '-c:a', 'aac', '-b:a', '128k',
      '-y', tempOutput,
    ];

    const ff = spawn('ffmpeg', args);
    let stderrBuf = '';

    ff.stderr.on('data', (chunk) => {
      stderrBuf += chunk.toString();
      // ffmpeg imprime progresso com \r; pegamos a última ocorrência de time=
      const matches = [...stderrBuf.matchAll(/time=(\d+):(\d+):([\d.]+)/g)];
      if (matches.length > 0 && duration > 0) {
        const m = matches[matches.length - 1];
        const secs = +m[1] * 3600 + +m[2] * 60 + parseFloat(m[3]);
        const pct  = Math.min(99, Math.round((secs / duration) * 100));
        const job  = jobs.get(jobId);
        if (job) job.progress = pct;
      }
    });

    ff.on('close', async (code) => {
      // Limpa o arquivo de entrada
      try { fs.unlinkSync(inputPath); } catch (_) {}

      const job = jobs.get(jobId);
      if (!job) return resolve();

      if (code === 0) {
        try {
          if (fs.existsSync(finalOutput)) fs.unlinkSync(finalOutput);
          fs.renameSync(tempOutput, finalOutput);

          // Salva URL com cache-buster no DB
          const baseUrl  = (process.env.BASE_URL || '').replace(/\/$/, '');
          const videoUrl = `${baseUrl}/uploads/videos/brand-scroll.mp4?v=${Date.now()}`;

          const { ConfiguracaoLoja } = require('../models');
          await ConfiguracaoLoja.upsert({ chave: 'BRAND_VIDEO_URL', valor: videoUrl });

          job.progress = 100;
          job.status   = 'done';
          job.url      = videoUrl;
        } catch (e) {
          job.status = 'error';
          job.error  = e.message;
        }
      } else {
        try { fs.unlinkSync(tempOutput); } catch (_) {}
        job.status = 'error';
        job.error  = 'Falha no encoding. Verifique se o arquivo é um vídeo válido.';
      }
      resolve();
    });

    ff.on('error', () => {
      const job = jobs.get(jobId);
      if (job) { job.status = 'error'; job.error = 'ffmpeg não encontrado no servidor.'; }
      resolve();
    });
  });
}

function getVideoDuration(filePath) {
  return new Promise((resolve) => {
    const ff  = spawn('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_format', filePath]);
    let out   = '';
    ff.stdout.on('data', d => { out += d; });
    ff.on('close', () => {
      try { resolve(parseFloat(JSON.parse(out).format.duration) || 0); }
      catch (_) { resolve(0); }
    });
    ff.on('error', () => resolve(0));
  });
}
