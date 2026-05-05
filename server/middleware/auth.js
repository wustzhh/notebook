const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'tasktracker-secret-change-me'

function verifyToken(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录，请先登录' })
  }

  const token = header.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.userId = decoded.userId
    req.userEmail = decoded.email
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '登录已过期，请重新登录', code: 'TOKEN_EXPIRED' })
    }
    return res.status(401).json({ error: '无效的认证凭据' })
  }
}

function getJWTSecret() {
  return JWT_SECRET
}

module.exports = { verifyToken, getJWTSecret }
