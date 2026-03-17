# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Discord bot แปลงข้อความที่พิมพ์ผิด keyboard layout (ไทย ↔ อังกฤษ Kedmanee) รองรับ 3 กรณี:
1. พิมพ์ภาษาอังกฤษในขณะที่ keyboard ตั้งอยู่ที่ภาษาไทย (eng→thai)
2. พิมพ์ภาษาไทยในขณะที่ keyboard ตั้งอยู่ที่ภาษาอังกฤษ (thai→eng)
3. พิมพ์ภาษาไทยตอน Caps Lock ติดอยู่ (caps-fix)

## Running the Bot

```bash
# ติดตั้ง dependencies
npm install

# สร้างไฟล์ .env จาก .env.example และใส่ token
cp .env.example .env

# รัน bot
npm start
```

## Architecture

### Entry Point: `index.js`
- สร้าง Discord client ด้วย intents: `Guilds`, `GuildMessages`, `MessageContent`
- Bot จะ respond เมื่อมีคน @mention bot ในขณะที่ reply ข้อความอื่น
- เรียก `detectAndConvert()` จาก `services/keyboard.js` แล้วส่งผลกลับ

### Core Logic: `services/keyboard.js`
- `engToThai` map: ตัวอักษร ASCII → อักษรไทย (Kedmanee layout)
- `thaiToEng` map: สร้างจาก `engToThai` แบบ reverse
- `LETTER_KEY_PAIRS` + `capsToNormal`/`normalToCaps` maps: สำหรับแก้ปัญหา Caps Lock
- `isMostlyThai(text)`: ตรวจว่าข้อความส่วนใหญ่เป็นภาษาไทย (Unicode U+0E00-U+0E7F)
- `detectAndConvert(text)`: ฟังก์ชันหลัก — auto-detect แล้ว convert, return `{ result, direction }`
- `fixCapsLock(text)`: แก้ข้อความไทยที่พิมพ์ตอน Caps Lock เปิดอยู่

### Web Server (ใน `index.js`)
- HTTP server รันบน `process.env.PORT || 3000`
- `GET /` และ `GET /about` → serve `public/index.html` และ `public/about.html`
- `POST /api/convert` → รับ `{ text }` ใน JSON body, ส่งคืน `{ result, direction }`

## Environment Variables

| Variable    | Description              |
|-------------|--------------------------|
| `BOT_TOKEN` | Discord bot token        |
| `PORT`      | HTTP server port (default: 3000) |
