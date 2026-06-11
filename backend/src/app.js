require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiter — mỗi lần gọi tạo ra store riêng biệt cho từng route
function rateLimit(maxRequests, windowMs) {
  const store = {};
  setInterval(() => {
    const now = Date.now();
    for (const key of Object.keys(store)) {
      if (now - store[key].start > windowMs) delete store[key];
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const ip = req.headers['x-real-ip'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    if (!store[ip] || now - store[ip].start > windowMs) {
      store[ip] = { count: 1, start: now };
    } else {
      store[ip].count++;
    }
    if (store[ip].count > maxRequests) {
      return res.status(429).json({ error: 'Quá nhiều yêu cầu, vui lòng thử lại sau.' });
    }
    next();
  };
}

app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Serve frontend static files and storage when not behind nginx
const FRONTEND_DIR = path.join(__dirname, '../..', 'frontend');
const STORAGE_DIR  = path.join(__dirname, '../..', 'storage');
app.use('/storage', express.static(STORAGE_DIR));
app.use(express.static(FRONTEND_DIR));

app.use('/api/admin', rateLimit(10, 60_000), require('./routes/admin'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/cars', require('./routes/cars'));
app.use('/api/banners', require('./routes/banners'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/consultations', rateLimit(5, 60_000), require('./routes/consultations'));
app.use('/api/track', rateLimit(30, 60_000), require('./routes/track'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/telegram', require('./routes/telegram'));

app.listen(PORT, () => {
  console.log(`VinFast backend running on port ${PORT}`);
});
