const { spawn } = require('child_process')
const path = require('path')

// 启动 Vite 开发服务器
const viteProcess = spawn('npx', ['vite'], {
  stdio: 'inherit',
  shell: true
})

// 等待 Vite 启动后启动 Electron
setTimeout(() => {
  const electronProcess = spawn('npx', ['electron', '.'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_ENV: 'development' }
  })

  electronProcess.on('close', (code) => {
    viteProcess.kill()
    process.exit(code)
  })
}, 3000)

viteProcess.on('close', (code) => {
  process.exit(code)
})
