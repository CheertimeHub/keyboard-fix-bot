require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { detectAndConvert } = require("./services/keyboard");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`✅ Bot พร้อมแล้ว! logged in as ${client.user.tag}`);
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
}).listen(process.env.PORT || 3000);

client.login(process.env.BOT_TOKEN);
