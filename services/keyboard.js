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

  // Top row (shift) — letters: CapsLock layer, symbols: Shift layer
  "Q": "๐", "W": '"',  "E": "ฎ", "R": "ฑ", "T": "ธ",
  "Y": "ํ", "U": "๊", "I": "ณ", "O": "ฯ", "P": "ญ",
  "{": "ฏ", "}": "โ", "|": "ฌ",

  // Middle row (no shift)
  "a": "ฟ", "s": "ห", "d": "ก", "f": "ด", "g": "เ",
  "h": "้", "j": "่", "k": "า", "l": "ส", ";": "ว",
  "'": "ง",

  // Middle row (shift)
  "A": "ฤ", "S": "ฆ", "D": "ฏ", "F": "โ", "G": "ฌ",
  "H": "็", "J": "๋", "K": "ษ", "L": "ศ", ":": "ซ",
  '"': ".",

  // Bottom row (no shift)
  "z": "ผ", "x": "ป", "c": "แ", "v": "อ", "b": "ิ",
  "n": "ื", "m": "ท", ",": "ม", ".": "ใ", "/": "ฝ",

  // Bottom row (shift) — letters: CapsLock layer, symbols: Shift layer
  "Z": "(", "X": ")", "C": "ฉ", "V": "ฮ", "B": "ฺ",
  "N": "์", "M": "?", "<": "ฬ", ">": "ฦ", "?": "ฅ",
};

// Reverse mapping: Thai → English
const thaiToEng = Object.fromEntries(
  Object.entries(engToThai).map(([k, v]) => [v, k])
);

// ---------------------------------------------------------------------------
// Caps Lock fix — Windows Thai Kedmanee keyboard
// Caps Lock activates a THIRD layer of rare characters (not the Shift layer).
// This map converts: caps_lock_char → intended_normal_char
// ---------------------------------------------------------------------------

const capsToNormal = {
  // Row 2 (q w e r t y u i o p [ ])
  "๐": "ๆ",  // q+CL → q
  '"': "ไ",  // w+CL → w
  "ฎ": "ำ",  // e+CL → e
  "ฑ": "พ",  // r+CL → r
  "ธ": "ะ",  // t+CL → t
  "ํ": "ั",  // y+CL → y
  "๊": "ี",  // u+CL → u
  "ณ": "ร",  // i+CL → i
  "ฯ": "น",  // o+CL → o
  "ญ": "ย",  // p+CL → p
  "ฐ": "บ",  // [+CL → [
  ",": "ล",  // ]+CL → ]

  // Row 3 (a s d f g h j k l ; ' \)
  "ฤ": "ฟ",  // a+CL → a
  "ฆ": "ห",  // s+CL → s
  "ฏ": "ก",  // d+CL → d
  "โ": "ด",  // f+CL → f
  "ฌ": "เ",  // g+CL → g
  "็": "้",  // h+CL → h
  "๋": "่",  // j+CL → j
  "ษ": "า",  // k+CL → k
  "ศ": "ส",  // l+CL → l
  "ซ": "ว",  // ;+CL → ;
  ".": "ง",  // '+CL → '
  "ฅ": "ฃ",  // \+CL → \

  // Row 4 (z x c v b n m , . /)
  "(": "ผ",  // z+CL → z
  ")": "ป",  // x+CL → x
  "ฉ": "แ",  // c+CL → c
  "ฮ": "อ",  // v+CL → v
  "ฺ": "ิ",  // b+CL → b
  "์": "ื",  // n+CL → n
  "?": "ท",  // m+CL → m
  "ฒ": "ม",  // ,+CL → ,
  "ฬ": "ใ",  // .+CL → .
  "ฦ": "ฝ",  // /+CL → /
};

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
