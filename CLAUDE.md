# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Discord bot แปลงข้อความที่พิมพ์ผิด keyboard layout (ไทย ↔ อังกฤษ Kedmanee) รองรับ 3 กรณี:
1. พิมพ์ภาษาอังกฤษในขณะที่ keyboard ตั้งอยู่ที่ภาษาไทย (eng→thai)
2. พิมพ์ภาษาไทยในขณะที่ keyboard ตั้งอยู่ที่ภาษาอังกฤษ (thai→eng)
3. พิมพ์ภาษาไทยตอน Caps Lock ติดอยู่ (caps-fix)

## Running the Bot

```bash
npm install
cp .env.example .env   # ใส่ BOT_TOKEN ใน .env
npm start
```

## Architecture

### Entry Point: `index.js`
- สร้าง Discord client ด้วย intents: `Guilds`, `GuildMessages`, `MessageContent`
- Bot respond เมื่อถูก @mention:
  - **มี reply**: ดึงข้อความต้นฉบับ → เรียก `detectAndConvert()` → ส่งผลกลับเป็น code block
  - **ไม่มี reply**: เรียก `parseAndExecute()` ก่อน — ถ้าเป็น command (ทอยเต๋า/สุ่ม/เลือก) จะตอบกลับ ถ้าไม่ใช่ จะแนะนำให้ reply
- รัน HTTP server คู่กันบน `process.env.PORT || 3000` สำหรับ web UI

### Core Logic: `services/keyboard.js`

**Maps:**
- `engToThai`: ASCII → Thai (Kedmanee layout), ครอบคลุมทั้ง unshifted, shifted, และ symbol keys
- `thaiToEng`: สร้างจาก `engToThai` แบบ reverse อัตโนมัติ
- `capsToNormal`: Thai caps-lock char → Thai normal char (Windows Kedmanee layer 3)

**ฟังก์ชันหลัก:**
- `isMostlyThai(text)`: ถ้า >50% ของ non-whitespace chars อยู่ใน U+0E00-U+0E7F → Thai
- `detectAndConvert(text)`: entry point — ถ้า Thai → `fixCapsLock()`, ถ้า ASCII → นับ engToThai vs thaiToEng hits แล้วเลือก direction
- `fixCapsLock(text)`: แก้ caps-lock token-by-token (split by spaces) — แปลงเฉพาะ token ที่มี caps chars เกิน 50%
- `resolveByDict(text)`: ใช้ Thai dictionary (`thaiWords.json`) แก้ความคลุมเครือของ ็/้ และ ์/ื/ี หลัง caps-fix

**Dictionary disambiguation (`services/thaiWords.json`):**
- มี 4 sets: `maiTaiku` (คำที่มี ็), `karan` (คำที่มี ์), `maiTho` (คำที่มี ้), `maiIi` (คำที่มี ี)
- ใช้ sliding window (±6 chars) หา Thai substring ที่ match dictionary ก่อนตัดสินว่าจะแทนหรือไม่

### Commands: `services/commands.js`

Bot รองรับ commands ที่ใช้ @mention โดยตรง (ไม่ต้อง reply):

- **ทอยเต๋า**: รองรับ RPG dice notation `[N#][M]dS[+/-mod][kh/kl/dh/dl N][op N]`
  - ตัวอย่าง: `ทอย 2d6+3`, `ทอย 4d6kh3`, `ทอย 3#d20>=15`
  - fallback Thai keywords: "ทอยเต๋า 6 หน้า", "ทอย 3 ลูก"
- **เหรียญ**: "ทอยเหรียญ" → หัว/ก้อย
- **สุ่มเลข**: "สุ่ม 1-100", "สุ่ม 50"
- **เลือก**: "เลือก A หรือ B หรือ C"

`parseAndExecute(rawText)` strips mentions แล้วลอง `executeCoin → executeDice → executeRandom → executeChoose` ตามลำดับ

### Web Server (ใน `index.js`)
- `GET /` → `public/index.html`
- `GET /about` → `public/about.html`
- `GET /how-to-use` → `public/how-to-use.html`
- `POST /api/convert` → รับ `{ text }`, ส่งคืน `{ result, direction }`

## Environment Variables

| Variable    | Description              |
|-------------|--------------------------|
| `BOT_TOKEN` | Discord bot token        |
| `PORT`      | HTTP server port (default: 3000) |

## Deployment

Bot deploy อยู่บน [Render](https://keyboard-fix-bot.onrender.com) — web UI เข้าได้ที่ URL นั้น
