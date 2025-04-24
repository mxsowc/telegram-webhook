require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

// This is the endpoint Telegram will POST messages to
app.post("/telegram/webhook", (req, res) => {
  const message = req.body.message;

  if (message && message.chat) {
    const chatId = message.chat.id;
    const text = message.text;
    console.log(`📩 Message from ${chatId}: ${text}`);
  }

  res.sendStatus(200); // Tell Telegram we received it successfully
});

// Start the server
app.post("/telegram/webhook", (req, res) => {
    const message = req.body.message;
  
    if (message && message.chat) {
      const chatId = message.chat.id;
      const text = message.text;
      console.log(`📩 Message from ${chatId}: ${text}`);
    }
  
    res.sendStatus(200);
  });
  
app.listen(3001, () => {
  console.log("🚀 Webhook server is running on port 3001");
});
