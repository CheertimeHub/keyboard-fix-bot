// services/commands.js
// Natural language command parser (keyword + regex, no AI needed)

// ---------------------------------------------------------------------------
// Dice
// ---------------------------------------------------------------------------

function parseDice(text) {
  // Standard notation: 2d6, d20, 3#d6
  const notation = text.match(/(\d+)?(#)?d(\d+)/i);
  if (notation) {
    return {
      count: parseInt(notation[1]) || 1,
      sides: parseInt(notation[3]),
      individual: !!notation[2],
    };
  }

  // ต้องมี "ทอยเต๋า" ติดกัน หรือมีตัวเลขร่วมด้วยถึงจะ trigger
  if (!/ทอย|เต๋า/.test(text)) return null;
  if (!/ทอยเต๋า|\d/.test(text)) return null;

  // "X ลูก Y หน้า"
  const full = text.match(/(\d+)\s*(?:ลูก|ตัว|อัน).*?(\d+)\s*(?:หน้า|แต้ม)/);
  if (full) return { count: parseInt(full[1]), sides: parseInt(full[2]), individual: true };

  // "Y หน้า" only
  const sides = text.match(/(\d+)\s*(?:หน้า|แต้ม)/);
  if (sides) return { count: 1, sides: parseInt(sides[1]), individual: false };

  // "X ลูก/เต๋า" only
  const count = text.match(/(\d+)\s*(?:ลูก|ตัว|อัน|เต๋า)/);
  if (count) return { count: parseInt(count[1]), sides: 6, individual: true };

  // Two bare numbers → count sides
  const nums = (text.match(/\d+/g) || []).map(Number);
  if (nums.length >= 2) return { count: nums[0], sides: nums[1], individual: true };
  if (nums.length === 1) return { count: 1, sides: nums[0], individual: false };

  return { count: 1, sides: 6, individual: false }; // default d6
}

function executeDice(text) {
  const parsed = parseDice(text);
  if (!parsed) return null;

  const { count, sides, individual } = parsed;
  if (count < 1 || count > 100 || sides < 2 || sides > 100000)
    return "ตัวเลขไม่ถูกต้องนะ (สูงสุด 100 ลูก, 100000 หน้า) 😅";

  const results = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
  const total = results.reduce((a, b) => a + b, 0);

  if (count === 1) return `🎲 ทอย d${sides}: **${total}**`;
  if (individual) return `🎲 ทอย ${count}d${sides}: [${results.join(", ")}] = **${total}**`;
  return `🎲 ทอย ${count}d${sides}: **${total}**`;
}

// ---------------------------------------------------------------------------
// Coin flip
// ---------------------------------------------------------------------------

function executeCoin(text) {
  // ต้องมีทั้ง "ทอย/สุ่ม" และ "เหรียญ" หรือมี "หัวก้อย"
  if (!/เหรียญ/.test(text)) return null;
  if (!/ทอย|สุ่ม|หัวก้อย/.test(text)) return null;
  return Math.random() < 0.5 ? "🪙 **หัว**" : "🪙 **ก้อย**";
}

// ---------------------------------------------------------------------------
// Random number
// ---------------------------------------------------------------------------

function executeRandom(text) {
  if (!/สุ่ม/.test(text)) return null;

  // Range: 1-100 / 1 ถึง 100 / 1~100
  const range = text.match(/(\d+)\s*(?:-|ถึง|to|~)\s*(\d+)/);
  if (range) {
    let [, a, b] = range.map(Number);
    const [min, max] = a < b ? [a, b] : [b, a];
    if (min === max) return "ต้องเป็นช่วงที่ต่างกันนะ 😅";
    const num = Math.floor(Math.random() * (max - min + 1)) + min;
    return `🔢 สุ่ม ${min}-${max}: **${num}**`;
  }

  // Single number: สุ่ม 100 → 1-100
  const single = text.match(/สุ่ม[^\d]*(\d+)/);
  if (single) {
    const max = parseInt(single[1]);
    if (max < 2) return "ตัวเลขน้อยเกินไปนะ 😅";
    const num = Math.floor(Math.random() * max) + 1;
    return `🔢 สุ่ม 1-${max}: **${num}**`;
  }

  // ถ้าไม่มีตัวเลขเลย ต้องมี intent ชัดขึ้น เช่น "สุ่มให้" หรือ "สุ่มเลข"
  if (!/สุ่มเลข|สุ่มให้|สุ่มตัวเลข/.test(text)) return null;

  // Default 1-100
  const num = Math.floor(Math.random() * 100) + 1;
  return `🔢 สุ่ม 1-100: **${num}**`;
}

// ---------------------------------------------------------------------------
// Choose
// ---------------------------------------------------------------------------

function executeChoose(text) {
  if (!/เลือก/.test(text)) return null;

  // Strip up to เลือก + optional filler
  let content = text.replace(/^.*?เลือก\s*(?:ให้(?:หน่อย)?|หน่อย|ระหว่าง|จาก|ว่า)?\s*/s, "");

  // Split by separators
  const fillerSuffix = /\s*(?:ให้(?:หน่อย)?|หน่อย|ด้วย|นะ|จ้า|ครับ|ค่ะ|นะคะ|นะครับ|ก็ได้|อ่ะ|อะ)\s*$/;
  const options = content
    .split(/\s*(?:หรือ(?:ว่า)?|กับ|,|\/|\|)\s*/)
    .map((s) => s.replace(fillerSuffix, "").trim())
    .filter((s) => s.length > 0);

  if (options.length < 2) return null;

  const choice = options[Math.floor(Math.random() * options.length)];
  return `✨ เลือก **${choice}** (จาก ${options.join(", ")})`;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

function parseAndExecute(rawText) {
  // Strip Discord mention tags
  const text = rawText.replace(/<@!?\d+>/g, "").replace(/@\S+/g, "").trim();

  return (
    executeCoin(text) ??
    executeDice(text) ??
    executeRandom(text) ??
    executeChoose(text) ??
    null
  );
}

module.exports = { parseAndExecute };
