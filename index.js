// minimal_afk_bot.js
// Mineflayer AFK bot with minimal movement
// Usage:
// 1) npm init -y
// 2) npm install mineflayer
// 3) node minimal_afk_bot.js
// Edit the options below to set the server and account details.

const mineflayer = require('mineflayer');

// ---------- CONFIG ----------
const options = {
  host: 'flash.ateex.cloud', // server host
  port: 6135,                // server port
  username: 'AFK_Bot',       // change to the name you want
  password: null,            // optional (for online auth)
  auth: 'offline',           // 'offline' (default) | 'mojang' | 'microsoft'

  // Behavior tuning (all times in ms)
  headRotateInterval: 30_000,   // how often to rotate head slightly
  headRotateAmountDeg: 8,       // degrees to yaw left/right from base
  microMoveInterval: 5 * 60_000,// occasional tiny move (every 5 minutes)
  microMoveDuration: 1_200,     // how long the micro-move lasts
  armSwingInterval: 60_000,     // swing arm occasionally
  reconnectDelay: 10_000,       // wait before reconnecting on disconnect

  sendChatPing: false,          // send a short chat ping at chatPingInterval (useful if server requires chat activity)
  chatPingInterval: 15 * 60_000 // only used if sendChatPing = true
};

let bot = null;
let rotating = false;
let rotateDirection = 1; // 1 or -1
let baseYaw = 0;

function createBot() {
  console.log(`Connecting to ${options.host}:${options.port} as ${options.username} (auth=${options.auth})`);

  bot = mineflayer.createBot({
    host: options.host,
    port: options.port,
    username: options.username,
    password: options.password || undefined,
    auth: options.auth === 'offline' ? 'offline' : options.auth
  });

  bot.on('spawn', () => {
    console.log('Bot spawned. Starting AFK behavior...');
    startAfkBehavior();
  });

  bot.on('kicked', (reason) => {
    console.log('Kicked from server:', reason.toString());
  });

  bot.on('end', () => {
    console.log('Connection closed — will reconnect in', options.reconnectDelay, 'ms');
    stopAfkBehavior();
    setTimeout(createBot, options.reconnectDelay);
  });

  bot.on('error', (err) => {
    console.log('Error:', err?.message || err);
  });

  bot.on('message', (jsonMsg, rawMsg) => {
    // keep minimal logging so we don't spam console
    // console.log('Chat:', rawMsg.toString());
  });
}

// ---------- AFK behavior ----------
let headRotateTimer = null;
let microMoveTimer = null;
let armSwingTimer = null;
let chatPingTimer = null;

function startAfkBehavior() {
  // store the bot's initial yaw as a base reference (if available)
  try { baseYaw = bot.entity.yaw; } catch(e) { baseYaw = 0; }

  // small head yaw oscillation — counts as activity on most servers but is visually minimal
  headRotateTimer = setInterval(() => {
    if (!bot || !bot.entity) return;
    rotateDirection *= -1; // alternate
    const deg = options.headRotateAmountDeg * rotateDirection;
    const rad = deg * (Math.PI / 180);
    const targetYaw = baseYaw + rad;
    // smoothly look to the small offset, then back to base after a short delay
    bot.look(targetYaw, bot.entity.pitch, true);
    setTimeout(() => {
      if (!bot || !bot.entity) return;
      bot.look(baseYaw, bot.entity.pitch, true);
    }, 4_000);
  }, options.headRotateInterval);

  // occasional tiny forward/back movement to appear 'active' while still minimal
  microMoveTimer = setInterval(() => {
    if (!bot) return;
    // press forward for microMoveDuration then release
    bot.setControlState('forward', true);
    setTimeout(() => bot.setControlState('forward', false), options.microMoveDuration);
  }, options.microMoveInterval);

  // occasional arm swing (emote) - lightweight
  armSwingTimer = setInterval(() => {
    if (!bot) return;
    try { bot.activateItem(); } catch (e) { /* ignore if no item */ }
    // also swing arm directly (works in many versions)
    try { bot.swingArm(); } catch(e) { /* ignore */ }
  }, options.armSwingInterval);

  // optional: send a tiny chat ping to avoid chat-based AFK checks
  if (options.sendChatPing) {
    chatPingTimer = setInterval(() => {
      if (!bot) return;
      // single dot is less intrusive than full messages. Change if you want.
      bot.chat('.');
    }, options.chatPingInterval);
  }

  rotating = true;
}

function stopAfkBehavior() {
  rotating = false;
  clearInterval(headRotateTimer);
  clearInterval(microMoveTimer);
  clearInterval(armSwingTimer);
  clearInterval(chatPingTimer);
  headRotateTimer = microMoveTimer = armSwingTimer = chatPingTimer = null;
}

// start
createBot();

// graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  try { stopAfkBehavior(); } catch(e){}
  try { if (bot) bot.quit(); } catch(e){}
  process.exit(0);
});

// ---- Notes ----
// - This script is intentionally conservative: it uses only tiny head rotations, a very short
//   forward press that lasts `microMoveDuration` ms every `microMoveInterval` ms, and occasional
//   arm swings. Tweak the timing values at the top to make it more or less active.
// - Some servers have advanced AFK detection (e.g., checking block position changes, input patterns,
//   or plugin-specific checks). If the server still kicks you, try increasing micro-move frequency
//   slightly or enable `sendChatPing` (but be courteous — don't spam chat).
// - For Microsoft-authenticated accounts, provide credentials and set `auth` to 'microsoft'.
// - If you want the bot to appear as a specific skin without auth, consider using an authenticated
//   account or skin library (not included here).
// - This file is a single-file example; you can run multiple instances with different `username` values
//   to create several AFK bots.
