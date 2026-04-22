// 用户认证中间件
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'canteen-secret-key-2024';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function userAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ code: 401, message: '请先登录' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ code: 401, message: '登录已过期' });
  }
}

function adminAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ code: 401, message: '请先登录' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ code: 401, message: '登录已过期' });
  }
}

function pickerAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ code: 401, message: '请先登录' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'picker') {
      return res.status(403).json({ code: 403, message: '无权访问' });
    }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ code: 401, message: '登录已过期' });
  }
}

module.exports = { generateToken, userAuth, adminAuth, pickerAuth };
