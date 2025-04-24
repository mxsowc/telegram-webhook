require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN;

const USER_A_CHAT_ID = "7052003301"; // Maksymilian
const USER_B_CHAT_ID = "PUT_SECOND_USER_CHAT_ID_HERE"; // Your friend

app.post("/notify", async (req, res) => {
  const { sender, supplement } = req.body;

  const toChatId = sender === "A" ? USER_B_CHAT_ID : USER_A_CHAT_ID;
  const fromUser = sender === "A" ? "Maksymilian" : "Partner";

  const message = `${fromUser} just took ${supplement} 💊`;

  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: toChatId,
      text: message,
    });
    res.send({ success: true });
  } catch (err) {
    console.error("❌ Failed to send Telegram message:", err.response?.data || err.message);
    res.status(500).send({ error: err.message });
  }
});

app.post("/telegram/webhook", (req, res) => {
  const message = req.body.message;

  if (message && message.chat) {
    const chatId = message.chat.id;
    const text = message.text;
    console.log(`📩 Message from ${chatId}: ${text}`);
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Webhook server is running on port ${PORT}`);
});
