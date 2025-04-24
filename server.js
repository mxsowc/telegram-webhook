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

// Utility to load and save logs
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

// Send Telegram message with inline keyboard
function sendTelegramMessage(chatId, text, keyboard = null) {
  const payload = {
    chat_id: chatId,
    text,
    ...(keyboard && { reply_markup: { inline_keyboard: keyboard } }),
  };
  return axios.post(`${TELEGRAM_API}/sendMessage`, payload);
}

// Supplement options (including new options)
function getSupplementButtons() {
  return [
    [{ text: "Vitamin D", callback_data: "Vitamin D" }],
    [{ text: "Magnesium", callback_data: "Magnesium" }],
    [{ text: "Zinc", callback_data: "Zinc" }],
    [{ text: "All Day Vitamins", callback_data: "All Day Vitamins" }],
    [{ text: "All Evening Supplements", callback_data: "All Evening Supplements" }],
  ];
}

// Webhook handler
app.post("/telegram/webhook", async (req, res) => {
  const message = req.body.message;
  const callback = req.body.callback_query;

  // Handle /start with a start button
  if (message?.text === "/start") {
    await sendTelegramMessage(message.chat.id, "👋 Welcome! Tap below to log supplements:", getSupplementButtons());
    return res.sendStatus(200);
  }

  // Handle "Start" button click
  if (message && message.text === "Start") {
    await sendTelegramMessage(message.chat.id, "💊 Choose your supplement to log:", getSupplementButtons());
    return res.sendStatus(200);
  }

  // Handle callback queries (button clicks)
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

    await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
      callback_query_id: callback.id,
      text: `✅ Logged: ${supplement}`,
    });

    if (supplement === "All Day Vitamins") {
      await sendTelegramMessage(userId, `✅ All Day Vitamins logged.`);
    }

    if (supplement === "All Evening Supplements") {
      await sendTelegramMessage(userId, `✅ All Evening Supplements logged.`);
    }

    await sendTelegramMessage(otherUser, `🔔 ${senderName} just took ${supplement} 💊`);
    return res.sendStatus(200);
  }

  res.sendStatus(200);
});

// Health check route (for testing Render)
app.get("/", (_, res) => res.send("✅ Bot is live"));

app.listen(PORT, () => {
  console.log(`🚀 Telegram bot running on port ${PORT}`);
});
