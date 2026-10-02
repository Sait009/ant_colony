(() => {
  'use strict';

  /* ---------- Config (ปรับบาลานซ์ที่นี่) ---------- */
  const CFG = {
    world: 2400,
    start: { food: 50, twigs: 10, workers: 4, soldiers: 2 },
    baseCap: 10,
    capPerLevel: 8,
    maxNestLevel: 5,
    maxUpgrade: 5,
    eggInterval: 20,
    firstWave: 45,
    waveInterval: 40,
    winWave: 10,
    carryBase: 4,
    nodeRespawn: 18,
    maxNodes: 18,
    soldierDmg: 8,
    soldierCd: 0.6,
  };

  const ENEMY = {
    spider: { hp: 40, dmg: 6, speed: 42, r: 9 },
    beetle: { hp: 120, dmg: 10, speed: 26, r: 13 },
    wasp: { hp: 30, dmg: 5, speed: 78, r: 8 },
  };

  /* ---------- Utils ---------- */
  const $ = (s) => document.querySelector(s);
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const COMPASS = ['ตะวันออก', 'ใต้', 'ตะวันตก', 'เหนือ'];
  const dirName = (ang) => COMPASS[Math.round(((ang % (Math.PI * 2)) + Math.PI * 2) / (Math.PI / 2)) % 4];

  const canvas = $('#game');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1;

  /* ---------- State ---------- */
  let S;
  const cam = { x: CFG.world / 2, y: CFG.world / 2, z: 1 };

  function newGame() {
    const c = CFG.world / 2;
    S = {
      running: false, paused: false, over: false, speed: 1, t: 0,
      food: CFG.start.food, twigs: CFG.start.twigs,
      nest: { x: c, y: c, hp: 200, maxHp: 200, level: 1 },
      carryLvl: 0, weaponLvl: 0,
      ants: [], enemies: [], nodes: [], texts: [],
      rally: { x: c + 110, y: c + 40 },
      wave: 0, waveTimer: CFG.firstWave, nodeTimer: CFG.nodeRespawn, eggTimer: CFG.eggInterval,
    };
    for (let i = 0; i < 14; i++) spawnNode(150, 700);
    for (let i = 0; i < CFG.start.workers; i++) spawnAnt('w');
    for (let i = 0; i < CFG.start.soldiers; i++) spawnAnt('s');
    cam.x = c; cam.y = c;
  }

  const nestR = () => 34 + S.nest.level * 6;
  const popCap = () => CFG.baseCap + (S.nest.level - 1) * CFG.capPerLevel;
  const carryCap = () => CFG.carryBase + S.carryLvl * 2;
  const soldierDmg = () => CFG.soldierDmg * (1 + 0.25 * S.weaponLvl);

  function spawnNode(rMin, rMax) {
    const a = rand(0, Math.PI * 2), r = rand(rMin, rMax);
    const type = Math.random() < 0.6 ? 'food' : 'twig';
    const amount = type === 'food' ? rand(60, 120) : rand(40, 80);
    S.nodes.push({
      x: clamp(S.nest.x + Math.cos(a) * r, 40, CFG.world - 40),
      y: clamp(S.nest.y + Math.sin(a) * r, 40, CFG.world - 40),
      type, amount, max: amount, marked: false, rot: rand(0, Math.PI),
    });
  }

  function spawnAnt(type) {
    const a = rand(0, Math.PI * 2);
    const ant = {
      type, x: S.nest.x + Math.cos(a) * nestR(), y: S.nest.y + Math.sin(a) * nestR(),
      angle: a, walk: rand(0, 6), hp: type === 'w' ? 10 : 40, maxHp: type === 'w' ? 10 : 40,
      speed: type === 'w' ? 62 : 55, carry: 0, carryType: null, gather: 0, target: null, cd: 0,
      off: { x: rand(-45, 45), y: rand(-45, 45) },
    };
    S.ants.push(ant);
    return ant;
  }

  /* ---------- Movement / AI ---------- */
  function moveTo(e, tx, ty, speed, dt, stop = 2) {
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
    if (d <= stop) return true;
    const step = Math.min(speed * dt, d - stop + 0.01);
    e.x += (dx / d) * step; e.y += (dy / d) * step;
    e.angle = Math.atan2(dy, dx);
    e.walk += speed * dt * 0.25;
    return false;
  }

  function findNode(ant) {
    let best = null, bestScore = Infinity;
    for (const n of S.nodes) {
      if (n.amount <= 0) continue;
      let crowd = 0;
      for (const o of S.ants) if (o !== ant && o.target === n) crowd++;
      const score = dist(ant, n) + crowd * 60 + (n.marked ? -500 : 0);
      if (score < bestScore) { bestScore = score; best = n; }
    }
    return best;
  }

  function updateWorker(a, dt) {
    if (a.carry > 0) {
      if (moveTo(a, S.nest.x, S.nest.y, a.speed, dt, nestR() * 0.7)) {
        if (a.carryType === 'food') S.food += a.carry; else S.twigs += a.carry;
        S.texts.push({ x: a.x, y: a.y - 10, text: '+' + a.carry, color: a.carryType === 'food' ? '#ff8a7a' : '#d9b27a', life: 1 });
        a.carry = 0; a.carryType = null;
      }
      return;
    }
    if (a.gather > 0) {
      a.gather -= dt;
      if (a.gather <= 0 && a.target && a.target.amount > 0) {
        const n = Math.min(carryCap(), Math.ceil(a.target.amount));
        a.target.amount -= n;
        a.carry = n; a.carryType = a.target.type;
      }
      return;
    }
    if (!a.target || a.target.amount <= 0) a.target = findNode(a);
    if (!a.target) {
      moveTo(a, S.nest.x + a.off.x * 2, S.nest.y + a.off.y * 2, a.speed * 0.4, dt, 4);
      return;
    }
    if (moveTo(a, a.target.x, a.target.y, a.speed, dt, 6)) a.gather = 0.8;
  }

  function nearestEnemy(from, range) {
    let best = null, bd = range;
    for (const e of S.enemies) {
      const d = dist(from, e);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function updateSoldier(a, dt) {
    a.cd -= dt;
    const e = nearestEnemy(a, 200) || nearestEnemy(S.nest, nestR() + 220);
    if (e) {
      if (moveTo(a, e.x, e.y, a.speed * 1.1, dt, e.r + 6) && a.cd <= 0) {
        e.hp -= soldierDmg();
        a.cd = CFG.soldierCd;
      }
      return;
    }
    moveTo(a, S.rally.x + a.off.x, S.rally.y + a.off.y, a.speed, dt, 4);
  }

  function updateEnemy(e, dt) {
    e.cd -= dt;
    let tgt = null, best = 90;
    for (const a of S.ants) {
      const d = dist(e, a);
      if (d < best) { best = d; tgt = a; }
    }
    if (tgt) {
      if (moveTo(e, tgt.x, tgt.y, e.speed, dt, e.r + 4) && e.cd <= 0) { tgt.hp -= e.dmg; e.cd = 1; }
    } else if (moveTo(e, S.nest.x, S.nest.y, e.speed, dt, nestR() + e.r - 6) && e.cd <= 0) {
      S.nest.hp -= e.dmg; e.cd = 1;
    }
  }

  /* ---------- Waves ---------- */
  function spawnWave() {
    S.wave++;
    const n = Math.round(0.6 + S.wave * 1.4);
    const ang = rand(0, Math.PI * 2);
    const R = CFG.world / 2 - 80;
    const scale = 1 + S.wave * 0.08;
    for (let i = 0; i < n; i++) {
      const roll = Math.random();
      const type = S.wave >= 5 && roll < 0.3 ? 'wasp' : S.wave >= 3 && roll < 0.55 ? 'beetle' : 'spider';
      const b = ENEMY[type];
      S.enemies.push({
        type, x: S.nest.x + Math.cos(ang) * R + rand(-70, 70), y: S.nest.y + Math.sin(ang) * R + rand(-70, 70),
        angle: ang + Math.PI, walk: 0, hp: b.hp * scale, maxHp: b.hp * scale, dmg: b.dmg * (1 + S.wave * 0.04),
        speed: b.speed, r: b.r, cd: 0,
      });
    }
    toast(`🌊 คลื่นที่ ${S.wave}/${CFG.winWave} กำลังมาจากทิศ${dirName(ang)}!`, true);
    S.waveTimer = S.wave >= CFG.winWave ? Infinity : CFG.waveInterval;
  }

  /* ---------- Main step ---------- */
  function step(dt) {
    S.t += dt;

    if ((S.waveTimer -= dt) <= 0) spawnWave();
    if ((S.nodeTimer -= dt) <= 0) {
      S.nodeTimer = CFG.nodeRespawn;
      if (S.nodes.length < CFG.maxNodes) spawnNode(250, 1000);
    }
    if ((S.eggTimer -= dt) <= 0) {
      S.eggTimer = CFG.eggInterval;
      if (S.ants.length < popCap()) { spawnAnt('w'); toast('🥚 ราชินีออกไข่ ได้ผู้งานใหม่'); }
    }

    for (const a of S.ants) (a.type === 'w' ? updateWorker : updateSoldier)(a, dt);
    for (const e of S.enemies) updateEnemy(e, dt);

    S.ants = S.ants.filter((a) => a.hp > 0);
    S.enemies = S.enemies.filter((e) => e.hp > 0);
    S.nodes = S.nodes.filter((n) => n.amount > 0.5);
    for (const t of S.texts) { t.y -= 18 * dt; t.life -= dt; }
    S.texts = S.texts.filter((t) => t.life > 0);

    if (S.nest.hp <= 0) endGame(false);
    else if (S.wave >= CFG.winWave && S.enemies.length === 0) endGame(true);
  }

  function endGame(win) {
    S.over = true;
    $('#ovTitle').textContent = win ? '🏆 ชนะแล้ว!' : '💀 รังแตก';
    $('#ovDesc').textContent = win
      ? `อาณาจักรของคุณรอดครบ ${CFG.winWave} คลื่น`
      : `รังถูกทำลายที่คลื่นที่ ${S.wave} · รอดมา ${Math.floor(S.t)} วินาที`;
    $('#ovHelp').hidden = true;
    $('#btnStart').textContent = 'เล่นอีกครั้ง';
    $('#overlay').classList.remove('hidden');
  }

  /* ---------- Actions / UI ---------- */
  const afford = (c) => S.food >= (c.food || 0) && S.twigs >= (c.twigs || 0);
  const pay = (c) => { S.food -= c.food || 0; S.twigs -= c.twigs || 0; };
  const hasRoom = () => S.ants.length < popCap();

  const ACTIONS = [
    { id: 'worker', icon: '🐜', name: 'ผู้งาน', sub: () => 'เก็บทรัพยากร', cost: () => ({ food: 10 }), ok: hasRoom, run: () => spawnAnt('w') },
    { id: 'soldier', icon: '⚔️', name: 'ทหาร', sub: () => 'ป้องกันรัง', cost: () => ({ food: 25, twigs: 5 }), ok: hasRoom, run: () => spawnAnt('s') },
    {
      id: 'nest', icon: '🏰', name: 'ขยายรัง', sub: () => `Lv ${S.nest.level}/${CFG.maxNestLevel}`,
      cost: () => ({ food: 20 * S.nest.level, twigs: 30 * S.nest.level }), ok: () => S.nest.level < CFG.maxNestLevel,
      run: () => { S.nest.level++; S.nest.maxHp += 100; S.nest.hp += 100; toast(`🏰 รังเป็น Lv ${S.nest.level} · รองรับ ${popCap()} ตัว`); },
    },
    {
      id: 'carry', icon: '🎒', name: 'ขนของ', sub: () => `Lv ${S.carryLvl}/${CFG.maxUpgrade}`,
      cost: () => ({ food: 30 * (S.carryLvl + 1) }), ok: () => S.carryLvl < CFG.maxUpgrade, run: () => { S.carryLvl++; },
    },
    {
      id: 'weapon', icon: '🗡️', name: 'อาวุธ', sub: () => `Lv ${S.weaponLvl}/${CFG.maxUpgrade}`,
      cost: () => ({ food: 25 * (S.weaponLvl + 1), twigs: 10 * (S.weaponLvl + 1) }), ok: () => S.weaponLvl < CFG.maxUpgrade, run: () => { S.weaponLvl++; },
    },
    {
      id: 'repair', icon: '🔧', name: 'ซ่อมรัง', sub: () => '+60 HP', cost: () => ({ food: 20 }), ok: () => S.nest.hp < S.nest.maxHp,
      run: () => { S.nest.hp = Math.min(S.nest.maxHp, S.nest.hp + 60); },
    },
  ];

  const costText = (c) => [c.food && `🍓${c.food}`, c.twigs && `🪵${c.twigs}`].filter(Boolean).join(' ') || '-';

  const panel = $('#panel');
  for (const act of ACTIONS) {
    const b = document.createElement('button');
    b.dataset.id = act.id;
    b.innerHTML = `<span class="n">${act.icon} ${act.name}</span><span class="s"></span><span class="c"></span>`;
    b.addEventListener('click', () => {
      if (!S.running || S.over || S.paused) return;
      const c = act.cost();
      if (!act.ok() || !afford(c)) return;
      pay(c); act.run(); refreshUI();
    });
    panel.appendChild(b);
  }

  function refreshUI() {
    $('#food').textContent = Math.floor(S.food);
    $('#twigs').textContent = Math.floor(S.twigs);
    $('#pop').textContent = `${S.ants.length}/${popCap()}`;
    $('#wave').textContent = S.wave >= CFG.winWave ? `${S.wave}/${CFG.winWave}`
      : `${S.wave}/${CFG.winWave} · ${Math.ceil(S.waveTimer)}s`;
    const hp = Math.max(0, S.nest.hp);
    $('#hpbar').style.width = (hp / S.nest.maxHp) * 100 + '%';
    $('#hptext').textContent = `รัง ${Math.ceil(hp)}/${S.nest.maxHp}`;
    for (const act of ACTIONS) {
      const b = panel.querySelector(`[data-id="${act.id}"]`);
      const c = act.cost();
      b.disabled = !act.ok() || !afford(c);
      b.querySelector('.s').textContent = act.sub();
      b.querySelector('.c').textContent = act.ok() ? costText(c) : 'เต็ม';
    }
  }

  function toast(msg, danger) {
    const el = document.createElement('div');
    el.className = 'toast' + (danger ? ' danger' : '');
    el.textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), 3300);
  }

  /* ---------- Rendering ---------- */
  const grass = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#3d5c2b'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 700; i++) {
      g.fillStyle = `hsla(${rand(85, 115)}, ${rand(30, 45)}%, ${rand(22, 38)}%, .55)`;
      g.fillRect(rand(0, 256), rand(0, 256), rand(1, 3), rand(2, 6));
    }
    return c;
  })();
  let grassPattern = null;

  function drawAnt(a, color, scale = 1) {
    ctx.save();
    ctx.translate(a.x, a.y); ctx.rotate(a.angle); ctx.scale(scale, scale);
    const sw = Math.sin(a.walk) * 3;
    ctx.strokeStyle = '#140d0a'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = -1; i <= 1; i++) {
      const k = (i % 2 ? 1 : -1) * sw;
      ctx.moveTo(i * 3, 0); ctx.lineTo(i * 3 + k, 8);
      ctx.moveTo(i * 3, 0); ctx.lineTo(i * 3 - k, -8);
    }
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(-6, 0, 5, 3.8, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0, 3.2, 2.6, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(5.5, 0, 3, 0, 7); ctx.fill();
    ctx.restore();
  }

  function hpBar(e, w) {
    if (e.hp >= e.maxHp) return;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(e.x - w / 2, e.y - 16, w, 3);
    ctx.fillStyle = '#e0594a'; ctx.fillRect(e.x - w / 2, e.y - 16, (w * e.hp) / e.maxHp, 3);
  }

  function drawEnemy(e) {
    ctx.save();
    ctx.translate(e.x, e.y); ctx.rotate(e.angle);
    const sw = Math.sin(e.walk) * 3;
    if (e.type === 'spider') {
      ctx.strokeStyle = '#1c1420'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const x = -4 + i * 3, k = (i % 2 ? 1 : -1) * sw;
        ctx.moveTo(x, 0); ctx.lineTo(x + k + 3, 12); ctx.moveTo(x, 0); ctx.lineTo(x - k + 3, -12);
      }
      ctx.stroke();
      ctx.fillStyle = '#2a1f33';
      ctx.beginPath(); ctx.ellipse(-4, 0, 7, 6, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(5, 0, 4, 0, 7); ctx.fill();
      ctx.fillStyle = '#e03b3b'; ctx.fillRect(7, -2, 1.5, 1.5); ctx.fillRect(7, 1, 1.5, 1.5);
    } else if (e.type === 'beetle') {
      ctx.fillStyle = '#2f6f4f'; ctx.beginPath(); ctx.ellipse(-2, 0, 13, 9, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#1b3f2d'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(10, 0); ctx.stroke();
      ctx.fillStyle = '#1f4a35'; ctx.beginPath(); ctx.arc(11, 0, 4.5, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(220,240,255,.55)';
      const f = 6 + Math.abs(sw) * 1.2;
      ctx.beginPath(); ctx.ellipse(-1, f, 6, 3, 0.4, 0, 7); ctx.ellipse(-1, -f, 6, 3, -0.4, 0, 7); ctx.fill();
      ctx.fillStyle = '#e8c020'; ctx.beginPath(); ctx.ellipse(-3, 0, 8, 4.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-6, -4, 2, 8); ctx.fillRect(-1, -4, 2, 8);
      ctx.beginPath(); ctx.arc(6, 0, 3.2, 0, 7); ctx.fill();
    }
    ctx.restore();
    hpBar(e, 22);
  }

  function drawNode(n) {
    const k = 0.5 + 0.5 * (n.amount / n.max);
    ctx.save(); ctx.translate(n.x, n.y);
    if (n.type === 'food') {
      for (const [dx, dy] of [[-7, 3], [6, 4], [0, -6], [-1, 4]]) {
        ctx.fillStyle = '#c93a3a'; ctx.beginPath(); ctx.arc(dx * k, dy * k, 7 * k, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(dx * k - 2, dy * k - 2, 1.8 * k, 0, 7); ctx.fill();
      }
    } else {
      ctx.rotate(n.rot); ctx.fillStyle = '#7a5530'; ctx.strokeStyle = '#4b3219'; ctx.lineWidth = 1;
      for (const [dx, dy, r] of [[0, 0, 0], [-3, 6, 0.5], [3, -6, -0.4]]) {
        ctx.save(); ctx.rotate(r); ctx.fillRect(-16 * k + dx, dy - 2, 32 * k, 4); ctx.strokeRect(-16 * k + dx, dy - 2, 32 * k, 4); ctx.restore();
      }
    }
    ctx.restore();
    if (n.marked) {
      ctx.strokeStyle = '#f2b441'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.lineDashOffset = -S.t * 12;
      ctx.beginPath(); ctx.arc(n.x, n.y, 20, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  function drawNest() {
    const { x, y } = S.nest, r = nestR();
    const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
    g.addColorStop(0, '#5b3f26'); g.addColorStop(0.7, '#8a6540'); g.addColorStop(1, '#6d4f31');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#1e130b'; ctx.beginPath(); ctx.ellipse(x, y, r * 0.38, r * 0.28, 0, 0, 7); ctx.fill();
    drawAnt({ x, y: y - 2, angle: Math.PI / 2, walk: 0 }, '#7a1f3d', 1.6);
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#16200f'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(DPR * cam.z, 0, 0, DPR * cam.z, DPR * (W / 2 - cam.x * cam.z), DPR * (H / 2 - cam.y * cam.z));
    ctx.fillStyle = grassPattern || (grassPattern = ctx.createPattern(grass, 'repeat'));
    ctx.fillRect(0, 0, CFG.world, CFG.world);
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 6; ctx.strokeRect(0, 0, CFG.world, CFG.world);
    if (!S) return;

    for (const n of S.nodes) drawNode(n);
    drawNest();

    // rally flag
    const { x: rx, y: ry } = S.rally;
    ctx.strokeStyle = '#f2f2f2'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx, ry - 22); ctx.stroke();
    ctx.fillStyle = '#e0594a'; ctx.beginPath(); ctx.moveTo(rx, ry - 22); ctx.lineTo(rx + 14, ry - 17); ctx.lineTo(rx, ry - 12); ctx.fill();

    for (const a of S.ants) {
      drawAnt(a, a.type === 'w' ? '#2b1a12' : '#8c2a1c', a.type === 'w' ? 1 : 1.25);
      if (a.carry > 0) {
        ctx.fillStyle = a.carryType === 'food' ? '#c93a3a' : '#7a5530';
        ctx.beginPath(); ctx.arc(a.x + Math.cos(a.angle) * 9, a.y + Math.sin(a.angle) * 9, 3, 0, 7); ctx.fill();
      }
      hpBar(a, 14);
    }
    for (const e of S.enemies) drawEnemy(e);

    ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
    for (const t of S.texts) { ctx.globalAlpha = Math.min(1, t.life * 2); ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y); }
    ctx.globalAlpha = 1;
  }

  /* ---------- Input ---------- */
  const screenToWorld = (sx, sy) => ({ x: (sx - W / 2) / cam.z + cam.x, y: (sy - H / 2) / cam.z + cam.y });
  const clampCam = () => {
    cam.z = clamp(cam.z, 0.35, 2.2);
    cam.x = clamp(cam.x, 0, CFG.world); cam.y = clamp(cam.y, 0, CFG.world);
  };

  const ptrs = new Map();
  let moved = 0, multi = false, pinchD = 0, pinchZ = 1;
  const pinchDist = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) { moved = 0; multi = false; }
    if (ptrs.size === 2) { multi = true; pinchD = pinchDist(); pinchZ = cam.z; }
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 2) { cam.z = pinchZ * (pinchDist() / pinchD); clampCam(); return; }
    moved += Math.abs(dx) + Math.abs(dy);
    cam.x -= dx / cam.z; cam.y -= dy / cam.z; clampCam();
  });
  const endPtr = (e) => {
    if (!ptrs.has(e.pointerId)) return;
    const isTap = ptrs.size === 1 && !multi && moved < 8 && e.type === 'pointerup';
    ptrs.delete(e.pointerId);
    if (isTap) handleTap(e.clientX, e.clientY);
  };
  canvas.addEventListener('pointerup', endPtr);
  canvas.addEventListener('pointercancel', endPtr);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    cam.z *= e.deltaY < 0 ? 1.1 : 1 / 1.1; clampCam();
  }, { passive: false });

  function handleTap(sx, sy) {
    if (!S.running || S.over) return;
    const p = screenToWorld(sx, sy);
    const hit = S.nodes.find((n) => Math.hypot(n.x - p.x, n.y - p.y) < 26);
    if (hit) {
      hit.marked = !hit.marked;
      toast(hit.marked ? '📌 ผู้งานจะเก็บจุดนี้ก่อน' : 'ยกเลิกการปักหมุด');
    } else {
      S.rally.x = clamp(p.x, 0, CFG.world); S.rally.y = clamp(p.y, 0, CFG.world);
    }
  }

  const keys = new Set();
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); togglePause(); return; }
    keys.add(e.key.toLowerCase());
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

  function togglePause() {
    if (!S.running || S.over) return;
    S.paused = !S.paused;
    $('#btnPause').textContent = S.paused ? '▶' : '⏸';
  }
  $('#btnPause').addEventListener('click', togglePause);
  $('#btnSpeed').addEventListener('click', () => {
    S.speed = S.speed === 1 ? 2 : S.speed === 2 ? 3 : 1;
    $('#btnSpeed').textContent = S.speed + '×';
  });
  $('#btnStart').addEventListener('click', () => {
    newGame();
    S.running = true;
    $('#overlay').classList.add('hidden');
    $('#btnPause').textContent = '⏸'; $('#btnSpeed').textContent = '1×';
    refreshUI();
  });

  /* ---------- Loop ---------- */
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    cam.z = clamp(Math.min(W, H) / 700, 0.6, 1.4);
  }
  window.addEventListener('resize', resize);

  let last = performance.now(), uiAcc = 0;
  function frame(now) {
    const raw = Math.min((now - last) / 1000, 0.1);
    last = now;
    const pan = 500 * raw / cam.z;
    if (keys.has('w') || keys.has('arrowup')) cam.y -= pan;
    if (keys.has('s') || keys.has('arrowdown')) cam.y += pan;
    if (keys.has('a') || keys.has('arrowleft')) cam.x -= pan;
    if (keys.has('d') || keys.has('arrowright')) cam.x += pan;
    clampCam();

    if (S.running && !S.paused && !S.over) {
      const dt = Math.min(raw, 0.05);
      for (let i = 0; i < S.speed; i++) step(dt);
      if ((uiAcc += raw) > 0.2) { uiAcc = 0; refreshUI(); }
    }
    render();
    requestAnimationFrame(frame);
  }

  resize();
  newGame();
  requestAnimationFrame(frame);

  // เปิดให้ทดสอบ/ดีบักผ่าน console
  window.__antGame = { get state() { return S; }, CFG };
})();
