const express = require("express");
const axios = require("axios");
const fs = require("fs");
const cron = require("node-cron");
const { writeFileSync } = require("fs");

const app = express();
const PORT = process.env.PORT || 3001;

const BOT_TOKEN = "7697941059:AAHAtUFxMSKtB3NQgAVwBK3f7wB8iFdY1dw";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const USER_A = "7052003301"; // Maksymilian
const USER_B = "818290223"; // Second user
const DATA_FILE = "./logs.json";

app.use(express.json());

// Supplement lists
const daySupplements = [
  "Vitamin D3", 
  "Vitamin B complex", 
  "Turmeric and black pepper", 
  "Purim (skin health)", 
  "Astaxanthin"
];

const eveningSupplements = [
  "Saw palmetto", // Only for User A
  "Zinc", 
  "DHA-500", 
  "Mushroom Complex"
];

const questions = [
  "Did you have black seed oil?",
  "Did you have creatine?",
  "Did you have collagen?"
];

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

// Build supplement buttons (including day and evening supplements)
function getSupplementButtons() {
  return [
    [{ text: "Log Day Supplements", callback_data: "log_day_supplements" }],
    [{ text: "Log Evening Supplements", callback_data: "log_evening_supplements" }],
  ];
}

// Webhook handler
app.post("/telegram/webhook", async (req, res) => {
  const message = req.body.message;
  const callback = req.body.callback_query;

  // Handle /start
  if (message?.text === "/start") {
    await sendTelegramMessage(message.chat.id, "👋 Welcome! Tap below to log supplements:", getSupplementButtons());
    return res.sendStatus(200);
  }

  // Handle supplement logging (Day or Evening)
  if (callback) {
    const userId = String(callback.from.id);
    const today = getToday();
    const logs = loadLogs();
    const supplementType = callback.data;

    if (!logs[today]) logs[today] = {};
    if (!logs[today][userId]) logs[today][userId] = [];

    if (supplementType === "log_day_supplements") {
      daySupplements.forEach((supplement) => {
        if (!logs[today][userId].includes(supplement)) {
          logs[today][userId].push(supplement);
        }
      });
      saveLogs(logs);
      await sendTelegramMessage(userId, `✅ All Day Supplements logged: ${daySupplements.join(", ")}`);
    }

    if (supplementType === "log_evening_supplements") {
      eveningSupplements.forEach((supplement) => {
        if (!logs[today][userId].includes(supplement)) {
          logs[today][userId].push(supplement);
        }
      });
      saveLogs(logs);
      await sendTelegramMessage(userId, `✅ Evening Supplements logged: ${eveningSupplements.join(", ")}`);
    }

    await sendTelegramMessage(userId, "⚙️ Would you like to answer the following questions?");
    for (const question of questions) {
      await sendTelegramMessage(userId, question);
    }

    await sendTelegramMessage(userId, "Once you answer, I will send a report.");
    return res.sendStatus(200);
  }

  res.sendStatus(200);
});

// Function to generate report
function generateReport() {
  const logs = loadLogs();
  let report = "📋 Supplements Log Report\n\n";

  for (const date in logs) {
    report += `\nDate: ${date}\n`;
    for (const userId in logs[date]) {
      report += `User: ${userId}\nSupplements: ${logs[date][userId].join(", ")}\n\n`;
    }
  }

  // Save the report as a file
  const reportFileName = `report-${getToday()}.txt`;
  writeFileSync(reportFileName, report);
  return reportFileName;
}

// Handle report request
app.post("/report", (req, res) => {
  const reportFileName = generateReport();
  res.sendFile(reportFileName, { root: __dirname });
});

// Health check route (for testing Render)
app.get("/", (_, res) => res.send("✅ Bot is live"));

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
