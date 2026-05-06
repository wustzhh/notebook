const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { initAuthDb, queryOne, execute } = require('../database')
const { getJWTSecret } = require('../middleware/auth')

const router = express.Router()

router.post('/login', async (req, res) => {
  try {
    const authDb = await initAuthDb()
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: '请输入邮箱和密码' })
    }

    const user = queryOne(authDb, 'SELECT * FROM users WHERE email = ?', [email])
    if (!user) {
      return res.status(401).json({ error: '邮箱或密码错误' })
    }

    const valid = bcrypt.compareSync(password, user.password)
    if (!valid) {
      return res.status(401).json({ error: '邮箱或密码错误' })
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      getJWTSecret(),
      { expiresIn: '30d' }
    )

    res.json({
      token,
      user: { id: user.id, email: user.email }
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: '服务器内部错误' })
  }
})

module.exports = router
