const express = require("express");
const axios = require("axios");
const fs = require("fs");
const cron = require("node-cron");

const app = express();
const PORT = process.env.PORT || 3001;

const BOT_TOKEN = "7697941059:AAHAtUFxMSKtB3NQgAVwBK3f7wB8iFdY1dw";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const USER_A = "7052003301"; // Maksymilian
const USER_B = "818290223"; // Sonya
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
  "Saw palmetto", // Only for USER_A
  "Zinc", 
  "DHA-500", 
  "Mushroom Complex"
];

const questions = [
  "Did you have black seed oil?",
  "Did you have creatine?",
  "Did you have collagen?"
];

let currentQuestionIndex = 0; // Track which question we're on
let userQuestionsAnswered = {}; // Store whether user has answered all questions

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

// Webhook handler
app.post("/telegram/webhook", async (req, res) => {
  const message = req.body.message;
  const callback = req.body.callback_query;

  // Handle /start with a start button
  if (message?.text === "/start") {
    await sendTelegramMessage(message.chat.id, "👋 Welcome! Tap below to start:", getSupplementButtons());
    return res.sendStatus(200);
  }

  // Handle Start button click
  if (callback && callback.data === "start") {
    await sendTelegramMessage(callback.from.id, "💊 Choose a supplement to log:", getSupplementButtons());
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

    let otherUser = null;
    let supplementLoggedMessage = "";

    if (supplementType === "log_day_supplements") {
      daySupplements.forEach((supplement) => {
        if (!logs[today][userId].includes(supplement)) {
          logs[today][userId].push(supplement);
        }
      });
      saveLogs(logs);
      supplementLoggedMessage = `✅ All Day Supplements logged: ${daySupplements.join(", ")}`;
    }

    if (supplementType === "log_evening_supplements") {
      eveningSupplements.forEach((supplement) => {
        if (!logs[today][userId].includes(supplement)) {
          logs[today][userId].push(supplement);
        }
      });
      saveLogs(logs);
      supplementLoggedMessage = `✅ Evening Supplements logged: ${eveningSupplements.join(", ")}`;
    }

    // Notify the other user
    if (userId === USER_A) {
      otherUser = USER_B;
    } else {
      otherUser = USER_A;
    }

    // Notify the other user with personalized message
    await sendTelegramMessage(otherUser, `🔔 ${userId === USER_A ? "Maksymilian" : "Sonya"} just took supplements. Here's the log: ${supplementLoggedMessage}`);

    // Ask if they want to send a personalized note (directly after logging)
    await sendTelegramMessage(userId, "Would you like to send a personalized note to the other user?");
    await sendTelegramMessage(userId, "Type your note and send it, or leave it blank.");

    return res.sendStatus(200);
  }

  // Handling questions (Black seed oil, Creatine, Collagen)
  if (callback && (callback.data === "yes" || callback.data === "no")) {
    const userId = String(callback.from.id);

    if (currentQuestionIndex < questions.length) {
      await sendTelegramMessage(userId, questions[currentQuestionIndex], getYesNoButtons());
      currentQuestionIndex++;
    } else {
      await sendTelegramMessage(userId, "You have completed all questions.");
      currentQuestionIndex = 0; // Reset for next day
    }
  }

  res.sendStatus(200);
});

// Function to generate report
function generateReport(userId) {
  const logs = loadLogs();
  let report = `📋 Supplements Log Report for ${userId}\n\n`;

  for (const date in logs) {
    report += `\nDate: ${date}\n`;
    for (const user in logs[date]) {
      report += `User: ${user}\nSupplements: ${logs[date][user].join(", ")}\n\n`;
    }
  }

  // Save the report as a file
  const reportFileName = `report-${userId}-${getToday()}.txt`;
  fs.writeFileSync(reportFileName, report);
  return reportFileName;
}

// Health check route (for testing Render)
app.get("/", (_, res) => res.send("✅ Bot is live"));

app.listen(PORT, () => {
  console.log(`🚀 Telegram bot running on port ${PORT}`);

  // Set reminders at 13:30 for day supplements and 21:00 for evening supplements
  cron.schedule("30 13 * * *", () => {
    sendTelegramMessage(USER_A, "🌞 Good afternoon! Did you take your supplements?");
    sendTelegramMessage(USER_B, "🌞 Good afternoon! Did you take your supplements?");
  });

  cron.schedule("0 21 * * *", () => {
    sendTelegramMessage(USER_A, "🌙 Evening check-in: Did you take your supplements?");
    sendTelegramMessage(USER_B, "🌙 Evening check-in: Did you take your supplements?");
  });
});
