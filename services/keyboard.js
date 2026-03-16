// Kedmanee keyboard layout mapping: English → Thai
const engToThai = {
  // Number row (no shift)
  "`": "_",
  "1": "ๅ", "2": "/", "3": "-", "4": "ภ", "5": "ถ",
  "6": "ุ", "7": "ึ", "8": "ค", "9": "ต", "0": "จ",
  "-": "ข", "=": "ช",

  // Number row (shift)
  "~": "%",
  "!": "+", "@": "๑", "#": "๒", "$": "๓", "%": "๔",
  "^": "ู", "&": "฿", "*": "๕", "(": "๖", ")": "๗",
  "_": "๘", "+": "๙",

  // Top row (no shift)
  "q": "ๆ", "w": "ไ", "e": "ำ", "r": "พ", "t": "ะ",
  "y": "ั",  "u": "ี", "i": "ร", "o": "น", "p": "ย",
  "[": "บ", "]": "ล", "\\": "ฃ",

  // Top row (shift)
  "Q": "๐", "W": "ฑ", "E": "ธ", "R": "ณ", "T": "ฯ",
  "Y": "ญ", "U": "ฐ", "I": "ฅ", "O": "ฤ", "P": "ฆ",
  "{": "ฏ", "}": "โ", "|": "ฌ",

  // Middle row (no shift)
  "a": "ฟ", "s": "ห", "d": "ก", "f": "ด", "g": "เ",
  "h": "้", "j": "่", "k": "า", "l": "ส", ";": "ว",
  "'": "ง",

  // Middle row (shift)
  "A": "ฉ", "S": "ฮ", "D": "ึ", "F": "็", "G": "เ",
  "H": "่", "J": "๊", "K": "๋", "L": "ซ", ":": ".",
  '"': "ฅ",

  // Bottom row (no shift)
  "z": "ผ", "x": "ป", "c": "แ", "v": "อ", "b": "ิ",
  "n": "ื", "m": "ท", ",": "ม", ".": "ใ", "/": "ฝ",

  // Bottom row (shift)
  "Z": "ฦ", "X": "ฐ", "C": "ฎ", "V": "ฑ", "B": "ั",
  "N": "ฉ", "M": "ฒ", "<": "ฬ", ">": "ฦ", "?": "ฅ",
};

// Reverse mapping: Thai → English
const thaiToEng = Object.fromEntries(
  Object.entries(engToThai).map(([k, v]) => [v, k])
);

// ---------------------------------------------------------------------------
// Caps Lock fix — Kedmanee letter keys only (a-z positions)
// Caps Lock ทำให้ปุ่มตัวอักษรทุกตัวส่งออก Shift layer แทน Normal layer
// เช่น กด 'a' ตอน Caps Lock → ได้ ฉ  (shift of a) แทนที่จะได้ ฟ (normal of a)
// Map นี้คือ: shift_char → normal_char  (ใช้แก้ข้อความที่พิมพ์ตอน Caps Lock ติด)
//
// หมายเหตุ: symbol keys (;  '  [  ]  \  ,  .  /) ไม่ได้รับผลจาก Caps Lock
// ---------------------------------------------------------------------------

// Letter key pairs: [normalChar, shiftChar] ตามลำดับ Kedmanee
const LETTER_KEY_PAIRS = [
  ["ๆ", "๐"],  // q / Q
  ["ไ", "ฑ"],  // w / W
  ["ำ", "ธ"],  // e / E
  ["พ", "ณ"],  // r / R
  ["ะ", "ฯ"],  // t / T
  ["ั", "ญ"],  // y / Y
  ["ี", "ฐ"],  // u / U  (ฐ also on X but u wins)
  ["ร", "ฅ"],  // i / I
  ["น", "ฤ"],  // o / O
  ["ย", "ฆ"],  // p / P
  ["ฟ", "ฉ"],  // a / A  (ฉ also on N but a wins)
  ["ห", "ฮ"],  // s / S
  ["ก", "ึ"],  // d / D
  ["ด", "็"],  // f / F
  // g / G: เ → เ  (same char, skip)
  ["้", "่"],  // h / H
  ["่", "๊"],  // j / J
  ["า", "๋"],  // k / K
  ["ส", "ซ"],  // l / L
  ["ผ", "ฦ"],  // z / Z
  // x / X: ฐ already mapped from u/U
  ["แ", "ฎ"],  // c / C
  // v / V: ฑ already mapped from w/W
  ["ิ", "ั"],  // b / B  (ั also on Y normal, but b-shift wins)
  // n / N: ฉ already mapped from a/A
  ["ท", "ฒ"],  // m / M
];

// Build the fix maps
const capsToNormal = {}; // shift_char → normal_char  (แก้ Caps Lock ติด)
const normalToCaps = {}; // normal_char → shift_char  (แก้ Caps Lock ติดตอนกด Shift ด้วย)

for (const [normal, shift] of LETTER_KEY_PAIRS) {
  if (normal === shift) continue;
  if (!capsToNormal[shift]) capsToNormal[shift] = normal;
  if (!normalToCaps[normal]) normalToCaps[normal] = shift;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isMostlyThai(text) {
  const relevant = [...text].filter((c) => c.trim().length > 0);
  if (!relevant.length) return false;
  const thaiCount = relevant.filter((c) => c >= "\u0E00" && c <= "\u0E7F").length;
  return thaiCount / relevant.length > 0.5;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * แก้ข้อความที่พิมพ์ตอน Caps Lock ติดอยู่ (ภาษาไทย)
 * @param {string} text
 * @returns {{ result: string, direction: string }}
 */
function fixCapsLock(text) {
  const result = [...text].map((c) => capsToNormal[c] ?? c).join("");
  return { result, direction: "caps-fix" };
}

/**
 * Auto-detect keyboard direction and convert
 * - ถ้าข้อความเป็นภาษาไทย → แก้ Caps Lock
 * - ถ้าข้อความเป็น ASCII    → แก้ keyboard layout (EN↔TH)
 * @param {string} text
 * @returns {{ result: string, direction: string }}
 */
function detectAndConvert(text) {
  // Thai text → Caps Lock fix
  if (isMostlyThai(text)) {
    return fixCapsLock(text);
  }

  // ASCII text → keyboard layout fix
  let engCount = 0;
  let thaiCount = 0;

  for (const c of text) {
    if (engToThai[c]) engCount++;
    if (thaiToEng[c]) thaiCount++;
  }

  if (engCount === 0 && thaiCount === 0) {
    return { result: text, direction: "none" };
  }

  if (engCount >= thaiCount) {
    return {
      result: [...text].map((c) => engToThai[c] ?? c).join(""),
      direction: "eng→thai",
    };
  } else {
    return {
      result: [...text].map((c) => thaiToEng[c] ?? c).join(""),
      direction: "thai→eng",
    };
  }
}

module.exports = { detectAndConvert, fixCapsLock };
