const express = require("express");
const axios = require("axios");
const fs = require("fs");
const cron = require("node-cron");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const BOT_TOKEN = "7697941059:AAHAtUFxMSKtB3NQgAVwBK3f7wB8iFdY1dw";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const USER_A = "7052003301"; // Maksymilian
const USER_B = "818290223"; // Second user
const DATA_FILE = "./logs.json";

// Load logs
function loadLogs() {
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

// Save logs
function saveLogs(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Get today's date
function getToday() {
  return new Date().toISOString().split("T")[0];
}

// Send Telegram message
function sendTelegramMessage(chatId, text, options = {}) {
  return axios.post(`${TELEGRAM_API}/sendMessage`, {
    chat_id: chatId,
    text,
    ...options,
  });
}

// Telegram webhook handler
app.post("/telegram/webhook", async (req, res) => {
  const message = req.body.message;
  const callback = req.body.callback_query;

  // Handle button click
  if (callback) {
    const userId = String(callback.from.id);
    const supplement = callback.data;
    const today = getToday();
    const logs = loadLogs();

    if (!logs[today]) logs[today] = {};
    if (!logs[today][userId]) logs[today][userId] = [];

    if (!logs[today][userId].includes(supplement)) {
      logs[today][userId].push(supplement);
      saveLogs(logs);
    }

    const senderName = userId === USER_A ? "Maksymilian" : "User B";
    const otherUser = userId === USER_A ? USER_B : USER_A;

    await sendTelegramMessage(userId, `✅ Logged: ${supplement}`);
    await sendTelegramMessage(otherUser, `🔔 ${senderName} just took ${supplement} 💊`);
    return res.sendStatus(200);
  }

  // Handle /start and /status commands
  if (message && message.text) {
    const userId = String(message.from.id);
    const text = message.text.trim();
    const logs = loadLogs();
    const today = getToday();

    if (text === "/start") {
      await sendTelegramMessage(userId, "👋 Welcome! Tap a supplement below to log it:", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Vitamin D", callback_data: "Vitamin D" }],
            [{ text: "Magnesium", callback_data: "Magnesium" }],
            [{ text: "Omega 3", callback_data: "Omega 3" }],
          ],
        },
      });
      return res.sendStatus(200);
    }

    if (text === "/status") {
      const taken = logs[today]?.[userId] || [];
      const msg = taken.length
        ? `📋 Today you logged: ${taken.join(", ")}`
        : "❌ No supplements logged today.";
      await sendTelegramMessage(userId, msg);
      return res.sendStatus(200);
    }

    await sendTelegramMessage(userId, "❓ Unknown command. Try /start or /status");
  }

  res.sendStatus(200);
});

// Health check endpoint
app.post("/notify", (_, res) => res.send("✅ Server running."));

// Reminders
app.listen(PORT, () => {
  cron.schedule("0 8 * * *", () => {
    sendTelegramMessage(USER_A, "🌞 Morning! Did you take your supplements?");
    sendTelegramMessage(USER_B, "🌞 Morning! Did you take your supplements?");
  });

  cron.schedule("0 20 * * *", () => {
    sendTelegramMessage(USER_A, "🌙 Evening reminder: Supplements taken?");
    sendTelegramMessage(USER_B, "🌙 Evening reminder: Supplements taken?");
  });

  console.log(`🚀 Telegram bot running on port ${PORT}`);
});
