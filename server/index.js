require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { initAuthDb } = require('./database')
const authRoutes = require('./routes/auth')
const syncRoutes = require('./routes/sync')
const { verifyToken } = require('./middleware/auth')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use((req, _res, next) => { console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`); next() })

app.use('/auth', authRoutes)
app.use('/sync', verifyToken, syncRoutes)

app.get('/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

async function start() {
  await initAuthDb()
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Task Tracker Server running on port ${PORT}`)
  })
}

start().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
