const textToSpeech = require("@google-cloud/text-to-speech");
const { Readable } = require("stream");

// โหลด credentials จาก env var (Render)
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON || "{}");
const client = new textToSpeech.TextToSpeechClient({ credentials });

// ตรวจว่าข้อความเป็นไทยหรือเปล่า (>30% Thai chars)
function detectLang(text) {
  const thaiChars = (text.match(/[฀-๿]/g) || []).length;
  return thaiChars / text.replace(/\s/g, "").length > 0.3 ? "th" : "en";
}

async function synthesize(text) {
  const lang = detectLang(text);

  const voice = lang === "th"
    ? { languageCode: "th-TH", name: "th-TH-Neural2-C", ssmlGender: "FEMALE" }
    : { languageCode: "en-US", name: "en-US-Neural2-F", ssmlGender: "FEMALE" };

  const [response] = await client.synthesizeSpeech({
    input: { text },
    voice,
    audioConfig: { audioEncoding: "OGG_OPUS" },
  });

  return Readable.from(response.audioContent);
}

module.exports = { synthesize };
