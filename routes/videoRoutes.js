const express          = require('express');
const router           = express.Router();
const multer           = require('multer');
const path             = require('path');
const fs               = require('fs');
const autenticar       = require('../middleware/autenticar');
const restringirAdmin  = require('../middleware/restringirAdmin');
const { uploadVideo, getStatus } = require('../controllers/videoController');

const tmpDir = path.join(__dirname, '..', 'uploads', 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tmpDir),
  filename:    (req, file, cb) => cb(null, `video-${Date.now()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1 GB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Apenas arquivos de vídeo são permitidos.'));
  },
});

router.post('/upload',        autenticar, restringirAdmin, upload.single('video'), uploadVideo);
router.get('/status/:jobId',  autenticar, restringirAdmin, getStatus);

module.exports = router;
