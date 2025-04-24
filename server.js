// server.js
const express = require("express");
const axios = require("axios");
const cron = require("node-cron");
const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Use lowdb
const adapter = new JSONFile("logs.json");
const db = new Low(adapter);

async function loadLogs() {
  await db.read();
  db.data ||= {};
  return db.data;
}

async function saveLogs(data) {
  db.data = data;
  await db.write();
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function sendTelegramMessage(chatId, text, replyMarkup = null) {
  return axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
    chat_id: chatId,
    text,
    reply_markup: replyMarkup,
  });
}

const USER_A = "7052003301"; // Maksymilian
const USER_B = "818290223"; // Second user

// Handle Telegram Webhook
app.use(express.json());

app.post("/telegram/webhook", async (req, res) => {
  const message = req.body.message;
  const callback = req.body.callback_query;

  if (callback) {
    const userId = String(callback.from.id);
    const supplement = callback.data;
    const today = getToday();
    const logs = await loadLogs();
    if (!logs[today]) logs[today] = {};
    if (!logs[today][userId]) logs[today][userId] = [];
    if (!logs[today][userId].includes(supplement)) {
      logs[today][userId].push(supplement);
      await saveLogs(logs);
    }
    const senderName = userId === USER_A ? "Maksymilian" : "User B";
    const otherUser = userId === USER_A ? USER_B : USER_A;

    await sendTelegramMessage(userId, `✅ Logged: ${supplement}`);
    await sendTelegramMessage(otherUser, `🔔 ${senderName} just took ${supplement} 💊`);
    return res.sendStatus(200);
  }

  if (!message || !message.text) return res.sendStatus(200);
  const userId = String(message.from.id);
  const username = message.from.first_name;
  const text = message.text.trim();

  const logs = await loadLogs();
  const today = getToday();
  if (!logs[today]) logs[today] = {};

  if (text === "/start") {
    const replyMarkup = {
      inline_keyboard: [
        [
          { text: "Vitamin D", callback_data: "Vitamin D" },
          { text: "Magnesium", callback_data: "Magnesium" },
        ],
        [
          { text: "Omega-3", callback_data: "Omega-3" },
          { text: "Zinc", callback_data: "Zinc" },
        ],
      ],
    };
    await sendTelegramMessage(userId, `👋 Hello ${username}! Click to log your supplement:`, replyMarkup);
    return res.sendStatus(200);
  }

  if (text === "/status") {
    const supplements = logs[today][userId] || [];
    const msg = supplements.length
      ? `📋 Today's supplements: ${supplements.join(", ")}`
      : `❌ No supplements logged today`;
    await sendTelegramMessage(userId, msg);
    return res.sendStatus(200);
  }

  await sendTelegramMessage(userId, `👋 Hello ${username}! Use /start to see buttons or /status to check.`);
  res.sendStatus(200);
});

// Health check
app.post("/notify", (req, res) => {
  res.send("✅ Server running.");
});

// Start server and schedule reminders
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
