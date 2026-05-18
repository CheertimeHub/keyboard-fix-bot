# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Discord bot แปลงข้อความที่พิมพ์ผิด keyboard layout (ไทย ↔ อังกฤษ Kedmanee) รองรับ 3 กรณี:
1. พิมพ์ภาษาอังกฤษในขณะที่ keyboard ตั้งอยู่ที่ภาษาไทย (eng→thai)
2. พิมพ์ภาษาไทยในขณะที่ keyboard ตั้งอยู่ที่ภาษาอังกฤษ (thai→eng) — fallback หลัง caps-fix ไม่ได้ผล
3. พิมพ์ภาษาไทยตอน Caps Lock ติดอยู่ (caps-fix)

มี TTS session-based ที่ใช้ Google Cloud Text-to-Speech (Chirp3-HD Sulafat) อ่านข้อความใน voice channel

## Running the Bot

```bash
npm install
cp .env.example .env   # ใส่ BOT_TOKEN และ GOOGLE_CREDENTIALS_JSON ใน .env
npm start
```

เทสต์ในเครื่องโดยไม่ชนกับ Render: `$env:PORT=3001; npm start`

Google credentials: วางไฟล์ `xevra-tts-functions-f5a8e0b7b1f1.json` ไว้ใน root — โค้ดอ่านจากไฟล์นี้ก่อน แล้วค่อย fallback ไป `GOOGLE_CREDENTIALS_JSON` env var

## Architecture

### Entry Point: `index.js`

Bot สร้าง Discord client ด้วย intents: `Guilds`, `GuildMessages`, `MessageContent`, `GuildMessageReactions` และ Partials: `Message`, `Reaction`, `Channel` (จำเป็นสำหรับ reaction บนข้อความเก่า)

Bot ตอบสนองใน 2 ทาง:

**@mention:**
- **มี reply**: ดึงข้อความต้นฉบับ → `detectAndConvert()` → ส่งผลเป็น code block ตอบกลับข้อความต้นฉบับ
- **ไม่มี reply**: ลอง `parseAndExecute()` — ถ้าเป็น command (ทอยเต๋า/สุ่ม/เลือก) จะตอบกลับ ถ้าไม่ใช่ จะแนะนำให้ reply

**👁️‍🗨️ emoji reaction** (ไม่ต้อง @mention):
- React ด้วย `👁️‍🗨️` บนข้อความไหนก็ได้ → bot แปลงข้อความนั้นทันที
- ใช้ Partials เพราะ reaction บน uncached message ต้องการ `reaction.fetch()` ก่อน

Web server รันคู่กันบน `process.env.PORT || 3000`

### Core Logic: `services/keyboard.js`

**Maps:**
- `engToThai`: ASCII → Thai (Kedmanee layout) ครอบคลุม unshifted, shifted, และ symbol keys
- `thaiToEng`: สร้างจาก `engToThai` แบบ reverse อัตโนมัติ (บาง Thai char ชนกันถ้า ASCII หลายตัว map ไปตัวเดียว)
- `capsToNormal`: Thai caps-lock char → Thai normal char (Windows Kedmanee layer 3)

**ฟังก์ชันหลัก:**
- `isMostlyThai(text)`: ถ้า >50% ของ non-whitespace chars อยู่ใน U+0E00–U+0E7F → Thai
- `detectAndConvert(text)`: entry point — ถ้า Thai → ลอง `fixCapsLock()` ก่อน ถ้า none → fallback `thaiToEng`, ถ้า ASCII → นับ engToThai vs thaiToEng hits แล้วเลือก direction
- `fixCapsLock(text)`: แก้ caps-lock token-by-token (split by spaces) — แปลงเฉพาะ token ที่มี caps chars เกิน 50%
- `resolveByDict(text)`: ใช้ Thai dictionary (`thaiWords.json`) แก้ความคลุมเครือของ ็/้ และ ์/ื/ี หลัง caps-fix

**Dictionary disambiguation (`services/thaiWords.json`):**
- มี 4 sets: `maiTaiku` (คำที่มี ็), `karan` (คำที่มี ์), `maiTho` (คำที่มี ้), `maiIi` (คำที่มี ี)
- ใช้ sliding window (±6 chars) หา Thai substring ที่ match dictionary ก่อนตัดสินว่าจะแทนหรือไม่
- Logic: replace ้→็ เฉพาะเมื่อ substring+็ อยู่ใน maiTaikuSet AND substring+้ ไม่อยู่ใน maiThoSet (guard ป้องกัน false positive)

### Commands: `services/commands.js`

Bot รองรับ commands ที่ใช้ @mention โดยตรง (ไม่ต้อง reply):

- **ทอยเต๋า**: รองรับ RPG dice notation `[N#][M]dS[+/-mod][kh/kl/dh/dl N][op N]`
  - ตัวอย่าง: `ทอย 2d6+3`, `ทอย 4d6kh3`, `ทอย 3#d20>=15`, `ทอย โจมตี d20`
  - fallback Thai keywords: "ทอยเต๋า 6 หน้า", "ทอย 3 ลูก"
- **เหรียญ**: "ทอยเหรียญ" / "หัวก้อย" → หัว/ก้อย
- **สุ่มเลข**: "สุ่ม 1-100", "สุ่ม 50"
- **เลือก**: "เลือก A หรือ B หรือ C", "ระหว่าง A กับ B", "อะไรดี X Y Z"

`parseAndExecute(rawText)` strips mentions + filler words แล้วลอง `executeCoin → executeDice → executeRandom → executeChoose` ตามลำดับ

### Web Server (ใน `index.js`)

| Route | Description |
|---|---|
| `GET /` | `public/index.html` |
| `GET /about` | `public/about.html` |
| `GET /how-to-use` | `public/how-to-use.html` |
| `GET /community` | `public/community.html` — Community landing |
| `GET /community/rnc` | `public/community/rnc.html` — RNC hub + mini-game |
| `GET /community/rnc/create` | `public/community/rnc/create.html` — Character card wizard |
| `GET /manifest.json` | PWA manifest จาก `public/manifest.json` |
| `GET /assets/*` | Static assets (images, etc.) จาก `public/assets/` |
| `GET /api/bot-info` | ส่งคืน `{ avatar, name }` ของ bot |
| `POST /api/convert` | รับ `{ text }`, ส่งคืน `{ result, direction }` |

### Community Pages (`public/community/`)

**`public/community/rnc.html`** — RNC hub (pure frontend, dark art deco theme)
- Intro animation → hub panel (scrollable `position: fixed`)
- **Hanging lamp** ซ่อนอยู่หลัง triangle pull-tab (`#lamp-tab`) ที่ top center — กดสามเหลี่ยมเพื่อเรียกโคมออกมา
- คลิกโคมไฟ → ปิดไฟ → เริ่ม mini-game **"Find the Labuu"**
- **Flashlight cursor**: `radial-gradient` overlay + custom diamond cursor ทำงานเมื่อ `body.dark-mode` — ต้องใช้ `document.body.classList.contains("dark-mode")` ไม่ใช่ local variable
- **Mini-game**: ลาบู้ 7 ตัว spawn ในพื้นที่ `GAME_TOP = 52px` ถึง `window.innerHeight` — ใช้ `gameArea()` ทุกที่เพื่อให้ตำแหน่งถูกต้อง
  - ลาบู้มี behavior: dodger (หลบเมาส์, cooldown-based), peeker (แอบโผล่ขอบจอ), hover-fleeer (หนีก่อนคลิก, 35% chance)
  - ลาบู้ปลอม 2 ตัว: คลิกแล้วหนีหรือ wiggle แต่ไม่นับ counter
  - Counter + Timer (60s) แสดงระหว่างเล่น
  - หมดเวลา → jumpscare (ลาบู้ตัวใหญ่พุ่งเข้ากลางจอ scale 130vw/vh) → ปุ่มหัวใจ SVG เต้น → กลับสู่หน้าปกติ
  - เก็บครบ 7 ตัว → win screen → ไฟกลับมา

**`public/community/rnc/create.html`** — Character card wizard
- Wizard ถามคำถามทีละข้อ → generate character card
- "เริ่มใหม่" → `window.location.href = "/community/rnc"`
- Label ใน wizard topbar แสดงเป็น "Reverse" (ไม่ใช่ "RNC")

**Design system** (ใช้ร่วมกันทุกหน้า community):
- Background: `#08080f` dark near-black
- Accent: `--gold: #c9a96e`, `--gold-l: #e8cf9a`
- Font: `Cinzel` (serif headers), `Sarabun` (Thai body text)
- Art deco corners, deco dividers ผ่าน `.corner`, `.deco-divider`, `.deco-diamond`

### TTS: `services/tts.js`

- เสียง default: `th-TH-Chirp3-HD-Sulafat` (ไทย) และ `en-US-Chirp3-HD-Sulafat` (อังกฤษ) แต่ตอนนี้ใช้เสียงไทยตลอด (`getVoiceConfig(guildId, "th")`) เพราะ user ต้องการให้อังกฤษออกเสียงสำเนียงไทย
- audio encoding: `OGG_OPUS` + `StreamType.OggOpus` — ไม่ต้องการ FFmpeg
- `preprocessText(text)`: ลบ URL, แปลง Discord custom emoji → ชื่อ, ลบ mention/spoiler/code block, แปลง `555`/`HAHAHA`/`lol` → `ฮ่าๆ`, ตัดที่ 200 chars, ถ้าขึ้นต้นด้วย `-` → return null

**TTS Session (ใน `index.js`):**
- `ttsSessions` Map: `guildId → { connection, player, textChannelId, voiceChannelId, queue, speaking }`
- Commands: `@บอท join` (เข้า VC), `@บอท leave`/`หยุด` (ออก VC), `@บอท voice` (ดู/เปลี่ยนเสียง)
- Auto-read: ทุก message ใน textChannel ที่ join ไว้จะถูกอ่านอัตโนมัติ (ยกเว้น mention บอท)
- mention บอทตรวจก่อน auto-read เสมอ เพื่อให้ `leave` command ทำงานได้แม้อยู่ใน TTS channel

## Environment Variables

| Variable | Description |
|---|---|
| `BOT_TOKEN` | Discord bot token |
| `GOOGLE_CREDENTIALS_JSON` | Google Cloud service account JSON (stringified) |
| `PORT` | HTTP server port (default: 3000) |

## Deployment

Bot deploy อยู่บน [Render](https://keyboard-fix-bot.onrender.com) — web UI เข้าได้ที่ URL นั้น
