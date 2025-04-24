const express = require("express");
const axios = require("axios");
const fs = require("fs");
const cron = require("node-cron");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;
app.use(express.json());

// Constants
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;
const USER_A = "7052003301";
const USER_B = "818290223";

const DATA_FILE = "./logs.json";

// Utilities
function loadData() {
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE));
}
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
function getToday() {
  return new Date().toISOString().split("T")[0];
}
function sendMessage(chat_id, text, keyboard = null) {
  const payload = { chat_id, text };
  if (keyboard) {
    payload.reply_markup = { inline_keyboard: keyboard };
  }
  return axios.post(`${TELEGRAM_API}/sendMessage`, payload);
}

// Handle Telegram updates
app.post("/telegram/webhook", async (req, res) => {
  const body = req.body;
  const data = loadData();
  const today = getToday();

  // Handle button click
  if (body.callback_query) {
    const { id, from, data: supplement } = body.callback_query;
    const userId = String(from.id);
    const name = from.first_name;
    const partner = userId === USER_A ? USER_B : USER_A;

    if (!data[today]) data[today] = {};
    if (!data[today][userId]) data[today][userId] = [];
    if (!data[today][userId].includes(supplement)) {
      data[today][userId].push(supplement);
      saveData(data);
    }

    await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
      callback_query_id: id,
      text: `✅ Logged: ${supplement}`,
    });

    await sendMessage(userId, `✅ Logged: ${supplement}`);
    await sendMessage(partner, `🔔 ${name} just took ${supplement} 💊`);
    return res.sendStatus(200);
  }

  // Handle text message or /start
  const msg = body.message;
  if (!msg) return res.sendStatus(200);

  const userId = String(msg.from.id);
  const username = msg.from.first_name;

  // Ensure supplement list exists
  if (!data.supplements) data.supplements = {};
  if (!data.supplements[userId]) {
    data.supplements[userId] = ["Vitamin D", "Magnesium", "Zinc"];
    saveData(data);
  }

  // Show buttons
  const buttons = data.supplements[userId].map(s => [{ text: s + " 💊", callback_data: s }]);
  await sendMessage(userId, `👋 Hello ${username}! Tap to log today's supplements:`, buttons);

  res.sendStatus(200);
});

// Test endpoint
app.get("/", (req, res) => {
  res.send("✅ Telegram bot is live.");
});

// Reminders
cron.schedule("0 8 * * *", () => {
  sendMessage(USER_A, "🌞 Good morning! Did you take your supplements?");
  sendMessage(USER_B, "🌞 Good morning! Did you take your supplements?");
});
cron.schedule("0 20 * * *", () => {
  sendMessage(USER_A, "🌙 Evening check-in: Did you take your supplements?");
  sendMessage(USER_B, "🌙 Evening check-in: Did you take your supplements?");
});

app.listen(PORT, () => {
  console.log(`🚀 Telegram health bot running on port ${PORT}`);
});
