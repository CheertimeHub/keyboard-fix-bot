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
  const key = pref?.[lang] ?? (lang === "th" ? "th-neural-c" : "en-neural-f");
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

async function synthesize(text, guildId) {
  const lang = detectLang(text);
  const voice = getVoiceConfig(guildId, lang);

  const [response] = await client.synthesizeSpeech({
    input: { text },
    voice,
    audioConfig: { audioEncoding: "OGG_OPUS" },
  });

  return Readable.from(response.audioContent);
}

function listVoices() {
  return VOICES;
}

module.exports = { synthesize, setVoice, listVoices };
