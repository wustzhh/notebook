const bcrypt = require('bcryptjs')
const { initAuthDb, deleteUserDb, saveAuthDb, queryAll, queryOne, execute } = require('./database')

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
  const authDb = await initAuthDb()
  const { email, password } = opts
  if (!email || !password) {
    console.log('用法: node cli.js add-user --email xxx --password xxx')
    process.exit(1)
  }

  const existing = queryOne(authDb, 'SELECT id FROM users WHERE email = ?', [email])
  if (existing) {
    console.log('❌ 该邮箱已存在')
    process.exit(1)
  }

  const hash = bcrypt.hashSync(password, 10)
  execute(authDb, 'INSERT INTO users (email, password) VALUES (?, ?)', [email, hash])
  saveAuthDb()

  console.log('✅ 用户创建成功')
  console.log(`   邮箱: ${email}`)
}

async function listUsers() {
  const authDb = await initAuthDb()
  const users = queryAll(authDb, 'SELECT id, email, created_at FROM users ORDER BY id')
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
  const authDb = await initAuthDb()
  const { email } = opts
  if (!email) {
    console.log('用法: node cli.js del-user --email xxx')
    process.exit(1)
  }
  const user = queryOne(authDb, 'SELECT id FROM users WHERE email = ?', [email])
  if (!user) {
    console.log('❌ 用户不存在')
    process.exit(1)
  }
  execute(authDb, 'DELETE FROM users WHERE id = ?', [user.id])
  saveAuthDb()
  deleteUserDb(user.id)
  console.log(`✅ 用户 ${email} 及其数据文件已删除`)
}

async function resetPassword(opts) {
  const authDb = await initAuthDb()
  const { email, password } = opts
  if (!email || !password) {
    console.log('用法: node cli.js reset-password --email xxx --password xxx')
    process.exit(1)
  }
  const user = queryOne(authDb, 'SELECT id FROM users WHERE email = ?', [email])
  if (!user) {
    console.log('❌ 用户不存在')
    process.exit(1)
  }
  const hash = bcrypt.hashSync(password, 10)
  execute(authDb, 'UPDATE users SET password = ? WHERE id = ?', [hash, user.id])
  saveAuthDb()
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
