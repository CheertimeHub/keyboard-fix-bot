require("dotenv").config();
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const { detectAndConvert } = require("./services/keyboard");
const { parseAndExecute } = require("./services/commands");
const { synthesize, setVoice, listVoices } = require("./services/tts");
const {
  joinVoiceChannel, createAudioPlayer, createAudioResource,
  AudioPlayerStatus, VoiceConnectionStatus, entersState,
} = require("@discordjs/voice");

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
    GatewayIntentBits.GuildVoiceStates,
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

/* ══ TTS SESSION ══ */
// guildId → { connection, player, textChannelId, voiceChannelId, queue, speaking }
const ttsSessions = new Map();

function queueTTS(session, text, guildId) {
  session.queue.push(text);
  if (!session.speaking) processQueue(session, guildId);
}

async function processQueue(session, guildId) {
  if (!session.queue.length) { session.speaking = false; return; }
  session.speaking = true;
  const text = session.queue.shift();
  try {
    const stream = await synthesize(text, guildId);
    const resource = createAudioResource(stream);
    session.player.play(resource);
    session.player.once(AudioPlayerStatus.Idle, () => processQueue(session, guildId));
  } catch (err) {
    console.error("❌ TTS processQueue error:", err);
    session.speaking = false;
  }
}

// ออก VC อัตโนมัติเมื่อไม่มีคนเหลือ
client.on("voiceStateUpdate", (oldState) => {
  const session = ttsSessions.get(oldState.guild.id);
  if (!session) return;
  const vc = oldState.guild.channels.cache.get(session.voiceChannelId);
  const humans = vc?.members?.filter(m => !m.user.bot).size ?? 0;
  if (humans === 0) {
    session.connection.destroy();
    ttsSessions.delete(oldState.guild.id);
    console.log(`🔇 TTS session ended (empty VC) in guild ${oldState.guild.id}`);
  }
});

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  // auto-read ถ้าอยู่ใน TTS session channel (ไม่ต้อง mention)
  const session = ttsSessions.get(msg.guild?.id);
  if (session && msg.channelId === session.textChannelId) {
    const text = msg.content.trim();
    if (text) queueTTS(session, text, msg.guild.id);
    return;
  }

  // ต้องแท็กบอทสำหรับ command ทั้งหมด
  if (!msg.mentions.has(client.user)) return;

  const body = msg.content.replace(/<@!?\d+>/g, "").trim();

  // ถ้าไม่ได้ reply → command
  if (!msg.reference) {
    // TTS join
    if (/^join$/i.test(body)) {
      const member = msg.guild?.members.cache.get(msg.author.id);
      const voiceChannel = member?.voice?.channel;
      if (!voiceChannel) {
        await msg.reply("เข้า VC ก่อนนะ แล้วค่อย @ฉัน join 🎤");
        return;
      }
      if (ttsSessions.has(msg.guild.id)) {
        await msg.reply("กำลังทำงานอยู่ใน VC แล้วนะ 🔊");
        return;
      }
      try {
        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: msg.guild.id,
          adapterCreator: msg.guild.voiceAdapterCreator,
          selfDeaf: false,
        });
        await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
        const player = createAudioPlayer();
        connection.subscribe(player);
        ttsSessions.set(msg.guild.id, {
          connection, player,
          textChannelId: msg.channelId,
          voiceChannelId: voiceChannel.id,
          queue: [], speaking: false,
        });
        await msg.channel.send("# Xevra ได้เข้าร่วมการสนทนานี้แล้ว");
      } catch (err) {
        console.error("❌ TTS join error:", err);
        await msg.reply("เข้า VC ไม่ได้ 😅");
      }
      return;
    }

    // TTS voice: "@บอท voice" → แสดงรายการ, "@บอท voice th th-wavenet-b" → เปลี่ยน
    if (/^voice/i.test(body)) {
      const parts = body.split(/\s+/);
      if (parts.length === 1) {
        // แสดงรายการเสียงทั้งหมด
        const voices = listVoices();
        const lines = Object.entries(voices).map(([key, v]) =>
          `\`${key}\` — ${v.languageCode} ${v.ssmlGender === "FEMALE" ? "♀" : "♂"} (${v.name})`
        );
        await msg.reply(
          `**เสียงที่มี:**\n${lines.join("\n")}\n\n` +
          `ใช้ \`@บอท voice th <key>\` หรือ \`@บอท voice en <key>\` เพื่อเปลี่ยน`
        );
      } else if (parts.length === 3) {
        const [, lang, key] = parts;
        const ok = setVoice(msg.guild.id, lang, key);
        if (ok) await msg.reply(`✅ เปลี่ยนเสียง **${lang}** เป็น \`${key}\` แล้ว`);
        else await msg.reply(`❌ ไม่รู้จัก key นั้น ลอง \`@บอท voice\` เพื่อดูรายการ`);
      } else {
        await msg.reply(`ใช้ \`@บอท voice\` เพื่อดูรายการ หรือ \`@บอท voice th th-wavenet-b\` เพื่อเปลี่ยน`);
      }
      return;
    }

    // TTS leave
    if (/^(leave|หยุด)$/i.test(body)) {
      const s = ttsSessions.get(msg.guild?.id);
      if (!s) { await msg.reply("ไม่ได้อยู่ใน VC นะ 🤔"); return; }
      s.player.stop();
      s.connection.destroy();
      ttsSessions.delete(msg.guild.id);
      await msg.channel.send("# Xevra ได้ออกจากห้องสนทนานี้แล้ว");
      return;
    }

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
  } else if (req.method === "GET" && /\.(js|css)$/.test(req.url)) {
    const filePath = path.join(__dirname, "public", decodeURIComponent(req.url.replace(/\?.*$/, "")));
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      const mime = req.url.endsWith(".css") ? "text/css" : "application/javascript";
      res.writeHead(200, { "Content-Type": mime });
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
