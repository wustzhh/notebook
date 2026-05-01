const bcrypt = require('bcryptjs')
const { initDb, queryAll, queryOne, execute } = require('./database')

const args = process.argv.slice(2)
const command = args[0]

function parseArgv(argv) {
  const opts = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2)
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true
      opts[key] = val
    }
  }
  return opts
}

async function addUser(opts) {
  await initDb()
  const { email, password } = opts
  if (!email || !password) {
    console.log('用法: node cli.js add-user --email xxx --password xxx')
    process.exit(1)
  }

  const existing = queryOne('SELECT id FROM users WHERE email = ?', [email])
  if (existing) {
    console.log('❌ 该邮箱已存在')
    process.exit(1)
  }

  const hash = bcrypt.hashSync(password, 10)
  execute('INSERT INTO users (email, password) VALUES (?, ?)', [email, hash])

  console.log('✅ 用户创建成功')
  console.log(`   邮箱: ${email}`)
  console.log(`   密码: ${password}`)
}

async function listUsers() {
  await initDb()
  const users = queryAll('SELECT id, email, created_at FROM users ORDER BY id')
  if (users.length === 0) {
    console.log('暂无用户')
    return
  }
  console.log('ID  邮箱                        创建时间')
  console.log('──  ──────────────────────────  ──────────────────────────')
  for (const u of users) {
    console.log(`${String(u.id).padEnd(4)} ${u.email.padEnd(26)} ${u.created_at}`)
  }
}

async function delUser(opts) {
  await initDb()
  const { email } = opts
  if (!email) {
    console.log('用法: node cli.js del-user --email xxx')
    process.exit(1)
  }
  const user = queryOne('SELECT id FROM users WHERE email = ?', [email])
  if (!user) {
    console.log('❌ 用户不存在')
    process.exit(1)
  }
  execute('DELETE FROM tasks WHERE user_id = ?', [user.id])
  execute('DELETE FROM projects WHERE user_id = ?', [user.id])
  execute('DELETE FROM users WHERE id = ?', [user.id])
  console.log(`✅ 用户 ${email} 及其数据已删除`)
}

async function resetPassword(opts) {
  await initDb()
  const { email, password } = opts
  if (!email || !password) {
    console.log('用法: node cli.js reset-password --email xxx --password xxx')
    process.exit(1)
  }
  const user = queryOne('SELECT id FROM users WHERE email = ?', [email])
  if (!user) {
    console.log('❌ 用户不存在')
    process.exit(1)
  }
  const hash = bcrypt.hashSync(password, 10)
  execute('UPDATE users SET password = ? WHERE id = ?', [hash, user.id])
  console.log('✅ 密码已重置')
  console.log(`   邮箱: ${email}`)
  console.log(`   新密码: ${password}`)
}

const commands = { 'add-user': addUser, list: listUsers, 'del-user': delUser, 'reset-password': resetPassword }

if (!command || !commands[command]) {
  console.log('Task Tracker 账号管理工具')
  console.log('')
  console.log('用法:')
  console.log('  node cli.js add-user         --email xxx --password xxx   创建账号')
  console.log('  node cli.js list                                          列出所有用户')
  console.log('  node cli.js del-user        --email xxx                  删除用户及数据')
  console.log('  node cli.js reset-password  --email xxx --password xxx   重置密码')
  process.exit(1)
}

commands[command](parseArgv(args)).catch(err => {
  console.error(err)
  process.exit(1)
})
