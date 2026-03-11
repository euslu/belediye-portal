const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
]);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const ticketId = req.params.id || 'tmp';
    const dir = path.join(__dirname, '../uploads/tickets', String(ticketId));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    // ASCII-safe dosya adı
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});

function fileFilter(req, file, cb) {
  if (ALLOWED_MIME.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('İzin verilmeyen dosya türü. PDF, DOC, XLS, PNG, JPG yükleyebilirsiniz.'), false);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

module.exports = upload;
