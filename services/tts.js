const textToSpeech = require("@google-cloud/text-to-speech");
const { Readable } = require("stream");
const fs = require("fs");
const path = require("path");

const credFile = path.join(__dirname, "..", "xevra-tts-functions-f5a8e0b7b1f1.json");
const credentials = fs.existsSync(credFile)
  ? JSON.parse(fs.readFileSync(credFile, "utf8"))
  : JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON || "{}");
const client = new textToSpeech.TextToSpeechClient({ credentials });

const VOICES = {
  // ไทย Chirp3-HD (รุ่นใหม่สุด)
  "th-sulafat":    { languageCode: "th-TH", name: "th-TH-Chirp3-HD-Sulafat",      ssmlGender: "FEMALE" },
  "th-aoede":      { languageCode: "th-TH", name: "th-TH-Chirp3-HD-Aoede",        ssmlGender: "FEMALE" },
  "th-kore":       { languageCode: "th-TH", name: "th-TH-Chirp3-HD-Kore",         ssmlGender: "FEMALE" },
  "th-leda":       { languageCode: "th-TH", name: "th-TH-Chirp3-HD-Leda",         ssmlGender: "FEMALE" },
  "th-zephyr":     { languageCode: "th-TH", name: "th-TH-Chirp3-HD-Zephyr",       ssmlGender: "FEMALE" },
  "th-charon":     { languageCode: "th-TH", name: "th-TH-Chirp3-HD-Charon",       ssmlGender: "MALE"   },
  "th-puck":       { languageCode: "th-TH", name: "th-TH-Chirp3-HD-Puck",         ssmlGender: "MALE"   },
  "th-orus":       { languageCode: "th-TH", name: "th-TH-Chirp3-HD-Orus",         ssmlGender: "MALE"   },
  // ไทย รุ่นเก่า
  "th-neural-c":   { languageCode: "th-TH", name: "th-TH-Neural2-C",              ssmlGender: "FEMALE" },
  "th-standard-a": { languageCode: "th-TH", name: "th-TH-Standard-A",             ssmlGender: "FEMALE" },
  // อังกฤษ Chirp3-HD
  "en-sulafat":    { languageCode: "en-US", name: "en-US-Chirp3-HD-Sulafat",      ssmlGender: "FEMALE" },
  "en-aoede":      { languageCode: "en-US", name: "en-US-Chirp3-HD-Aoede",        ssmlGender: "FEMALE" },
  "en-kore":       { languageCode: "en-US", name: "en-US-Chirp3-HD-Kore",         ssmlGender: "FEMALE" },
  "en-zephyr":     { languageCode: "en-US", name: "en-US-Chirp3-HD-Zephyr",       ssmlGender: "FEMALE" },
  "en-charon":     { languageCode: "en-US", name: "en-US-Chirp3-HD-Charon",       ssmlGender: "MALE"   },
  "en-puck":       { languageCode: "en-US", name: "en-US-Chirp3-HD-Puck",         ssmlGender: "MALE"   },
  // อังกฤษ รุ่นเก่า
  "en-neural-f":   { languageCode: "en-US", name: "en-US-Neural2-F",              ssmlGender: "FEMALE" },
  "en-neural-d":   { languageCode: "en-US", name: "en-US-Neural2-D",              ssmlGender: "MALE"   },
  "en-wavenet-f":  { languageCode: "en-US", name: "en-US-Wavenet-F",              ssmlGender: "FEMALE" },
  "en-wavenet-d":  { languageCode: "en-US", name: "en-US-Wavenet-D",              ssmlGender: "MALE"   },
};

// เสียง default ต่อ guild: guildId → { th: voiceKey, en: voiceKey }
const guildVoices = new Map();

function getVoiceConfig(guildId, lang) {
  const pref = guildVoices.get(guildId);
  const key = pref?.[lang] ?? (lang === "th" ? "th-sulafat" : "en-sulafat");
  return VOICES[key];
}

function setVoice(guildId, lang, key) {
  if (!VOICES[key]) return false;
  if (lang !== "th" && lang !== "en") return false;
  const cur = guildVoices.get(guildId) ?? {};
  guildVoices.set(guildId, { ...cur, [lang]: key });
  return true;
}

function detectLang(text) {
  const thaiChars = (text.match(/[฀-๿]/g) || []).length;
  return thaiChars / text.replace(/\s/g, "").length > 0.3 ? "th" : "en";
}

// preprocess ตาม Discord-TTS/Bot: ลบ URL, แปลง emoji, ลบ spoiler/code, ตัด 200 chars
function preprocessText(text) {
  // ข้อความที่ขึ้นต้นด้วย - → ไม่อ่าน
  if (text.trimStart().startsWith("-")) return null;

  // ลบ code block (```...```) และ inline code (`...`)
  text = text.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "");

  // ลบ spoiler ||...||
  text = text.replace(/\|\|[\s\S]*?\|\|/g, "");

  // ลบ URL
  text = text.replace(/https?:\/\/\S+/g, "");

  // Discord custom emoji <:name:id> หรือ animated <a:name:id> → ชื่อ emoji
  text = text.replace(/<a?:(\w+):\d+>/g, (_, name) => name.replace(/_/g, " "));

  // ลบ mention <@id> <@!id> <#id> <@&id>
  text = text.replace(/<[@#][!&]?\d+>/g, "");

  // ลบ Unicode emoji ใช้ property escape เพื่อไม่กิน Thai chars
  text = text.replace(/\p{Emoji_Presentation}/gu, "");
  text = text.replace(/\p{Extended_Pictographic}/gu, "");

  // 555 → ฮ่าๆ ตามความยาว (55=ฮ่าๆ, 555=ฮ่าๆๆ, 5555=ฮ่าๆๆๆ ...)
  text = text.replace(/5{2,}/g, (m) => "ฮ่า" + "ๆ".repeat(Math.ceil(m.length / 2)));

  text = text.trim();
  if (!text) return null;

  // ตัดที่ 200 chars
  if (text.length > 200) text = text.slice(0, 200);

  return text;
}

async function synthesize(text, guildId) {
  const processed = preprocessText(text);
  if (!processed) return null;

  const voice = getVoiceConfig(guildId, "th");

  const [response] = await client.synthesizeSpeech({
    input: { text: processed },
    voice,
    audioConfig: { audioEncoding: "OGG_OPUS" },
  });

  return Readable.from(response.audioContent);
}

function listVoices() {
  return VOICES;
}

module.exports = { synthesize, setVoice, listVoices };
