require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { detectAndConvert } = require("./services/keyboard");

// Debug: Show environment
console.log("🔍 Environment Check:");
console.log(`  BOT_TOKEN: ${process.env.BOT_TOKEN ? "✅ Found" : "❌ MISSING"}`);
console.log(`  PORT: ${process.env.PORT || "3000"}`);

if (!process.env.BOT_TOKEN) {
  console.error("❌ FATAL: BOT_TOKEN ไม่พบ!");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Monitor connection state
client.on("error", (err) => {
  console.error("❌ Client Error:", err.message);
});

client.on("warn", (info) => {
  console.warn("⚠️  Warning:", info);
});

// Connection events
client.on("shardConnect", (id) => {
  console.log(`🔗 Shard ${id} connected`);
});

client.on("shardDisconnect", (_, id) => {
  console.log(`❌ Shard ${id} disconnected`);
});

client.once("ready", () => {
  console.log(`✅ Bot พร้อมแล้ว! logged in as ${client.user.tag}`);
  console.log(`🎯 Listening for messages...`);
});

client.on("messageCreate", async (msg) => {
  // ไม่ตอบสนองต่อ bot อื่น
  if (msg.author.bot) return;

  // ต้องแท็กบอทเท่านั้น
  if (!msg.mentions.has(client.user)) return;

  // ต้องเป็น reply ก่อน
  if (!msg.reference) {
    await msg.reply("ต้อง **reply** ข้อความที่อยากแปลก่อน แล้วค่อย @ฉันนะ 👀\nหรือใช้เว็บได้เลยที่ https://keyboard-fix-bot.onrender.com");
    return;
  }

  try {
    // ดึงข้อความต้นฉบับ
    const originalMsg = await msg.channel.messages.fetch(msg.reference.messageId);
    const originalText = originalMsg.content.trim();

    if (!originalText) {
      await msg.reply("ข้อความว่างเลยนะ แปลไม่ได้ 🤔");
      return;
    }

    const { result, direction } = detectAndConvert(originalText);

    if (direction === "none") {
      await msg.reply("แปลงไม่ได้เลยอ่ะ ข้อความไม่มี keyboard mapping ที่รู้จัก 🤷");
      return;
    }

    await originalMsg.reply(`\`\`\`\n: ${result}\n\`\`\``);
  } catch (err) {
    console.error("❌ Error:", err);
    await msg.reply("เกิดข้อผิดพลาดบางอย่าง ลองใหม่นะ 😅");
  }
});

// Web server
const http = require("http");
const fs = require("fs");
const path = require("path");

http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/convert") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { text } = JSON.parse(body);
        const { result, direction } = detectAndConvert(text || "");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ result, direction }));
      } catch {
        res.writeHead(400);
        res.end();
      }
    });
  } else {
    const page = req.url === "/about" ? "about.html" : "index.html";
    const file = path.join(__dirname, "public", page);
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(data);
    });
  }
}).listen(process.env.PORT || 3000, () => {
  console.log(`\n🚀 Starting bot login...\n`);
  console.log(`📍 Web server running on port ${process.env.PORT || 3000}\n`);
});

// Attempt login with comprehensive error handling
console.log("⏳ Logging in to Discord...");
client.login(process.env.BOT_TOKEN)
  .then(() => {
    console.log("✅ Login successful!");
  })
  .catch((err) => {
    console.error("❌ Login failed!");
    console.error("Error:", err.message);
    console.error("\n💡 Troubleshooting tips:");
    console.error("  1. Check BOT_TOKEN is correct in Render Environment");
    console.error("  2. Verify Intent permissions in Discord Developer Portal:");
    console.error("     - Server Members Intent: ON");
    console.error("     - Message Content Intent: ON");
    console.error("  3. Check bot has permissions in the server");
    process.exit(1);
  });

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n⛔ Bot shutting down...");
  client.destroy();
  process.exit(0);
});
