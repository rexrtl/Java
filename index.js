// afk_bot_with_http.js
// AFK bot + HTTP server

const mineflayer = require('mineflayer');
const express = require('express');

// ---------- CONFIG ----------
const options = {
  host: 'flash.ateex.cloud',
  port: 6135,
  username: 'AFK_Bot',
  auth: 'offline',
  password: null,

  // AFK behavior
  headRotateInterval: 30_000,
  headRotateAmountDeg: 8,
  microMoveInterval: 5 * 60_000,
  microMoveDuration: 1_200,
  armSwingInterval: 60_000,
  reconnectDelay: 10_000,
};

// ---------- Mineflayer ----------
let bot;

function createBot() {
  console.log(`Connecting to ${options.host}:${options.port} as ${options.username}`);

  bot = mineflayer.createBot({
    host: options.host,
    port: options.port,
    username: options.username,
    password: options.password || undefined,
    auth: options.auth,
  });

  bot.on('spawn', () => {
    console.log('Bot spawned — AFK active');
    startAfkBehavior();
  });

  bot.on('end', () => {
    console.log('Bot disconnected. Reconnecting soon...');
    stopAfkBehavior();
    setTimeout(createBot, options.reconnectDelay);
  });

  bot.on('kicked', (r) => console.log('Kicked:', r.toString()));
  bot.on('error', (e) => console.log('Error:', e.message));
}

// ---------- AFK behavior ----------
let timers = [];

function startAfkBehavior() {
  // rotate head
  timers.push(setInterval(() => {
    if (!bot?.entity) return;
    const baseYaw = bot.entity.yaw;
    const rad = options.headRotateAmountDeg * (Math.PI / 180);
    bot.look(baseYaw + rad, bot.entity.pitch, true);
    setTimeout(() => bot.look(baseYaw, bot.entity.pitch, true), 4000);
  }, options.headRotateInterval));

  // micro-move
  timers.push(setInterval(() => {
    bot.setControlState('forward', true);
    setTimeout(() => bot.setControlState('forward', false), options.microMoveDuration);
  }, options.microMoveInterval));

  // swing arm
  timers.push(setInterval(() => {
    try { bot.swingArm(); } catch {}
  }, options.armSwingInterval));
}

function stopAfkBehavior() {
  timers.forEach(clearInterval);
  timers = [];
}

// ---------- HTTP server ----------
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({
    status: 'running',
    bot: options.username,
    server: `${options.host}:${options.port}`,
    connected: !!(bot && bot.player),
  });
});

app.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
});

// start bot
createBot();
