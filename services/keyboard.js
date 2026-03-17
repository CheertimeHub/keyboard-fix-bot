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
    // Row 1 (1 2 3 4 5 6 7 8 9 0 - =)
  "+": "ๅ",  // 1+CL → 1
  '๑': "/",  // 2+CL → 2
  "๒": "-",  // 3+CL → 3
  "๓": "ภ",  // 4+CL → 4
  "๔": "ถ",  // 5+CL → 5
  "ู": "ุ",   // 6+CL → 6 (Shift+6 with CapsLock → fix to sara u)
  "฿": "ึ",  // 7+CL → 7
  "๕": "ค",  // 8+CL → 8
  "๖": "ต",  // 9+CL → 9
  "๗": "จ",  // 0+CL → 0
  "๘": "ข",  // -+CL → -
  "๙": "ช",  // =+CL → =

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
  "็": "้",  // h+CL → h (caps layer ็ → intended ้)
  "้": "็",  // Shift+h with CapsLock → ้ (normal layer), intended ็
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
  "์": "ื",  // n+CL → n (caps layer ์ → intended ื)
  "ื": "์",  // Shift+n with CapsLock → ื (normal layer), intended ์
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

// Single-char caps-lock indicator set (excludes multi-char keys like "ํู")
const capsKeys = new Set(Object.keys(capsToNormal).filter((k) => k.length === 1));

// ---------------------------------------------------------------------------
// Thai dictionary for disambiguating ambiguous chars (็/้, ์/ื)
// ---------------------------------------------------------------------------
const { maiTaiku, karan, maiTho, maiIi } = require("./thaiWords.json");
const maiTaikuSet = new Set(maiTaiku); // words containing ็
const karanSet    = new Set(karan);    // words containing ์
const maiThoSet   = new Set(maiTho);   // words containing ้  (guard)
const maiIiSet    = new Set(maiIi);    // words containing ี  (guard)

/**
 * หลังจาก caps-fix แล้ว ยังมีกรณีที่ ้ หรือ ื อาจเป็น ็ หรือ ์ แทน
 * Logic: replace ้→็ เฉพาะเมื่อ:
 *   1. substring รอบๆ ด้วย ็ ตรงกับ maiTaikuSet
 *   2. AND substring รอบๆ ด้วย ้ ไม่ตรงกับ maiThoSet (เพื่อป้องกัน false positive)
 * เช่น แป้น → ้ อยู่ใน maiThoSet → ไม่แทน   ล้อค → ้ ไม่อยู่ใน maiThoSet + ็ อยู่ → แทน
 */
function resolveByDict(text) {
  const chars = [...text];
  const result = [...chars];

  for (let i = 0; i < chars.length; i++) {
    // [replacement, targetSet, guardSet, minGuardLen]
    const swaps = chars[i] === "้" ? ["็", maiTaikuSet, maiThoSet, 4]
                : chars[i] === "ื" ? ["์", karanSet,    null,      0]
                : chars[i] === "ี" ? ["์", karanSet,    maiIiSet,  3]
                : null;
    if (!swaps) continue;

    const [replacement, targetSet, guardSet, minGuardLen] = swaps;

    const start = Math.max(0, i - 6);
    const end   = Math.min(chars.length, i + 7);
    const temp  = [...result];
    temp[i] = replacement;

    // หา Thai-char run ที่คลุม i ใน temp (version ็/์)
    let lo = i, hi = i;
    while (lo > start && temp[lo - 1] >= "\u0E00" && temp[lo - 1] <= "\u0E7F") lo--;
    while (hi < end - 1 && temp[hi + 1] >= "\u0E00" && temp[hi + 1] <= "\u0E7F") hi++;

    // ตรวจ guard: ถ้ามี substring ด้วย ้ อยู่ใน guardSet → ไม่แทน
    if (guardSet) {
      let guarded = false;
      for (let s = lo; s <= i && !guarded; s++) {
        for (let e = i + 1; e <= hi + 1 && !guarded; e++) {
          const sub = result.slice(s, e).join(""); // version ้/ี (original)
          if (sub.length >= minGuardLen && guardSet.has(sub)) guarded = true;
        }
      }
      if (guarded) continue;
    }

    // ตรวจ target: ถ้ามี substring ด้วย ็/์ อยู่ใน targetSet → แทน
    let found = false;
    for (let s = lo; s <= i && !found; s++) {
      for (let e = i + 1; e <= hi + 1 && !found; e++) {
        const sub = temp.slice(s, e).join("");
        if (targetSet.has(sub)) found = true;
      }
    }

    if (found) result[i] = replacement;
  }

  return result.join("");
}

/**
 * แก้ข้อความที่พิมพ์ตอน Caps Lock ติดอยู่ (ภาษาไทย)
 * ตรวจสอบเป็นคำๆ — แปลงเฉพาะคำที่มี caps-lock chars เกินครึ่ง
 * @param {string} text
 * @returns {{ result: string, direction: string }}
 */
function fixCapsLock(text) {
  // split preserving spaces so we can rejoin exactly
  const result = text.split(/( +)/).map((token) => {
    if (!token.trim()) return token;

    const chars = [...token];
    let capsCount = 0;
    let normalThaiCount = 0;

    for (const c of chars) {
      if (capsKeys.has(c)) capsCount++;
      else if (c >= "\u0E00" && c <= "\u0E7F") normalThaiCount++;
    }

    const total = capsCount + normalThaiCount;
    if (total > 0 && capsCount / total >= 0.5) {
      return chars.map((c) => capsToNormal[c] ?? c).join("");
    }
    return token;
  }).join("");

  const resolved = resolveByDict(result);
  if (resolved === text) return { result: text, direction: "none" };
  return { result: resolved, direction: "caps-fix" };
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
