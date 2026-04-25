// rnc-game.js — Mini-game: Find the Labuu
// ต้องการ: mx, my (global mouse coords จาก rnc.html)

let labuuFound = 0;
let labuuTimer = null;
let labuuTimeLeft = 60;
let labuuBehaviorIntervals = [];

const GAME_TOP = 52;

function gameArea() {
  return {
    w: window.innerWidth,
    h: window.innerHeight - GAME_TOP,
    top: GAME_TOP,
  };
}

function startLabuuGame() {
  document.body.classList.add("dark-mode");

  const overlay = document.createElement("div");
  overlay.id = "labuu-intro";
  overlay.innerHTML = `
    <div class="labuu-intro-box">
      <div class="corner corner-tl"></div><div class="corner corner-tr"></div>
      <div class="corner corner-bl"></div><div class="corner corner-br"></div>
      <div class="labuu-intro-eyebrow">◆ Mini Game ◆</div>
      <div class="labuu-intro-title">FIND THE LABUU</div>
      <img class="labuu-intro-img" src="/assets/Labuu.png" alt="Labuu">
      <div class="labuu-intro-desc">
        ค้นหา <strong>ลาบู้ 7 ตัว</strong> ที่ซ่อนอยู่ในความมืด<br>
        ใช้ไฟฉายส่องหาและคลิกที่ลาบู้<br>
        เมื่อเจอครบทุกตัว หน้าจอจะกลับสู่สภาพปกติ
      </div>
      <div class="labuu-intro-hint">[ คลิกเพื่อเริ่ม ]</div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.addEventListener("click", () => {
    overlay.classList.add("exiting");
    setTimeout(() => { overlay.remove(); placeLabuus(); }, 420);
  }, { once: true });
}

function placeLabuus() {
  labuuFound = 0;
  const total = 7;
  const { w, h, top } = gameArea();
  const size = 46;

  const blocker = document.createElement("div");
  blocker.id = "labuu-blocker";
  document.body.appendChild(blocker);

  const zones = [
    { x: [4, 22],  y: [5, 40] },
    { x: [78, 94], y: [5, 40] },
    { x: [38, 62], y: [3, 28] },
    { x: [5, 26],  y: [52, 85] },
    { x: [74, 94], y: [52, 85] },
    { x: [36, 64], y: [58, 88] },
    { x: [22, 78], y: [35, 60] },
  ];

  zones.forEach((zone) => {
    const x = (zone.x[0] + Math.random() * (zone.x[1] - zone.x[0])) / 100 * w;
    const y = top + (zone.y[0] + Math.random() * (zone.y[1] - zone.y[0])) / 100 * h;
    const el = document.createElement("div");
    el.className = "labuu";
    el.style.left = Math.min(x, w - size - 8) + "px";
    el.style.top  = Math.min(y, top + h - size - 8) + "px";
    el.style.transform = `rotate(${(Math.random() - 0.5) * 28}deg)`;
    el.innerHTML = `<img src="/assets/Labuu.png" alt="Labuu">`;
    el.addEventListener("click", () => collectLabuu(el, total));
    document.body.appendChild(el);

    const roll = Math.random();
    if (roll < 0.30) spawnDodger(el);
    else if (roll < 0.55) spawnPeeker(el, zone);
    else if (roll < 0.70) spawnHoverFleeer(el);
  });

  // ลาบู้ปลอม 2 ตัว
  for (let f = 0; f < 2; f++) {
    const fx = (10 + Math.random() * 80) / 100 * w;
    const fy = top + (10 + Math.random() * 80) / 100 * h;
    const fake = document.createElement("div");
    fake.className = "labuu labuu-fake";
    fake.style.left = Math.min(fx, w - size - 8) + "px";
    fake.style.top  = Math.min(fy, top + h - size - 8) + "px";
    fake.style.transform = `rotate(${(Math.random() - 0.5) * 28}deg)`;
    fake.innerHTML = `<img src="/assets/Labuu.png" alt="Labuu">`;
    fake.addEventListener("click", () => fakeCaught(fake));
    document.body.appendChild(fake);
  }

  const counter = document.createElement("div");
  counter.id = "labuu-counter";
  counter.innerHTML = `<img src="/assets/Labuu.png" alt=""> <span id="labuu-count-text">0 / ${total}</span>`;
  document.body.appendChild(counter);

  labuuTimeLeft = 60;
  const timerEl = document.createElement("div");
  timerEl.id = "labuu-timer";
  timerEl.textContent = `⏱ ${labuuTimeLeft}s`;
  document.body.appendChild(timerEl);

  labuuTimer = setInterval(() => {
    labuuTimeLeft--;
    const t = document.getElementById("labuu-timer");
    if (t) {
      t.textContent = `⏱ ${labuuTimeLeft}s`;
      if (labuuTimeLeft <= 10) t.classList.add("urgent");
    }
    if (labuuTimeLeft <= 0) {
      clearInterval(labuuTimer);
      labuuTimer = null;
      triggerJumpscare();
    }
  }, 1000);
}

/* ── ลาบู้หลบเมาส์ ── */
function spawnDodger(el) {
  const size = 46;
  const dodgeRadius = 180;

  function dodge() {
    if (!document.body.contains(el)) return;
    const { w, h, top } = gameArea();
    const ex = parseFloat(el.style.left) + size / 2;
    const ey = parseFloat(el.style.top)  + size / 2;
    const dx = mx - ex, dy = my - ey;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < dodgeRadius) {
      const angle = Math.atan2(dy, dx) + Math.PI + (Math.random() - 0.5) * 1.2;
      const jump  = 90 + Math.random() * 80;
      const nx = Math.max(4,       Math.min(w - size - 4,       ex + Math.cos(angle) * jump - size / 2));
      const ny = Math.max(top + 4, Math.min(top + h - size - 4, ey + Math.sin(angle) * jump - size / 2));
      el.classList.add("dodging");
      el.style.left = nx + "px";
      el.style.top  = ny + "px";
      setTimeout(() => el.classList.remove("dodging"), 300);
    }
  }

  const id = setInterval(dodge, 120);
  labuuBehaviorIntervals.push(id);
}

/* ── ลาบู้แอบมอง ── */
function spawnPeeker(el, zone) {
  const side = Math.floor(Math.random() * 4);
  const size = 46;
  const hidePos = getPeekHidePos(el, side, size);
  el.style.left = hidePos.x + "px";
  el.style.top  = hidePos.y + "px";
  el.classList.add("peeking", "peek-hidden");

  function doPeek() {
    if (!document.body.contains(el)) return;
    const peekPos = getPeekShowPos(side, size);
    el.style.left = peekPos.x + "px";
    el.style.top  = peekPos.y + "px";
    el.classList.remove("peek-hidden");

    const showTime = 1200 + Math.random() * 800;
    setTimeout(() => {
      if (!document.body.contains(el)) return;
      el.classList.add("peek-hidden");
      el.style.left = hidePos.x + "px";
      el.style.top  = hidePos.y + "px";
    }, showTime);
  }

  const firstDelay = 1000 + Math.random() * 2000;
  setTimeout(() => {
    if (!document.body.contains(el)) return;
    doPeek();
    const id = setInterval(() => {
      if (!document.body.contains(el)) { clearInterval(id); return; }
      doPeek();
    }, 2500 + Math.random() * 2500);
    labuuBehaviorIntervals.push(id);
  }, firstDelay);
}

function getPeekHidePos(el, side, size) {
  const { w, h, top } = gameArea();
  const cx = parseFloat(el.style.left) + size / 2;
  const cy = parseFloat(el.style.top)  + size / 2;
  switch (side) {
    case 0: return { x: cx,       y: top - size - 10 };
    case 1: return { x: w + 10,   y: cy };
    case 2: return { x: cx,       y: top + h + 10 };
    case 3: return { x: -size-10, y: cy };
  }
}

function getPeekShowPos(side, size) {
  const { w, h, top } = gameArea();
  const rand = Math.random();
  switch (side) {
    case 0: return { x: rand * (w - size),    y: top - size * 0.35 };
    case 1: return { x: w - size * 0.65,      y: top + rand * (h - size) };
    case 2: return { x: rand * (w - size),    y: top + h - size * 0.65 };
    case 3: return { x: -size * 0.35,         y: top + rand * (h - size) };
  }
}

/* ── ลาบู้หนีตอน hover ── */
function spawnHoverFleeer(el) {
  const size = 46;
  const fleeRadius = 70;
  let cooldown = false;

  function checkHover() {
    if (!document.body.contains(el) || cooldown) return;
    const { w, h, top } = gameArea();
    const ex = parseFloat(el.style.left) + size / 2;
    const ey = parseFloat(el.style.top)  + size / 2;
    const dx = mx - ex, dy = my - ey;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < fleeRadius && Math.random() < 0.35) {
      cooldown = true;
      const angle = Math.atan2(dy, dx) + Math.PI + (Math.random() - 0.5) * 0.8;
      const jump  = 120 + Math.random() * 100;
      const nx = Math.max(4,       Math.min(w - size - 4,       ex + Math.cos(angle) * jump - size / 2));
      const ny = Math.max(top + 4, Math.min(top + h - size - 4, ey + Math.sin(angle) * jump - size / 2));
      el.style.transition = "left 0.15s cubic-bezier(0.2,1.8,0.5,1), top 0.15s cubic-bezier(0.2,1.8,0.5,1)";
      el.style.left = nx + "px";
      el.style.top  = ny + "px";
      setTimeout(() => { el.style.transform = `rotate(${(Math.random()-0.5)*30}deg) scale(1.1)`; }, 160);
      setTimeout(() => { el.style.transform = `rotate(${(Math.random()-0.5)*20}deg) scale(1)`;   }, 320);
      setTimeout(() => { cooldown = false; }, 1500 + Math.random() * 1500);
    }
  }

  const id = setInterval(checkHover, 120);
  labuuBehaviorIntervals.push(id);
}

/* ── ลาบู้ปลอม ── */
function fakeCaught(el) {
  if (el.classList.contains("caught") || el.classList.contains("fake-fleeing")) return;
  if (Math.random() < 0.4) {
    el.classList.add("fake-laugh");
    setTimeout(() => el.classList.remove("fake-laugh"), 500);
    return;
  }
  el.classList.add("fake-laugh");
  setTimeout(() => {
    el.classList.remove("fake-laugh");
    el.classList.add("fake-fleeing");
    const { w, h, top } = gameArea();
    const size = 46;
    const nx = Math.max(4,       Math.min(w - size - 4,       Math.random() * w));
    const ny = Math.max(top + 4, Math.min(top + h - size - 4, top + Math.random() * h));
    el.style.left = nx + "px";
    el.style.top  = ny + "px";
    el.style.transform = `rotate(${(Math.random()-0.5)*30}deg)`;
    setTimeout(() => el.classList.remove("fake-fleeing"), 400);
  }, 500);
}

function collectLabuu(el, total) {
  if (el.classList.contains("caught") || el.classList.contains("found")) return;
  labuuFound++;
  document.getElementById("labuu-count-text").textContent = `${labuuFound} / ${total}`;
  el.classList.remove("peeking", "peek-hidden", "dodging");
  el.classList.add("caught");
  setTimeout(() => el.remove(), 600);
  if (labuuFound >= total) setTimeout(winLabuuGame, 700);
}

function cleanupGame() {
  if (labuuTimer) { clearInterval(labuuTimer); labuuTimer = null; }
  labuuBehaviorIntervals.forEach(id => clearInterval(id));
  labuuBehaviorIntervals = [];
  document.getElementById("labuu-blocker")?.remove();
  document.getElementById("labuu-counter")?.remove();
  document.getElementById("labuu-timer")?.remove();
  document.querySelectorAll(".labuu").forEach(el => el.remove());
}

function restoreFromGame() {
  document.body.classList.remove("dark-mode");
  const tab       = document.getElementById("lamp-tab");
  const container = document.getElementById("lamp-container");
  tab.classList.remove("scroll-hidden");
  tab.classList.remove("open");
  tab.classList.add("visible");
  container.classList.remove("scroll-hidden");
  container.classList.remove("revealed");
  labuuFound = 0;
}

function winLabuuGame() {
  cleanupGame();

  const win = document.createElement("div");
  win.id = "labuu-win";
  win.innerHTML = `
    <div class="labuu-win-box">
      <img style="width:72px;height:72px;object-fit:contain;filter:drop-shadow(0 0 20px rgba(201,169,110,0.6))" src="/assets/Labuu.png" alt="">
      <div class="labuu-win-title">เจอครบแล้ว!</div>
      <div class="labuu-win-sub">ลาบู้ทั้ง 7 ตัวถูกพบแล้ว — ไฟกำลังจะกลับมา</div>
    </div>`;
  document.body.appendChild(win);

  setTimeout(() => {
    win.remove();
    restoreFromGame();
  }, 2400);
}

function triggerJumpscare() {
  cleanupGame();

  const flash = document.createElement("div");
  flash.id = "labuu-flash";
  document.body.appendChild(flash);
  document.body.classList.add("jumpscare-shake");

  setTimeout(() => {
    flash.remove();
    document.body.classList.remove("jumpscare-shake");
    document.body.classList.remove("dark-mode");

    const el = document.createElement("div");
    el.className = "scare-labuu";
    el.innerHTML = `<img src="/assets/Labuu.png" alt="">`;
    document.body.appendChild(el);

    setTimeout(() => {
      el.classList.add("dripping");
      setTimeout(() => {
        el.remove();
        showHeartButton();
      }, 1000);
    }, 2000);

  }, 180);
}

function showHeartButton() {
  const heartWrap = document.createElement("div");
  heartWrap.id = "labuu-heart";
  heartWrap.innerHTML = `
    <button class="heart-btn" onclick="returnFromHeart()">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 15"><path fill="currentColor" d="M6.765 5.235a1.79 1.79 0 1 0-2.53 2.53L7.5 11.03l3.265-3.265a1.79 1.79 0 0 0-2.53-2.53L7.5 5.97z"/></svg>
    </button>
  `;
  document.body.appendChild(heartWrap);
}

function returnFromHeart() {
  document.getElementById("labuu-heart")?.remove();
  restoreFromGame();
}
