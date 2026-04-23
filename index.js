require("dotenv").config();
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const { detectAndConvert } = require("./services/keyboard");
const { parseAndExecute } = require("./services/commands");

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
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.Channel],
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

client.on("shardError", console.error)
client.on("error", console.error)

client.on("messageCreate", async (msg) => {
  // ไม่ตอบสนองต่อ bot อื่น
  if (msg.author.bot) return;

  // ต้องแท็กบอทเท่านั้น
  if (!msg.mentions.has(client.user)) return;

  // ถ้าไม่ได้ reply → ลองตีความเป็น command
  if (!msg.reference) {
    const commandResult = parseAndExecute(msg.content);
    if (commandResult) {
      await msg.channel.sendTyping();
      await new Promise((r) => setTimeout(r, 1000));
      await msg.reply(commandResult);
    } else {
      await msg.reply("ต้อง **reply** ข้อความที่อยากแปลก่อน แล้วค่อย @ฉันนะ 👀\nหรือใช้เว็บได้เลยที่ https://xevradotgpt.onrender.com");
    }
    return;
  }

  try {
    await msg.channel.sendTyping();
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

// 👁️‍🗨️ react to translate
const EYE_EMOJI = ["👁️‍🗨️", "👁‍🗨"];
client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;
  if (!EYE_EMOJI.includes(reaction.emoji.name)) return;

  try {
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();

    const originalText = reaction.message.content?.trim();
    if (!originalText) return;

    await reaction.message.channel.sendTyping();
    const { result, direction } = detectAndConvert(originalText);
    if (direction === "none") return;

    await reaction.message.reply(`\`\`\`\n: ${result}\n\`\`\``);
  } catch (err) {
    console.error("❌ Reaction translate error:", err);
  }
});

console.log("Node version:", process.version)
console.log("Discord.js version:", require("discord.js").version)

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
  } else if (req.method === "GET" && req.url === "/api/bot-info") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      avatar: client.user?.displayAvatarURL({ size: 128, extension: "png" }) ?? null,
      name: client.user?.username ?? "Xevra.GPT",
    }));
  } else if (req.method === "GET" && req.url === "/manifest.json") {
    const file = path.join(__dirname, "public", "manifest.json");
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "Content-Type": "application/manifest+json" });
      res.end(data);
    });
  } else if (req.method === "GET" && req.url.startsWith("/assets/")) {
    const assetPath = decodeURIComponent(req.url.replace(/\?.*$/, "")); // strip query string + decode spaces
    const file = path.join(__dirname, "public", assetPath);
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      const ext = path.extname(file).toLowerCase();
      const mime = { ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml" }[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": mime, "Cache-Control": "public, max-age=86400" });
      res.end(data);
    });
  } else {
    const page = req.url === "/about" ? "about.html"
               : req.url === "/how-to-use" ? "how-to-use.html"
               : req.url === "/community" ? "community.html"
               : req.url === "/community/rnc" ? "community/rnc.html"
               : req.url === "/community/rnc/create" ? "community/rnc/create.html"
               : "index.html";
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
const https = require("https");
https.get("https://discord.com/api/v10/gateway", (res) => {
  console.log("🌐 Discord API reachable, status:", res.statusCode);
}).on("error", (e) => {
  console.error("🌐 Discord API unreachable:", e.message);
});
client.login(process.env.BOT_TOKEN.trim())
  .then(() => {
    console.log("✅ Login successful!");
  })
  .catch((err) => {
    console.error("❌ Login failed! Error:", err.message);
    setTimeout(() => process.exit(1), 1000);
  });

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n⛔ Bot shutting down...");
  client.destroy();
  process.exit(0);
});
