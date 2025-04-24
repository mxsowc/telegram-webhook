const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// ✅ CORS fix: allow frontend to communicate with backend
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); // you can restrict later to http://localhost:3000
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.use(express.json());

// Replace with your actual Telegram user IDs
const USER_A = "7052003301";
const USER_B = "818290223";

app.post("/notify", (req, res) => {
  const { sender, supplement } = req.body;

  const receiver = sender === "A" ? USER_B : USER_A;
  const message = `🧠 ${sender === "A" ? "Maksymilian" : "User B"} just took ${supplement} 💊`;

  console.log("Sending to Telegram:", message);

  axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
    chat_id: receiver,
    text: message,
  }).then(() => {
    res.sendStatus(200);
  }).catch((error) => {
    console.error("Telegram send error:", error.message);
    res.sendStatus(500);
  });
});

// Telegram webhook endpoint (optional)
app.post("/telegram/webhook", (req, res) => {
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`🚀 Webhook server is running on port ${PORT}`);
});
