const express = require("express");
const axios = require("axios");
const fs = require("fs");
const cron = require("node-cron");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

const USER_A = "7052003301"; // Maksymilian
const USER_B = "818290223"; // Second user

const DATA_FILE = "./logs.json";

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

function sendTelegramMessage(chatId, text, options = {}) {
  return axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
    chat_id: chatId,
    text,
    ...options,
  });
}

function sendSupplementMenu(chatId) {
  const supplements = ["Vitamin D", "Magnesium", "Omega-3", "Zinc"];
  const keyboard = supplements.map((s) => [{ text: s, callback_data: s }]);

  return sendTelegramMessage(chatId, "💊 Select a supplement to log:", {
    reply_markup: {
      inline_keyboard: keyboard,
    },
  });
}

app.post("/telegram/webhook", async (req, res) => {
  const message = req.body.message;
  const callback = req.body.callback_query;

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

    await axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/answerCallbackQuery`, {
      callback_query_id: callback.id,
      text: `✅ Logged: ${supplement}`,
    });

    await sendTelegramMessage(otherUser, `🔔 ${senderName} just took ${supplement} 💊`);
    return res.sendStatus(200);
  }

  if (message) {
    const userId = String(message.from.id);
    const text = message.text.trim();

    if (text === "/start") {
      await sendTelegramMessage(userId, "👋 Welcome! Click below to log your supplements:", {
        reply_markup: {
          inline_keyboard: [[{ text: "Log Supplement", callback_data: "menu" }]],
        },
      });
      return res.sendStatus(200);
    }

    if (text === "/status") {
      const today = getToday();
      const logs = loadLogs();
      const supplements = logs[today]?.[userId] || [];
      const msg = supplements.length
        ? `📋 Today's supplements: ${supplements.join(", ")}`
        : `❌ No supplements logged today`;
      await sendTelegramMessage(userId, msg);
      return res.sendStatus(200);
    }
  }

  res.sendStatus(200);
});

app.post("/notify", (req, res) => {
  res.send("✅ Server is running.");
});

cron.schedule("0 8 * * *", () => {
  sendTelegramMessage(USER_A, "🌞 Morning reminder! Did you take your supplements?");
  sendTelegramMessage(USER_B, "🌞 Morning reminder! Did you take your supplements?");
});

cron.schedule("0 20 * * *", () => {
  sendTelegramMessage(USER_A, "🌙 Evening reminder! Did you take your supplements?");
  sendTelegramMessage(USER_B, "🌙 Evening reminder! Did you take your supplements?");
});

app.listen(PORT, () => {
  console.log(`🚀 Telegram health bot is live on port ${PORT}`);
});
