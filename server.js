require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

// 🔐 Telegram bot token
const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN || "7697941059:AAHAtUFxMSKtB3NQgAVwBK3f7wB8iFdY1dw";

// 👥 Telegram user chat IDs
const USER_A_CHAT_ID = "7052003301"; // Maksymilian
const USER_B_CHAT_ID = "818290223";  // Second person

// 📬 Telegram webhook handler
app.post("/telegram/webhook", (req, res) => {
  const message = req.body.message;

  if (message && message.chat) {
    const chatId = message.chat.id;
    const text = message.text;
    console.log(`📩 Message from ${chatId}: ${text}`);
  }

  res.sendStatus(200);
});

// 🔔 Notification handler from React app
app.post("/notify", async (req, res) => {
  const { sender, supplement } = req.body;

  const toChatId = sender === "A" ? USER_B_CHAT_ID : USER_A_CHAT_ID;
  const fromName = sender === "A" ? "Maksymilian" : "Partner";

  const message = `${fromName} just took ${supplement} 💊`;

  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: toChatId,
      text: message,
    });
    console.log(`✅ Sent message to ${toChatId}`);
    res.send({ success: true });
  } catch (error) {
    console.error("❌ Failed to send message:", error.response?.data || error.message);
    res.status(500).send({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
