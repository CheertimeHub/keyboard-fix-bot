// services/commands.js
// Natural language command parser (keyword + regex, no AI needed)

// ---------------------------------------------------------------------------
// Dice — RPG notation parser
// Supports: [N#][M]dS[+/-mod][kh/kl/dh/dl N][</>/<=/>=/= N]
// ---------------------------------------------------------------------------

function parseDiceNotation(raw) {
  let str = raw.trim().replace(/\s+/g, "").toLowerCase();

  // Repeat prefix: N#
  let repeat = 1;
  const rMatch = str.match(/^(\d+)#/);
  if (rMatch) {
    repeat = Math.min(parseInt(rMatch[1]), 20);
    str = str.slice(rMatch[0].length);
  }

  // Comparison suffix: <N >N <=N >=N =N
  let cmpOp = null, cmpVal = null;
  const cMatch = str.match(/([<>]=?|=)(\d+)$/);
  if (cMatch) {
    cmpOp = cMatch[1];
    cmpVal = parseInt(cMatch[2]);
    str = str.slice(0, -cMatch[0].length);
  }

  // Keep/Drop suffix: kh/kl/dh/dl/k/d + N
  let keepMode = null, keepN = null;
  const kMatch = str.match(/([kd][hl]?)(\d+)$/i);
  if (kMatch) {
    keepMode = kMatch[1].toLowerCase();
    keepN = parseInt(kMatch[2]);
    str = str.slice(0, -kMatch[0].length);
    if (keepMode === "k") keepMode = "kh"; // k = keep highest
    if (keepMode === "d") keepMode = "dl"; // d = drop lowest
  }

  // Core: [M]dS[+/-mod...]
  const dMatch = str.match(/^(\d+)?d(\d+)((?:[+\-]\d+)*)$/);
  if (!dMatch) return null;

  const count = parseInt(dMatch[1]) || 1;
  const sides = parseInt(dMatch[2]);
  const modifier = (dMatch[3].match(/[+\-]\d+/g) || []).reduce((s, m) => s + parseInt(m), 0);

  if (sides < 2 || sides > 100000 || count < 1 || count > 100) return null;
  if (repeat < 1 || repeat > 20) return null;
  if (keepN && keepN >= count) return null;

  return { repeat, count, sides, modifier, keepMode, keepN, cmpOp, cmpVal };
}

function rollOnce(count, sides, modifier, keepMode, keepN) {
  const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
  const sorted = [...rolls].sort((a, b) => b - a); // high → low
  let active = [...rolls];

  if (keepMode && keepN) {
    if (keepMode === "kh") active = sorted.slice(0, keepN);
    else if (keepMode === "kl") active = sorted.slice(-keepN);
    else if (keepMode === "dh") active = sorted.slice(keepN);
    else if (keepMode === "dl") active = sorted.slice(0, sorted.length - keepN);
  }

  const sum = active.reduce((a, b) => a + b, 0) + modifier;
  return { rolls, sorted, active, sum };
}

function checkCmp(val, op, target) {
  if (op === "<") return val < target;
  if (op === ">") return val > target;
  if (op === "<=") return val <= target;
  if (op === ">=") return val >= target;
  if (op === "=") return val === target;
  return null;
}

function formatRoll({ count, modifier, keepMode, keepN, cmpOp, cmpVal }, { sorted, sum }) {
  let diceDisplay;

  if (keepMode && keepN) {
    // Show sorted high→low, strikethrough the dropped portion
    diceDisplay =
      "[" +
      sorted
        .map((r, i) => {
          const kept =
            keepMode === "kh" ? i < keepN :
            keepMode === "kl" ? i >= sorted.length - keepN :
            keepMode === "dh" ? i >= keepN :
            /* dl */            i < sorted.length - keepN;
          return kept ? `${r}` : `~~${r}~~`;
        })
        .join(", ") +
      "]";
  } else {
    diceDisplay = `[${sorted.join(", ")}]`;
  }

  const modStr =
    modifier > 0 ? ` + ${modifier}` : modifier < 0 ? ` - ${Math.abs(modifier)}` : "";

  if (cmpOp && cmpVal !== null) {
    const pass = checkCmp(sum, cmpOp, cmpVal);
    return `**${sum}** ${diceDisplay}${modStr} ${cmpOp} ${cmpVal} → ${pass ? "✓" : "✗"}`;
  }
  return `${diceDisplay}${modStr} = **${sum}**`;
}

function buildLabel({ repeat, count, sides, modifier, keepMode, keepN, cmpOp, cmpVal }) {
  return (
    `${count > 1 ? count : ""}d${sides}` +
    (keepMode ? keepMode + keepN : "") +
    (modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : "") +
    (cmpOp && cmpVal !== null ? `${cmpOp}${cmpVal}` : "")
  );
}

function executeDiceExpr(exprStr) {
  const parsed = parseDiceNotation(exprStr);
  if (!parsed) return null;

  const { repeat, count, sides, modifier, keepMode, keepN, cmpOp, cmpVal } = parsed;
  const label = buildLabel(parsed);

  if (repeat === 1) {
    const result = rollOnce(count, sides, modifier, keepMode, keepN);
    return `🎲 ${formatRoll(parsed, result)} (${label})`;
  }

  const lines = [`🎲 ${repeat}#${label}`];
  let successes = 0;
  for (let i = 0; i < repeat; i++) {
    const result = rollOnce(count, sides, modifier, keepMode, keepN);
    if (cmpOp && checkCmp(result.sum, cmpOp, cmpVal)) successes++;
    lines.push(`▸ ${formatRoll(parsed, result)}`);
  }
  if (cmpOp) lines.push(`Successes: **${successes}/${repeat}**`);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Dice — entry point (notation + Thai natural language fallback)
// ---------------------------------------------------------------------------

function findDiceNotation(text) {
  const m = text.match(/(?:\d+#)?(?:\d+)?d\d+(?:[+\-]\d+)*(?:[kd][hl]?\d+)?(?:[<>]=?\d+|=\d+)?/i);
  return m ? m[0] : null;
}

function executeDice(text) {
  // Try notation first
  const notation = findDiceNotation(text);
  if (notation) return executeDiceExpr(notation);

  // Thai keyword fallback
  if (!/ทอย|เต๋า/.test(text)) return null;
  if (!/ทอยเต๋า/.test(text) && !/\d/.test(text)) return null;

  const full = text.match(/(\d+)\s*(?:ลูก|ตัว|อัน).*?(\d+)\s*(?:หน้า|แต้ม)/);
  if (full) return executeDiceExpr(`${full[1]}d${full[2]}`);

  const sides = text.match(/(\d+)\s*(?:หน้า|แต้ม)/);
  if (sides) return executeDiceExpr(`d${sides[1]}`);

  const cnt = text.match(/(\d+)\s*(?:ลูก|ตัว|อัน|เต๋า)/);
  if (cnt) return executeDiceExpr(`${cnt[1]}d6`);

  return executeDiceExpr("d6");
}

// ---------------------------------------------------------------------------
// Coin flip
// ---------------------------------------------------------------------------

function executeCoin(text) {
  if (!/เหรียญ/.test(text)) return null;
  if (!/ทอย|สุ่ม|หัวก้อย/.test(text)) return null;
  return Math.random() < 0.5 ? "🪙 **หัว**" : "🪙 **ก้อย**";
}

// ---------------------------------------------------------------------------
// Random number
// ---------------------------------------------------------------------------

function executeRandom(text) {
  if (!/สุ่ม/.test(text)) return null;

  const range = text.match(/(\d+)\s*(?:-|ถึง|to|~)\s*(\d+)/);
  if (range) {
    let [a, b] = [parseInt(range[1]), parseInt(range[2])];
    const [min, max] = a < b ? [a, b] : [b, a];
    if (min === max) return "ต้องเป็นช่วงที่ต่างกันนะ 😅";
    return `🔢 สุ่ม ${min}-${max}: **${Math.floor(Math.random() * (max - min + 1)) + min}**`;
  }

  const single = text.match(/สุ่ม[^\d]*(\d+)/);
  if (single) {
    const max = parseInt(single[1]);
    if (max < 2) return "ตัวเลขน้อยเกินไปนะ 😅";
    return `🔢 สุ่ม 1-${max}: **${Math.floor(Math.random() * max) + 1}**`;
  }

  if (!/สุ่มเลข|สุ่มให้|สุ่มตัวเลข/.test(text)) return null;
  return `🔢 สุ่ม 1-100: **${Math.floor(Math.random() * 100) + 1}**`;
}

// ---------------------------------------------------------------------------
// Choose
// ---------------------------------------------------------------------------

function executeChoose(text) {
  if (!/เลือก/.test(text)) return null;

  let content = text.replace(/^.*?เลือก\s*(?:ให้(?:หน่อย)?|หน่อย|ระหว่าง|จาก|ว่า)?\s*/s, "");
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
