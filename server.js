const express = require("express");
const axios = require("axios");
const fs = require("fs");
const cron = require("node-cron");

const app = express();
const PORT = process.env.PORT || 3001;

const BOT_TOKEN = "7697941059:AAHAtUFxMSKtB3NQgAVwBK3f7wB8iFdY1dw";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const USER_A = "7052003301"; // Maksymilian
const USER_B = "818290223"; // Second user
const DATA_FILE = "./logs.json";

app.use(express.json());

// Utility: Load & Save Logs
function loadLogs() {
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveLogs(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

// Utility: Send message
function sendTelegramMessage(chatId, text, keyboard = null) {
  const payload = {
    chat_id: chatId,
    text,
    ...(keyboard && { reply_markup: { inline_keyboard: keyboard } }),
  };
  return axios.post(`${TELEGRAM_API}/sendMessage`, payload);
}

// Utility: Build button layout
function getSupplementButtons() {
  const supplements = ["Vitamin D", "Magnesium", "Zinc", "Omega 3"];
  return supplements.map(s => [{ text: s, callback_data: s }]);
}

// Webhook handler
app.post("/telegram/webhook", async (req, res) => {
  const message = req.body.message;
  const callback = req.body.callback_query;

  // Handle /start
  if (message?.text === "/start") {
    await sendTelegramMessage(message.chat.id, "👋 Welcome! Tap a supplement to log it:", getSupplementButtons());
    return res.sendStatus(200);
  }

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

    const otherUser = userId === USER_A ? USER_B : USER_A;
    const senderName = userId === USER_A ? "Maksymilian" : "User B";

    await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
      callback_query_id: callback.id,
      text: `✅ Logged: ${supplement}`,
    });

    await sendTelegramMessage(userId, `✅ You logged: ${supplement}`);
    await sendTelegramMessage(otherUser, `🔔 ${senderName} just took ${supplement} 💊`);
    return res.sendStatus(200);
  }

  res.sendStatus(200);
});

// Health check route (for testing Render)
app.get("/", (_, res) => res.send("✅ Bot is live"));

// Reminders (runs once at 8 AM and 8 PM daily)
app.listen(PORT, () => {
  console.log(`🚀 Telegram bot running on port ${PORT}`);

  cron.schedule("0 8 * * *", () => {
    sendTelegramMessage(USER_A, "🌞 Good morning! Did you take your supplements?");
    sendTelegramMessage(USER_B, "🌞 Good morning! Did you take your supplements?");
  });

  cron.schedule("0 20 * * *", () => {
    sendTelegramMessage(USER_A, "🌙 Evening check-in: Did you take your supplements?");
    sendTelegramMessage(USER_B, "🌙 Evening check-in: Did you take your supplements?");
  });
});
