const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'vinfastmanhhien_secret_key_2024';

function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  }
  const token = authHeader.slice(7);
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
  }
}

module.exports = { requireAdmin, JWT_SECRET };
