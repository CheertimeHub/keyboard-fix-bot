const textToSpeech = require("@google-cloud/text-to-speech");
const { Readable } = require("stream");

const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON || "{}");
const client = new textToSpeech.TextToSpeechClient({ credentials });

const VOICES = {
  // ไทย
  "th-neural-c":   { languageCode: "th-TH", name: "th-TH-Neural2-C",  ssmlGender: "FEMALE" },
  "th-wavenet-a":  { languageCode: "th-TH", name: "th-TH-Wavenet-A",  ssmlGender: "FEMALE" },
  "th-wavenet-b":  { languageCode: "th-TH", name: "th-TH-Wavenet-B",  ssmlGender: "MALE"   },
  "th-wavenet-c":  { languageCode: "th-TH", name: "th-TH-Wavenet-C",  ssmlGender: "FEMALE" },
  "th-standard-a": { languageCode: "th-TH", name: "th-TH-Standard-A", ssmlGender: "FEMALE" },
  // อังกฤษ
  "en-neural-f":   { languageCode: "en-US", name: "en-US-Neural2-F",  ssmlGender: "FEMALE" },
  "en-neural-d":   { languageCode: "en-US", name: "en-US-Neural2-D",  ssmlGender: "MALE"   },
  "en-wavenet-f":  { languageCode: "en-US", name: "en-US-Wavenet-F",  ssmlGender: "FEMALE" },
  "en-wavenet-d":  { languageCode: "en-US", name: "en-US-Wavenet-D",  ssmlGender: "MALE"   },
};

// เสียง default ต่อ guild: guildId → { th: voiceKey, en: voiceKey }
const guildVoices = new Map();

function getVoiceConfig(guildId, lang) {
  const pref = guildVoices.get(guildId);
  const key = pref?.[lang] ?? (lang === "th" ? "th-wavenet-a" : "en-wavenet-f");
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

  // ลบ Unicode emoji (standard emoji ranges)
  text = text.replace(/[\u{1F000}-\u{1FFFF}]/gu, "");
  text = text.replace(/[\u{2600}-\u{27FF}]/gu, "");
  text = text.replace(/[\u{FE00}-\u{FEFF}]/gu, "");

  text = text.trim();
  if (!text) return null;

  // ตัดที่ 200 chars
  if (text.length > 200) text = text.slice(0, 200);

  return text;
}

async function synthesize(text, guildId) {
  const processed = preprocessText(text);
  if (!processed) return null;

  const lang = detectLang(processed);
  const voice = getVoiceConfig(guildId, lang);

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
