// server.js
const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3001;

const BOT_TOKEN = "7697941059:AAHAtUFxMSKtB3NQgAVwBK3f7wB8iFdY1dw";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// keyboard for /start
const supplementKeyboard = [[
  { text: "Log Day Supplements",     callback_data: "log_day"     },
  { text: "Log Evening Supplements", callback_data: "log_evening" }
]];

// helper to send messages (with optional inline keyboard)
async function sendTelegramMessage(chatId, text, keyboard = null) {
  console.log("→ sendMessage:", chatId, text, keyboard ? "(with keyboard)" : "");
  await axios.post(`${TELEGRAM_API}/sendMessage`, {
    chat_id: chatId,
    text,
    ...(keyboard && { reply_markup: { inline_keyboard: keyboard } })
  });
}

app.use(express.json());

app.post("/telegram/webhook", async (req, res) => {
  console.log("🔔 Webhook hit:", JSON.stringify(req.body).substr(0,200));

  const msg = req.body.message;
  const cb  = req.body.callback_query;

  // 1) handle /start
  if (msg?.text === "/start") {
    await sendTelegramMessage(
      msg.chat.id,
      "👋 Welcome! Tap a button to begin:",
      supplementKeyboard
    );
    return res.sendStatus(200);
  }

  // 2) handle button taps
  if (cb) {
    console.log("↪ Callback data:", cb.data);
    // acknowledge in-chat
    await sendTelegramMessage(
      cb.from.id,
      `Got your tap: ${cb.data}. (Next steps go here.)`
    );
    return res.sendStatus(200);
  }

  // fallback
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
