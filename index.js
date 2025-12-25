const mineflayer = require('mineflayer')
const express = require('express')

const config = require('./config.json')

/* ---------- HTTP SERVER ---------- */
const app = express()
const PORT = process.env.PORT || 3000
let bot = null

app.get('/', (req, res) => {
  res.send('🟢 Minecraft AFK Bot (Advanced Anti-AFK)')
})

app.get('/status', (req, res) => {
  res.json({
    online: !!bot?.player,
    username: config.username
  })
})

app.listen(PORT, () => {
  console.log(`🌐 HTTP server running on ${PORT}`)
})

/* ---------- ANTI-AFK LOGIC ---------- */
function random (min, max) {
  return Math.random() * (max - min) + min
}

function humanLook () {
  if (!bot?.entity) return
  const yaw = random(-Math.PI, Math.PI)
  const pitch = random(-0.3, 0.3)
  bot.look(yaw, pitch, true)
}

function smallMove () {
  if (!bot?.entity) return

  const actions = ['forward', 'back', 'left', 'right']
  const action = actions[Math.floor(Math.random() * actions.length)]

  bot.setControlState(action, true)

  if (Math.random() > 0.7) bot.setControlState('sneak', true)
  if (Math.random() > 0.85) bot.setControlState('jump', true)

  setTimeout(() => {
    bot.clearControlStates()
  }, random(400, 900))
}

function antiAFKLoop () {
  setTimeout(() => {
    humanLook()
    smallMove()
    antiAFKLoop()
  }, random(4000, 9000)) // human delay
}

/* ---------- BOT ---------- */
function startBot () {
  console.log('🔄 Starting bot...')

  bot = mineflayer.createBot({
    host: config.host,
    port: config.port,
    username: config.username,
    auth: 'offline',
    version: config.version
  })

  bot.once('spawn', () => {
    console.log('✅ Bot spawned')
    antiAFKLoop()
  })

  bot.on('end', () => {
    console.log('❌ Disconnected. Reconnecting in 15s...')
    setTimeout(startBot, 15000)
  })

  bot.on('error', err => {
    console.log('⚠️ Error:', err.message)
  })
}

startBot()
