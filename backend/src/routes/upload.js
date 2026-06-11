const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const STORAGE_DIR = path.join(__dirname, '../../../storage');
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function makeStorage() {
  return multer.diskStorage({
    destination(req, file, cb) {
      // Dùng query param vì req.body chưa được parse tại thời điểm này
      const carId = (req.query.carId || 'temp').replace(/[^a-zA-Z0-9_-]/g, '');
      const dir = path.join(STORAGE_DIR, 'cars', carId);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const base = path.basename(file.originalname, path.extname(file.originalname))
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 40) || 'image';
      const name = `${base}_${Date.now()}${ext}`;
      cb(null, name);
    }
  });
}

router.post('/', requireAdmin, (req, res) => {
  const carId = (req.query.carId || 'temp').replace(/[^a-zA-Z0-9_-]/g, '');

  const upload = multer({
    storage: makeStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter(req, file, cb) {
      if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true);
      else cb(new Error('Chỉ chấp nhận ảnh JPG, PNG, WEBP, GIF'));
    }
  }).single('image');

  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: 'File quá lớn (tối đa 5MB)' });
    }
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Không có file ảnh' });

    const filePath = `/storage/cars/${carId}/${req.file.filename}`;
    res.json({ path: filePath, filename: req.file.filename });
  });
});

module.exports = router;
