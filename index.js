const mineflayer = require('mineflayer')
const express = require('express')
const config = require('./config.json')

/* ---------------- HTTP SERVER ---------------- */
const app = express()
const PORT = process.env.PORT || 3000
let bot = null

app.get('/', (req, res) => {
  res.send('🟢 Minecraft AFK Bot is running')
})

app.get('/status', (req, res) => {
  res.json({
    online: !!bot?.player,
    username: config.username
  })
})

app.listen(PORT, () => {
  console.log(`🌐 HTTP server running on port ${PORT}`)
})

/* ---------------- SAFE ANTI-AFK ---------------- */
function rand(min, max) {
  return Math.random() * (max - min) + min
}

function safeAntiAFK() {
  if (!bot?.entity) return

  // Human-like look movement (SAFE)
  bot.look(
    rand(-Math.PI, Math.PI),
    rand(-0.25, 0.25),
    true
  )

  // Sneak sometimes
  if (Math.random() > 0.7) {
    bot.setControlState('sneak', true)
    setTimeout(() => bot.setControlState('sneak', false), 800)
  }

  // Small jump (safe)
  if (Math.random() > 0.85) {
    bot.setControlState('jump', true)
    setTimeout(() => bot.setControlState('jump', false), 300)
  }
}

/* ---------------- BOT ---------------- */
function startBot() {
  console.log('🔄 Starting bot...')

  bot = mineflayer.createBot({
    host: config.host,
    port: config.port,
    username: config.username,
    auth: 'offline',
    version: config.version
  })

  bot.once('spawn', () => {
    console.log('✅ Bot spawned safely')

    setInterval(() => {
      safeAntiAFK()
    }, rand(5000, 9000))
  })

  bot.on('end', () => {
    console.log('❌ Disconnected. Reconnecting in 15s...')
    setTimeout(startBot, 15000)
  })

  bot.on('error', err => {
    console.log('⚠️ Bot error:', err.message)
  })
}

startBot()
