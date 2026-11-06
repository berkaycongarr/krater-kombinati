(function () {
  'use strict';
  const KK = window.KK;
  const $ = (id) => document.getElementById(id);
  const opts = { speed: 2, paused: false };
  const REVEAL_MS = 1900;
  const VERDICT = { g: 'İyi hamle', m: 'İdare eder', r: 'Pahalı hata' };
  const DESC = [
    'Bu tur alma, para biriksin',
    '+2 kg toz/sn toplar',
    '2 toz → 2 cam /sn · 2 kW',
    'toz + cam → 2 kristal /sn · 4 kW',
    '+3 kW enerji, sadece gündüz',
    '600 kJ depolar; gece ve karartmada çalışır',
    'Rakibin panelleri 15 sn kapanır',
  ];
  const TIPS = [
    'Süpürge toz toplar. Toz ham satılırsa sadece <b>1₺</b>.',
    'Fırın tozu cama çevirir; değeri <b>4 katına</b> çıkar.',
    'Pres toz + camdan kristal yapar: <b>10₺</b>, ama 4 kW ister.',
    'Enerji yetmezse makineler yavaşlar. <b>Güneş</b> paneli ekle.',
    'Gece güneş yok; <b>batarya</b> fırını ve presi çalıştırır.',
    '<b>Karartma</b> rakibin panellerini 15 sn kapatır. Maçta 2 hak.',
    'Aynı makine her alımda <b>%12</b> pahalanır.',
    'Son turlarda alınan makine <b>kendini ödemeyebilir</b>.',
  ];
  const COL = { toz: '#b5ab9a', cam: '#7cc9e4', kristal: '#ff8fd0', yay: '#f5a524', chat: '#9a8fff', bad: '#ff5a4e', ok: '#5fd394', power: '#d8f1ff', fg: '#eef0f3' };
  const MOOD = { smart: 0.5, hype: 0.14, troll: 0.06, follow: 0.12, random: 0.18 };
  const NAME_A = ['toz', 'krater', 'ay', 'pres', 'gece', 'kristal', 'mert', 'ece', 'kaan', 'zeynep', 'emre', 'deniz', 'batu', 'elif', 'yigit', 'sude', 'arda', 'irem', 'can', 'efe', 'selin', 'baris', 'oguz', 'nisa'];
  const NAME_B = ['_34', '61', '_tr', 'baba', 'kral', '_06', '35', 'x', '58', '07', '01', '42', '', '_', '1903', '27', 'reis'];
  const FONT_D = '"Big Shoulders Display", "Arial Narrow", sans-serif';

  // ---- Yardımcılar ---------------------------------------------------------
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const fmt = (n) => Math.round(n).toLocaleString('tr-TR');
  const fmt1 = (n) => (Math.round(n * 10) / 10).toLocaleString('tr-TR', { maximumFractionDigits: 1 });
  const mmss = (t) => { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  function setText(el, v) { if (el && el._t !== v) { el._t = v; el.textContent = v; } }
  function setHTML(el, v) { if (el && el._h !== v) { el._h = v; el.innerHTML = v; } }
  function setSt(el, k, v) { const key = '_s' + k; if (el[key] !== v) { el[key] = v; el.style[k] = v; } }
  function setW(el, f) { setSt(el, 'width', Math.round(clamp(f, 0, 1) * 1000) / 10 + '%'); }
  function setCls(el, c, on) { if (el.classList.contains(c) !== !!on) el.classList.toggle(c, !!on); }
  const HEX = {};
  function hex(h) { return HEX[h] || (HEX[h] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]); }
  function mix(a, b, t) {
    const A = hex(a), B = hex(b);
    return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t) + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ')';
  }
  function rgba(h, a) { const c = hex(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + clamp(a, 0, 1).toFixed(3) + ')'; }
  function icon(id) { return '<svg class="i"><use href="#i-' + id + '"/></svg>'; }
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
  }
  // Toplamalı ışık: gece fırın, fener ve kristal parıltıları
  function glow(c, x, y, r, color, a) {
    if (a <= 0.01) return;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
    const op = c.globalCompositeOperation;
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
    c.globalCompositeOperation = op;
  }

  // ---- Fabrika dioraması (canvas) ----------------------------------------------
  // Uzayda yüzen bir ay kayası: arka sırada paneller ve üs, ortada bant hattı, önde robotlar ve bataryalar.
  const W = 910, H = 596;
  const Z = {
    L: 14, R: 896, back: 300, front: 518, depth: 58,
    beltTop: 452, beltX0: 238, beltX1: 778, hopX: 262,
    furnX: 318, furnW: 96, furnH: 80,
    pressX: 488, pressW: 104, pressH: 132,
    base: 484,
    panelX: 34, panelRows: [362, 398], panelGap: 52,
    battX: 612, battBase: 512, battGap: 34,
    habX: 600, habBase: 362,
    field: [36, 206, 420, 502],
    rail: [778, 446, 886, 300],
    plates: [['SÜPÜRGE', 1], ['FIRIN', 2], ['PRES', 3], ['GÜNEŞ', 4], ['BATARYA', 5]],
    plateX: [126, 292, 458, 624, 790],
  };
  const LANDS = [[20, -10, 14, 9], [70, 8, 18, 11], [118, -16, 10, 7], [100, 22, 8, 5], [150, 4, 9, 6]];
  const BUILT_AT = [null, [122, 444], [366, 392], [540, 356], [170, 344], [640, 474]];
  const backY = (u) => Z.back + 20 * Math.pow(2 * u - 1, 2) + 2.5 * Math.sin(u * 29);
  const frontY = (u) => Z.front + 10 * Math.sin(Math.PI * u);
  const bx = (u) => Z.L + 26 + u * (Z.R - Z.L - 52);
  const fx = (u) => Z.L + u * (Z.R - Z.L);
  const uAt = (x) => clamp((x - Z.L) / (Z.R - Z.L), 0, 1);
  const cableSeg = (x, x0, y0, x1, y1, sag) => { const u = (x - x0) / (x1 - x0); return y0 + (y1 - y0) * u + sag * 4 * u * (1 - u); };
  const cableY = (x) => (x <= 452 ? cableSeg(x, 300, 300, 452, 300, 14) : cableSeg(x, 452, 300, 652, 318, 16));

  function Scene(canvas, key) {
    this.cv = canvas; this.ctx = canvas.getContext('2d'); this.key = key;
    this.team = key === 'y' ? COL.yay : COL.chat;
    this.k = 1;
    const r = KK.rng(key === 'y' ? 101 : 202);
    this.stars = [];
    for (let i = 0; i < 150; i++) this.stars.push({ x: r() * W, y: r() * 330, s: r() < 0.1 ? 1.8 : r() < 0.45 ? 1.2 : 0.8, p: r() * 6.28 });
    this.jag = [];
    for (let i = 0; i <= 40; i++) this.jag.push((r() - 0.5) * 8);
    this.pebbles = [];
    for (let i = 0; i < 70; i++) this.pebbles.push({ u: r(), v: r(), s: 0.8 + r() * 1.6 });
    this.craters = [[120, 332, 24, 6], [420, 336, 28, 6.5], [776, 370, 20, 5], [262, 498, 32, 8], [560, 500, 26, 6], [850, 478, 18, 4], [712, 428, 14, 3.5], [60, 468, 16, 4]];
    this.rocks = [[46, 574, 10, 0], [96, 588, 6, 1.3], [862, 570, 11, 2.1], [826, 588, 6, 0.7]];
    this.reset();
  }
  Scene.prototype.reset = function () {
    this.robots = []; this.motes = []; this.parts = []; this.railItems = []; this.flies = [];
    this.pops = []; this.puffs = []; this.smoke = []; this.sparks = []; this.rings = [];
    this.spawnAcc = 0; this.beltOff = 0; this.beltV = 0; this.cableOff = 0; this.pressPh = 0; this.furnGlow = 0;
    this.day = 1; this.time = 0; this.bo = 0; this.zap = 0; this.meteor = -1; this.smokeT = 0;
    this.lastMoney = null; this.popAcc = 0; this.popT = 0; this.sunX = 60; this.sunY = 292;
  };
  Scene.prototype.resize = function (k) {
    this.k = k;
    this.cv.width = Math.round(W * k); this.cv.height = Math.round(H * k);
  };
  Scene.prototype.built = function (id) {
    const p = BUILT_AT[id];
    if (p) this.rings.push({ x: p[0], y: p[1], life: 1, text: '+1 ' + KK.MACHINES[id].name.toLocaleUpperCase('tr-TR') });
  };
  Scene.prototype.hit = function () { this.zap = 1; };
  Scene.prototype.meteorHit = function () { this.meteor = 0; };

  Scene.prototype.update = function (dt, s, env, t, fl) {
    this.time += dt; this.t = t; this.s = s; this.env = env; this.fl = fl;
    const live = t >= 0;
    this.day += ((env.night && live ? 0 : 1) - this.day) * Math.min(1, dt * 1.5);
    this.bo += ((live && t < s.bo ? 1 : 0) - this.bo) * Math.min(1, dt * 6);
    this.zap = Math.max(0, this.zap - dt * 1.3);
    if (this.meteor >= 0) { this.meteor += dt; if (this.meteor > 1.7) this.meteor = -1; }
    const tt = clamp(t, 0, KK.DUR);
    const p = tt < KK.NIGHT_START ? tt / KK.NIGHT_START : clamp((tt - KK.NIGHT_END) / (KK.DUR - KK.NIGHT_END), 0, 1);
    this.sunX = 60 + p * 790; this.sunY = 292 - Math.sin(p * Math.PI) * 196;

    // Süpürge robotları
    const want = Math.min(s.m[1], 10);
    const [fx0, fx1, fy0, fy1] = Z.field;
    while (this.robots.length < want) this.robots.push({ x: fx0 + 20 + Math.random() * (fx1 - fx0 - 40), y: fy0 + Math.random() * (fy1 - fy0), a: Math.random() * 6.28, v: 16 + Math.random() * 12, ph: Math.random() * 6.28, br: 0, born: 0 });
    while (this.robots.length > want) this.robots.pop();
    const storm = env.tozMul > 1;
    for (const r of this.robots) {
      r.a += (Math.random() - 0.5) * dt * 2.4;
      const sp = r.v * (storm ? 1.6 : 1) * (live ? 1 : 0.35);
      r.x += Math.cos(r.a) * sp * dt; r.y += Math.sin(r.a) * sp * dt * 0.55;
      if (r.x < fx0) { r.x = fx0; r.a = Math.PI - r.a; }
      if (r.x > fx1) { r.x = fx1; r.a = Math.PI - r.a; }
      if (r.y < fy0) { r.y = fy0; r.a = -r.a; }
      if (r.y > fy1) { r.y = fy1; r.a = -r.a; }
      r.born = Math.min(1, r.born + dt * 2.5); r.ph += dt * 6; r.br += dt * (live ? 16 : 4);
      if (live && Math.random() < dt * 1.3 * env.tozMul) this.puffs.push({ x: r.x - Math.cos(r.a) * 16, y: r.y + 7, vx: (Math.random() - 0.5) * 10, life: 1 });
    }
    for (const q of this.puffs) { q.life -= dt * 0.9; q.y -= dt * 5; q.x += q.vx * dt; }
    this.puffs = this.puffs.filter((q) => q.life > 0);

    // Toz robotlardan huniye uçar, oradan banta düşer
    const T = fl && live ? fl.T : 0;
    this.spawnAcc += Math.min(3.4, T / 2) * dt;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (!this.robots.length) break;
      const r = this.robots[Math.floor(Math.random() * this.robots.length)];
      const u = Math.random() * T;
      const fate = u < fl.raw ? 'raw' : u < fl.raw + fl.camSold ? 'cam' : u < fl.raw + fl.camSold + fl.y ? 'camP' : 'tozP';
      this.motes.push({ x0: r.x, y0: r.y - 14, k: 0, fate });
    }
    for (const m of this.motes) {
      m.k += dt * 1.25;
      if (m.k >= 1) { m.dead = true; this.parts.push({ x: Z.beltX0 + 16, fate: m.fate, st: 0, j: Math.random() - 0.5 }); }
    }
    this.motes = this.motes.filter((m) => !m.dead);

    this.beltV += ((T > 0 ? 64 : 0) - this.beltV) * Math.min(1, dt * 2);
    const fX = Z.furnX + Z.furnW / 2, pX = Z.pressX + Z.pressW / 2;
    for (const q of this.parts) {
      q.x += this.beltV * dt;
      if (q.st === 0 && q.x >= fX && (q.fate === 'cam' || q.fate === 'camP')) q.st = 1;
      if (q.st < 2 && q.x >= pX && (q.fate === 'camP' || q.fate === 'tozP')) q.st = 2;
      if (q.x >= Z.beltX1) { q.dead = true; this.railItems.push({ k: 0, v: 0.5, st: q.st }); }
    }
    this.parts = this.parts.filter((q) => !q.dead);
    const [rx0, ry0, rx1, ry1] = Z.rail, rl = Math.hypot(rx1 - rx0, ry1 - ry0), ux = (rx1 - rx0) / rl, uy = (ry1 - ry0) / rl;
    for (const q of this.railItems) {
      q.v += dt * 3.5; q.k += q.v * dt;
      if (q.k >= 1) { q.dead = true; this.flies.push({ x: rx1, y: ry1, vx: ux * 560, vy: uy * 560, st: q.st, life: 1 }); }
    }
    this.railItems = this.railItems.filter((q) => !q.dead);
    for (const f of this.flies) { f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt * 1.1; }
    this.flies = this.flies.filter((f) => f.life > 0 && f.y > -40 && f.x < W + 40);

    // Satıştan gelen para: rampanın tepesinde "+₺"
    if (this.lastMoney == null) this.lastMoney = s.money;
    const dm = s.money - this.lastMoney; this.lastMoney = s.money;
    if (dm > 0) this.popAcc += dm;
    this.popT += dt;
    if (this.popT > 1.6) {
      if (this.popAcc >= 1) this.pops.push({ x: rx1 - 30, y: ry1 + 4, text: '+₺' + fmt(this.popAcc), life: 1 });
      this.popAcc = 0; this.popT = 0;
    }
    for (const q of this.pops) { q.y -= dt * 20; q.life -= dt * 0.65; }
    this.pops = this.pops.filter((q) => q.life > 0);

    this.beltOff = (this.beltOff + this.beltV * dt) % 22;
    const pf = fl && live && fl.need > 0 ? fl.f : 0;
    this.cableOff = (this.cableOff + (pf > 0.01 ? 36 + 30 * pf : 0) * dt) % 30;
    const pu = fl && live ? fl.pressUtil : 0;
    if (pu > 0.01) this.pressPh += dt * (1.2 + 2.4 * pu) * Math.PI;
    this.furnGlow += ((fl && live ? fl.furnUtil : 0) - this.furnGlow) * Math.min(1, dt * 3);
    this.smokeT += dt;
    if (s.m[2] > 0 && this.furnGlow > 0.15 && this.smokeT > 0.35) {
      this.smokeT = 0;
      this.smoke.push({ x: Z.furnX + Z.furnW - 26, y: Z.base - Z.furnH - 46, r: 5, life: 1 });
    }
    for (const q of this.smoke) { q.y -= dt * 16; q.x += dt * 6; q.r += dt * 7; q.life -= dt * 0.45; }
    this.smoke = this.smoke.filter((q) => q.life > 0);
    if (this.bo > 0.5 && Math.random() < dt * 12) this.sparks.push({ x: Z.panelX + 20 + Math.random() * 250, y: 336 + Math.random() * 50, vx: (Math.random() - 0.5) * 70, vy: -40 - Math.random() * 50, life: 0.6 });
    for (const q of this.sparks) { q.vy += 220 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; }
    this.sparks = this.sparks.filter((q) => q.life > 0);
    for (const q of this.rings) q.life -= dt * 0.75;
    this.rings = this.rings.filter((q) => q.life > 0);
  };

  Scene.prototype.draw = function () {
    const c = this.ctx;
    if (!this.s) return;
    c.setTransform(this.k, 0, 0, this.k, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.lineCap = 'butt'; c.lineJoin = 'miter';
    c.clearRect(0, 0, W, H);
    const d = this.day;
    this.sky(c, d);
    this.plate(c, d);
    this.panels(c, d);
    this.hab(c, d);
    this.cable(c, d);
    this.hopper(c, d);
    this.belt(c, d);
    for (const q of this.parts) this.item(c, q.x, Z.beltTop - 7 + q.j, q.st, d, 1);
    this.furnaces(c, d);
    this.presses(c, d);
    this.rail(c, d);
    this.batteries(c, d);
    this.motesDraw(c, d);
    this.robotsDraw(c, d);
    this.fx(c, d);
    this.plates(c, d);
  };

  // Gölge: güneşin karşı tarafına uzar
  Scene.prototype.shadow = function (c, x, y, rx, ry) {
    const d = this.day, dx = clamp((x - this.sunX) * 0.06, -26, 26) * d;
    c.fillStyle = 'rgba(0,0,0,' + (0.16 + 0.2 * d).toFixed(3) + ')';
    c.beginPath(); c.ellipse(x + dx, y, rx + Math.abs(dx) * 0.4, ry, 0, 0, 6.29); c.fill();
  };
  Scene.prototype.ghost = function (c, x, y, w, h) {
    c.setLineDash([6, 6]); c.strokeStyle = 'rgba(238,240,243,.22)'; c.lineWidth = 1.6;
    rr(c, x, y, w, h, 6); c.stroke(); c.setLineDash([]);
    const cx = x + w / 2, cy = y + h / 2;
    c.strokeStyle = 'rgba(238,240,243,.32)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(cx - 7, cy); c.lineTo(cx + 7, cy); c.moveTo(cx, cy - 7); c.lineTo(cx, cy + 7); c.stroke();
  };

  Scene.prototype.sky = function (c, d) {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#020307'); g.addColorStop(0.5, mix('#060912', '#0b1020', d)); g.addColorStop(1, '#020307');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (const st of this.stars) {
      const a = (0.3 + 0.7 * (1 - d)) * (0.6 + 0.4 * Math.sin(this.time * 1.3 + st.p));
      c.fillStyle = 'rgba(238,240,243,' + a.toFixed(3) + ')';
      c.fillRect(st.x, st.y, st.s, st.s);
    }
    if (d > 0.02 && this.t < KK.DUR) {
      const flare = this.env.solarMul > 1 ? 1.7 : 1, sx = this.sunX, sy = this.sunY;
      const rg = c.createRadialGradient(sx, sy, 0, sx, sy, 90 * flare);
      rg.addColorStop(0, 'rgba(255,250,236,' + (0.9 * d).toFixed(3) + ')');
      rg.addColorStop(0.12, 'rgba(255,238,200,' + (0.5 * d).toFixed(3) + ')');
      rg.addColorStop(1, 'rgba(255,220,170,0)');
      c.fillStyle = rg; c.beginPath(); c.arc(sx, sy, 90 * flare, 0, 6.29); c.fill();
      c.fillStyle = 'rgba(255,253,245,' + d.toFixed(3) + ')'; c.beginPath(); c.arc(sx, sy, 11, 0, 6.29); c.fill();
    }
    // Dünya: yavaşça döner, güneşin karşı yarısı gölgede
    const ex = 812, ey = 150, er = 40;
    glow(c, ex, ey, er + 26, '#6eb4ff', 0.1 + 0.12 * (1 - d));
    c.save();
    c.beginPath(); c.arc(ex, ey, er, 0, 6.29); c.clip();
    const eg = c.createRadialGradient(ex - 12, ey - 14, 4, ex, ey, er);
    eg.addColorStop(0, '#5fa8e8'); eg.addColorStop(1, '#173d72');
    c.fillStyle = eg; c.fillRect(ex - er, ey - er, er * 2, er * 2);
    const off = (this.time * 4) % 160;
    c.fillStyle = '#5e8f55';
    for (const [lx, ly, lrx, lry] of LANDS) {
      for (const w of [0, -160]) { c.beginPath(); c.ellipse(ex - 80 + ((lx + off) % 160) + w, ey + ly, lrx, lry, 0.4, 0, 6.29); c.fill(); }
    }
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2.2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(ex - 26, ey - 18); c.quadraticCurveTo(ex - 6, ey - 26, ex + 16, ey - 16); c.stroke();
    c.beginPath(); c.moveTo(ex - 16, ey + 14); c.quadraticCurveTo(ex + 4, ey + 8, ex + 28, ey + 16); c.stroke();
    const side = d > 0.1 ? (Math.sign(ex - this.sunX) || 1) : 1;
    c.fillStyle = 'rgba(2,4,10,' + (0.22 + 0.42 * d).toFixed(3) + ')';
    c.beginPath(); c.arc(ex + side * er * 0.6, ey, er * 1.02, 0, 6.29); c.fill();
    c.restore();
    c.lineCap = 'butt';
    c.strokeStyle = 'rgba(160,210,255,.35)'; c.lineWidth = 1.5; c.beginPath(); c.arc(ex, ey, er, 0, 6.29); c.stroke();
  };

  Scene.prototype.plate = function (c, d) {
    const N = 40;
    const ug = c.createRadialGradient(W / 2, Z.front + 80, 10, W / 2, Z.front + 80, 440);
    ug.addColorStop(0, rgba(this.team, 0.1 + 0.1 * (1 - d))); ug.addColorStop(1, rgba(this.team, 0));
    c.fillStyle = ug; c.fillRect(0, Z.front - 80, W, H - Z.front + 80);
    for (const [x, y, r, ph] of this.rocks) {
      const yy = y + Math.sin(this.time * 0.9 + ph) * 3;
      c.fillStyle = mix('#1c212c', '#5b5750', d);
      c.beginPath(); c.moveTo(x - r, yy); c.lineTo(x - r * 0.4, yy - r * 0.8); c.lineTo(x + r * 0.7, yy - r * 0.6);
      c.lineTo(x + r, yy + r * 0.1); c.lineTo(x + r * 0.3, yy + r * 0.8); c.lineTo(x - r * 0.6, yy + r * 0.6); c.closePath(); c.fill();
    }
    // Ön yüz: kayanın kesiti, katmanlı
    const bot = [];
    for (let i = 0; i <= N; i++) { const u = i / N; bot.push(frontY(u) + Z.depth * (0.5 + 0.5 * Math.sin(Math.PI * u)) + this.jag[i]); }
    c.beginPath();
    for (let i = 0; i <= N; i++) { const u = i / N; c.lineTo(fx(u), frontY(u)); }
    for (let i = N; i >= 0; i--) c.lineTo(fx(i / N), bot[i]);
    c.closePath();
    let g = c.createLinearGradient(0, Z.front, 0, Z.front + Z.depth + 16);
    g.addColorStop(0, mix('#2f3542', '#7a746b', d)); g.addColorStop(1, mix('#10141b', '#3a3732', d));
    c.fillStyle = g; c.fill();
    c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = 2;
    for (const f of [0.36, 0.68]) {
      c.beginPath();
      for (let i = 0; i <= N; i++) { const u = i / N, y0 = frontY(u); c.lineTo(fx(u), y0 + (bot[i] - y0) * f + 2 * Math.sin(u * 19 + f * 7)); }
      c.stroke();
    }
    // Üst yüzey
    c.beginPath();
    for (let i = 0; i <= N; i++) { const u = i / N; c.lineTo(bx(u), backY(u)); }
    c.quadraticCurveTo(Z.R + 4, (backY(1) + frontY(1)) / 2, fx(1), frontY(1));
    for (let i = N; i >= 0; i--) { const u = i / N; c.lineTo(fx(u), frontY(u)); }
    c.quadraticCurveTo(Z.L - 4, (backY(0) + frontY(0)) / 2, bx(0), backY(0));
    c.closePath();
    g = c.createLinearGradient(0, Z.back, 0, Z.front);
    g.addColorStop(0, mix('#353b49', '#b7b1a5', d)); g.addColorStop(1, mix('#262b37', '#958f85', d));
    c.fillStyle = g; c.fill();
    if (d > 0.05) {
      const lg = c.createRadialGradient(this.sunX, Z.back + 60, 20, this.sunX, Z.back + 60, 440);
      lg.addColorStop(0, 'rgba(255,236,200,' + (0.18 * d).toFixed(3) + ')'); lg.addColorStop(1, 'rgba(255,236,200,0)');
      c.fillStyle = lg; c.fill();
    }
    c.strokeStyle = 'rgba(255,255,255,' + (0.08 + 0.2 * d).toFixed(3) + ')'; c.lineWidth = 2;
    c.beginPath(); for (let i = 0; i <= N; i++) { const u = i / N; c.lineTo(fx(u), frontY(u)); } c.stroke();
    c.fillStyle = 'rgba(0,0,0,' + (0.12 + 0.08 * d).toFixed(3) + ')';
    for (const p of this.pebbles) {
      const x = lerp(bx(p.u), fx(p.u), p.v), y = lerp(backY(p.u) + 10, frontY(p.u) - 8, p.v);
      c.fillRect(x, y, p.s * 1.6, p.s);
    }
    for (const [x, y, rx, ry] of this.craters) {
      c.fillStyle = 'rgba(0,0,0,' + (0.12 + 0.1 * d).toFixed(3) + ')';
      c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 6.29); c.fill();
      c.strokeStyle = 'rgba(255,255,255,' + (0.04 + 0.14 * d).toFixed(3) + ')'; c.lineWidth = 1.6;
      c.beginPath(); c.ellipse(x, y + 1, rx, ry, 0, 0.2, Math.PI - 0.2); c.stroke();
    }
  };

  Scene.prototype.panels = function (c, d) {
    const s = this.s, env = this.env, live = this.t >= 0, n = Math.min(s.m[4], 10);
    const on = !(env.night && live) && this.bo < 0.5 ? Math.min(1.4, env.solarMul) : 0;
    if (!n) { this.ghost(c, Z.panelX + 2 * Z.panelGap, Z.panelRows[1] - 42, 46, 30); return; }
    for (let i = 5; i < n; i++) this.panel(c, Z.panelX + 26 + (i - 5) * Z.panelGap, Z.panelRows[0], on, d, i, 0.9);
    for (let i = 0; i < Math.min(n, 5); i++) this.panel(c, Z.panelX + i * Z.panelGap, Z.panelRows[1], on, d, i, 1);
  };
  Scene.prototype.panel = function (c, x, base, on, d, i, sc) {
    this.shadow(c, x + 23 * sc, base + 1, 20 * sc, 4 * sc);
    c.save(); c.translate(x, base); c.scale(sc, sc);
    c.strokeStyle = mix('#2b2f37', '#6d6a64', d); c.lineWidth = 3;
    c.beginPath(); c.moveTo(23, -14); c.lineTo(23, 0); c.stroke();
    const quad = () => { c.beginPath(); c.moveTo(0, -14); c.lineTo(46, -14); c.lineTo(41, -40); c.lineTo(5, -40); c.closePath(); };
    const g = c.createLinearGradient(5, -40, 46, -14);
    if (on > 0) { g.addColorStop(0, '#3f9ce0'); g.addColorStop(1, '#14406f'); }
    else { g.addColorStop(0, '#141d2c'); g.addColorStop(1, '#0a0f18'); }
    quad(); c.fillStyle = g; c.fill();
    c.strokeStyle = mix('#3b404b', '#d2cdc2', d); c.lineWidth = 1.6; c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1;
    c.beginPath();
    for (const f of [1 / 3, 2 / 3]) { c.moveTo(46 * f, -14); c.lineTo(5 + 36 * f, -40); }
    c.moveTo(2.5, -27); c.lineTo(43.5, -27);
    c.stroke();
    if (on > 0) {
      c.save(); quad(); c.clip();
      const gx = (((this.time * 0.35 + i * 0.17) % 1.8) - 0.4) * 60;
      const sg = c.createLinearGradient(gx - 14, -40, gx + 14, -14);
      sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,' + (0.35 * Math.min(1, on)).toFixed(3) + ')'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = sg; c.fillRect(-5, -45, 60, 35);
      c.restore();
    }
    c.restore();
  };

  Scene.prototype.hab = function (c, d) {
    const x = Z.habX, b = Z.habBase, night = 1 - d;
    this.shadow(c, x + 55, b + 3, 64, 9);
    c.strokeStyle = mix('#3a3f49', '#9b968d', d); c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(x + 30, b - 44); c.lineTo(x + 22, b - 84); c.stroke();
    c.beginPath(); c.ellipse(x + 22, b - 84, 9, 4, -0.4, 0, 6.29); c.stroke();
    c.fillStyle = Math.sin(this.time * 3) > 0 ? this.team : rgba(this.team, 0.25);
    c.beginPath(); c.arc(x + 22, b - 91, 3, 0, 6.29); c.fill();
    const g = c.createLinearGradient(x, b - 58, x + 110, b);
    g.addColorStop(0, mix('#4b5160', '#e3ded3', d)); g.addColorStop(1, mix('#262b36', '#8e897f', d));
    c.fillStyle = g;
    c.beginPath(); c.ellipse(x + 55, b - 4, 55, 54, 0, Math.PI, 0); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.16)'; c.lineWidth = 1.4;
    c.beginPath(); c.ellipse(x + 55, b - 4, 55, 30, 0, Math.PI, 0); c.stroke();
    c.beginPath(); c.ellipse(x + 55, b - 4, 26, 54, 0, Math.PI, 0); c.stroke();
    c.fillStyle = mix('#1f232c', '#5f5b55', d); rr(c, x - 4, b - 8, 118, 10, 4); c.fill();
    c.fillStyle = this.team; c.fillRect(x - 4, b - 8, 118, 2.5);
    const lit = night > 0.3;
    for (const [wx, wy] of [[24, -30], [48, -38], [74, -32]]) {
      c.fillStyle = lit ? '#ffd48a' : mix('#1c2533', '#34465f', d);
      rr(c, x + wx, b + wy, 13, 8, 3); c.fill();
      if (lit) glow(c, x + wx + 6, b + wy + 4, 34, '#ffc070', 0.3 * night);
    }
    c.fillStyle = mix('#1b1f27', '#4c4842', d); rr(c, x + 90, b - 30, 15, 24, 4); c.fill();
    c.strokeStyle = mix('#3a3f49', '#bcb7ad', d); c.lineWidth = 2;
    c.beginPath(); c.moveTo(x + 120, b); c.lineTo(x + 120, b - 64); c.stroke();
    c.fillStyle = this.team;
    c.beginPath(); c.moveTo(x + 120, b - 64);
    for (let k = 0; k <= 6; k++) c.lineTo(x + 120 + k * 5, b - 64 + Math.sin(this.time * 4 + k) * 1.6);
    for (let k = 6; k >= 0; k--) c.lineTo(x + 120 + k * 5, b - 50 + Math.sin(this.time * 4 + k) * 1.6);
    c.closePath(); c.fill();
  };

  Scene.prototype.cable = function (c, d) {
    const s = this.s, fl = this.fl, live = this.t >= 0;
    const F = s.m[2], P = s.m[3], G = s.m[4], B = s.m[5];
    if (F + P + G + B === 0) return;
    c.strokeStyle = mix('#2a2e36', '#5d5a55', d); c.lineWidth = 4;
    c.beginPath(); c.moveTo(300, 298); c.lineTo(300, 414); c.moveTo(452, 298); c.lineTo(452, 440); c.stroke();
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(291, 303); c.lineTo(309, 303); c.moveTo(443, 303); c.lineTo(461, 303); c.stroke();
    if (G) { c.beginPath(); c.moveTo(300, 302); c.quadraticCurveTo(250, 326, Z.panelX + 2 * Z.panelGap + 23, Z.panelRows[1] - 30); c.stroke(); }
    c.strokeStyle = mix('#2c3038', '#4f535b', d); c.lineWidth = 2.5;
    c.beginPath(); for (let x = 300; x <= 652; x += 8) c.lineTo(x, cableY(x)); c.stroke();
    c.lineWidth = 2;
    c.beginPath();
    if (F) { const xx = Z.furnX + 30; c.moveTo(xx, cableY(xx)); c.lineTo(xx, Z.base - Z.furnH - 8); }
    if (P) { const xx = Z.pressX + Z.pressW / 2; c.moveTo(xx, cableY(xx)); c.lineTo(xx, Z.base - Z.pressH - 8); }
    c.stroke();
    if (fl && live && fl.need > 0 && fl.f > 0.01) {
      const fromBatt = fl.battFlow < -0.01 && fl.supply < 0.01;
      c.fillStyle = fl.f < 0.999 ? COL.bad : fromBatt ? COL.cam : COL.power;
      for (let o = 0; o < 352; o += 30) {
        const x = fromBatt ? 652 - ((o + this.cableOff) % 352) : 300 + ((o + this.cableOff) % 352);
        c.beginPath(); c.arc(x, cableY(x), 3, 0, 6.29); c.fill();
      }
    }
  };

  Scene.prototype.hopper = function (c, d) {
    const x = Z.hopX, top = 408, bot = Z.beltTop - 8;
    this.shadow(c, x, Z.beltTop + 4, 26, 5);
    c.strokeStyle = mix('#23272f', '#5b5852', d); c.lineWidth = 3;
    c.beginPath(); c.moveTo(x - 20, top + 10); c.lineTo(x - 24, Z.beltTop + 2); c.moveTo(x + 20, top + 10); c.lineTo(x + 24, Z.beltTop + 2); c.stroke();
    const g = c.createLinearGradient(x - 30, 0, x + 30, 0);
    g.addColorStop(0, mix('#3a3f4a', '#a29d93', d)); g.addColorStop(1, mix('#22262e', '#6a665f', d));
    c.fillStyle = g;
    c.beginPath(); c.moveTo(x - 30, top); c.lineTo(x + 30, top); c.lineTo(x + 10, bot); c.lineTo(x - 10, bot); c.closePath(); c.fill();
    c.fillStyle = this.team;
    c.beginPath(); c.moveTo(x - 25, top + 9); c.lineTo(x + 25, top + 9); c.lineTo(x + 22.5, top + 13); c.lineTo(x - 22.5, top + 13); c.closePath(); c.fill();
    c.fillStyle = mix('#4a505c', '#cfc9bd', d); c.beginPath(); c.ellipse(x, top, 30, 7, 0, 0, 6.29); c.fill();
    c.fillStyle = '#121418'; c.beginPath(); c.ellipse(x, top + 1, 24, 4.5, 0, 0, 6.29); c.fill();
  };

  Scene.prototype.belt = function (c, d) {
    const x0 = Z.beltX0, x1 = Z.beltX1, y = Z.beltTop;
    c.fillStyle = 'rgba(0,0,0,' + (0.15 + 0.15 * d).toFixed(3) + ')'; c.fillRect(x0 + 6, y + 14, x1 - x0, 6);
    c.fillStyle = mix('#1d2027', '#4a4741', d);
    for (let x = x0 + 20; x < x1; x += 70) c.fillRect(x, y + 12, 5, 14);
    c.fillStyle = mix('#2a2e37', '#66625b', d); c.fillRect(x0, y - 13, x1 - x0, 13);
    c.strokeStyle = 'rgba(0,0,0,.28)'; c.lineWidth = 2;
    c.beginPath(); for (let x = x0 + this.beltOff; x < x1; x += 22) { c.moveTo(x, y - 12); c.lineTo(x + 6, y - 1); } c.stroke();
    c.fillStyle = mix('#3a3f49', '#9a958c', d); c.fillRect(x0, y - 14, x1 - x0, 2.5);
    c.fillStyle = mix('#14171c', '#2e2c29', d); c.fillRect(x0, y, x1 - x0, 12);
    c.fillStyle = mix('#2a2e36', '#6a665f', d);
    for (let x = x0 + 10; x < x1; x += 36) { c.beginPath(); c.arc(x, y + 6, 3.5, 0, 6.29); c.fill(); }
  };

  Scene.prototype.item = function (c, x, y, st, d, sc) {
    if (st === 2) {
      glow(c, x, y - 1, 16 * sc, COL.kristal, 0.26 + 0.3 * (1 - d));
      c.fillStyle = COL.kristal;
      c.beginPath(); c.moveTo(x, y - 8 * sc); c.lineTo(x + 6 * sc, y - sc); c.lineTo(x, y + 5 * sc); c.lineTo(x - 6 * sc, y - sc); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.6)';
      c.beginPath(); c.moveTo(x, y - 8 * sc); c.lineTo(x + 2 * sc, y - sc); c.lineTo(x - 6 * sc, y - sc); c.closePath(); c.fill();
    } else if (st === 1) {
      c.fillStyle = COL.cam; rr(c, x - 5 * sc, y - 5 * sc, 10 * sc, 10 * sc, 2); c.fill();
      c.strokeStyle = 'rgba(20,60,80,.6)'; c.lineWidth = 1; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(x - 3.5 * sc, y - 3.5 * sc, 3 * sc, 3 * sc);
    } else {
      c.fillStyle = mix('#6b665e', '#bdb6a8', d);
      c.beginPath(); c.ellipse(x, y + 1, 6 * sc, 4.2 * sc, 0, 0, 6.29); c.fill();
      c.fillStyle = 'rgba(0,0,0,.18)';
      c.beginPath(); c.ellipse(x + 1, y + 2.5, 5 * sc, 2 * sc, 0, 0, 6.29); c.fill();
    }
  };

  Scene.prototype.furnaces = function (c, d) {
    const F = this.s.m[2], n = Math.min(F, 3);
    if (!F) { this.ghost(c, Z.furnX, Z.base - Z.furnH, Z.furnW, Z.furnH); return; }
    for (let i = n - 1; i >= 0; i--) this.furnace(c, Z.furnX + i * 14, Z.base - i * 10, d, i);
    for (const q of this.smoke) {
      c.fillStyle = 'rgba(160,160,160,' + (0.22 * q.life).toFixed(3) + ')';
      c.beginPath(); c.arc(q.x, q.y, q.r, 0, 6.29); c.fill();
    }
  };
  Scene.prototype.furnace = function (c, x, b, d, idx) {
    const w = Z.furnW, h = Z.furnH, gl = clamp(this.furnGlow, 0, 1), dd = d * (idx ? 0.8 : 1);
    this.shadow(c, x + w / 2, b + 2, w * 0.58, 7);
    c.fillStyle = mix('#22262e', '#55524c', dd); rr(c, x + w - 34, b - h - 40, 16, 42, 3); c.fill();
    c.fillStyle = mix('#30343d', '#75716a', dd); rr(c, x + w - 37, b - h - 44, 22, 6, 2); c.fill();
    const g = c.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, mix('#3a3e48', '#97928a', dd)); g.addColorStop(1, mix('#242830', '#615d57', dd));
    c.fillStyle = g; rr(c, x, b - h, w, h, 12); c.fill();
    c.fillStyle = mix('#474c58', '#b8b2a7', dd);
    c.beginPath(); c.moveTo(x + 8, b - h + 1); c.lineTo(x + w - 8, b - h + 1); c.lineTo(x + w - 18, b - h - 9); c.lineTo(x + 18, b - h - 9); c.closePath(); c.fill();
    c.fillStyle = this.team; rr(c, x + 10, b - h + 10, w - 20, 6, 3); c.fill();
    const mx0 = x + 16, mx1 = x + w - 16, my = b - 38;
    const mg = c.createLinearGradient(0, my, 0, b - 6);
    if (gl > 0.02) { mg.addColorStop(0, 'rgba(255,214,120,' + (0.35 + 0.65 * gl).toFixed(3) + ')'); mg.addColorStop(1, 'rgba(255,96,40,' + (0.35 + 0.65 * gl).toFixed(3) + ')'); }
    else { mg.addColorStop(0, '#121419'); mg.addColorStop(1, '#0c0d10'); }
    c.fillStyle = mg;
    c.beginPath(); c.moveTo(mx0, b - 4); c.lineTo(mx0, my + 10); c.quadraticCurveTo(mx0, my, mx0 + 12, my);
    c.lineTo(mx1 - 12, my); c.quadraticCurveTo(mx1, my, mx1, my + 10); c.lineTo(mx1, b - 4); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 2;
    c.beginPath(); for (let k = 0; k < 3; k++) { c.moveTo(x + 14, b - h + 26 + k * 7); c.lineTo(x + 30, b - h + 26 + k * 7); } c.stroke();
    if (!idx && gl > 0.02) glow(c, x + w / 2, b - 16, 92, '#ff8a3c', gl * (0.16 + 0.36 * (1 - d)));
  };

  Scene.prototype.presses = function (c, d) {
    const P = this.s.m[3], n = Math.min(P, 3);
    if (!P) { this.ghost(c, Z.pressX, Z.base - Z.pressH, Z.pressW, Z.pressH); return; }
    const util = this.fl && this.t >= 0 ? this.fl.pressUtil : 0;
    for (let i = n - 1; i >= 0; i--) this.press(c, Z.pressX + i * 16, Z.base - i * 10, this.pressPh + i * 0.9, util, d, i);
  };
  Scene.prototype.press = function (c, x, b, ph, util, d, idx) {
    const w = Z.pressW, h = Z.pressH, dd = d * (idx ? 0.8 : 1);
    this.shadow(c, x + w / 2, b + 2, w * 0.58, 7);
    for (const px of [x, x + w - 16]) {
      const g = c.createLinearGradient(px, 0, px + 16, 0);
      g.addColorStop(0, mix('#3a3e48', '#a29d94', dd)); g.addColorStop(1, mix('#22262e', '#5e5a54', dd));
      c.fillStyle = g; rr(c, px, b - h + 18, 16, h - 18, 3); c.fill();
    }
    c.fillStyle = mix('#1f232a', '#4f4c47', dd); rr(c, x - 4, b - 6, 24, 8, 2); c.fill(); rr(c, x + w - 20, b - 6, 24, 8, 2); c.fill();
    c.fillStyle = mix('#3c414c', '#9d988f', dd); rr(c, x - 6, b - h, w + 12, 26, 5); c.fill();
    c.fillStyle = mix('#4a505c', '#c2bcb1', dd);
    c.beginPath(); c.moveTo(x - 2, b - h + 1); c.lineTo(x + w + 2, b - h + 1); c.lineTo(x + w - 8, b - h - 9); c.lineTo(x + 8, b - h - 9); c.closePath(); c.fill();
    c.fillStyle = this.team; rr(c, x + 4, b - h + 9, w - 8, 6, 3); c.fill();
    const pist = util > 0.01 ? (1 - Math.cos(ph)) / 2 : 0.12;
    const topY = b - h + 26, ram = topY + 22 + pist * (h - 108);
    c.fillStyle = mix('#2a2e36', '#77736c', dd); rr(c, x + w / 2 - 12, topY, 24, 24, 3); c.fill();
    c.fillStyle = mix('#8b919c', '#e6e2da', dd); c.fillRect(x + w / 2 - 4, topY + 22, 8, ram - topY - 22);
    c.fillStyle = mix('#474c57', '#b3aea4', dd); rr(c, x + 18, ram, w - 36, 16, 3); c.fill();
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x + 18, ram + 12, w - 36, 4);
    c.fillStyle = util > 0.95 ? this.team : util > 0.01 ? '#ffb347' : COL.bad;
    c.beginPath(); c.arc(x + w - 4, b - h + 13, 4, 0, 6.29); c.fill();
    if (!idx && util > 0.01 && pist > 0.9) glow(c, x + w / 2, b - 34, 44, COL.kristal, (pist - 0.9) * 7);
  };

  Scene.prototype.rail = function (c, d) {
    const [x0, y0, x1, y1] = Z.rail, L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L, nx = -uy, ny = ux;
    this.shadow(c, x0 + 20, Z.beltTop + 16, 36, 6);
    c.strokeStyle = mix('#272b33', '#615e58', d); c.lineWidth = 4;
    c.beginPath();
    for (const f of [0.38, 0.72]) { const px = x0 + ux * L * f, py = y0 + uy * L * f; c.moveTo(px, py); c.lineTo(px + 2, Z.beltTop + 12 - f * 8); }
    c.stroke();
    c.fillStyle = mix('#23272f', '#5d5a54', d); rr(c, x0 - 10, Z.beltTop - 14, 44, 30, 5); c.fill();
    c.fillStyle = this.team; c.fillRect(x0 - 10, Z.beltTop - 14, 44, 3);
    c.strokeStyle = mix('#3b404a', '#aaa59b', d); c.lineWidth = 4; c.lineCap = 'round';
    for (const o of [-5, 5]) { c.beginPath(); c.moveTo(x0 + nx * o, y0 + ny * o); c.lineTo(x1 + nx * o, y1 + ny * o); c.stroke(); }
    c.lineCap = 'butt';
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 2;
    c.beginPath(); for (let k = 0.06; k < 1; k += 0.08) { const px = x0 + ux * L * k, py = y0 + uy * L * k; c.moveTo(px - nx * 7, py - ny * 7); c.lineTo(px + nx * 7, py + ny * 7); } c.stroke();
    c.strokeStyle = this.team; c.lineWidth = 4;
    c.beginPath(); c.ellipse(x1, y1, 13, 9, Math.atan2(uy, ux) + Math.PI / 2, 0, 6.29); c.stroke();
    glow(c, x1, y1, 34, this.team, 0.14 + 0.2 * (1 - d) + (this.railItems.length ? 0.1 : 0));
    for (const q of this.railItems) {
      const px = x0 + ux * L * q.k, py = y0 + uy * L * q.k - 4;
      const col = q.st === 2 ? COL.kristal : q.st === 1 ? COL.cam : COL.toz;
      c.strokeStyle = rgba(col, 0.6); c.lineWidth = 3;
      c.beginPath(); c.moveTo(px, py); c.lineTo(px - ux * 10 * q.v, py - uy * 10 * q.v); c.stroke();
      this.item(c, px, py, q.st, d, 0.85);
    }
    for (const f of this.flies) {
      const col = f.st === 2 ? COL.kristal : f.st === 1 ? COL.cam : COL.toz;
      const g = c.createLinearGradient(f.x, f.y, f.x - ux * 46, f.y - uy * 46);
      g.addColorStop(0, rgba(col, f.life)); g.addColorStop(1, rgba(col, 0));
      c.strokeStyle = g; c.lineWidth = 3.5;
      c.beginPath(); c.moveTo(f.x, f.y); c.lineTo(f.x - ux * 46, f.y - uy * 46); c.stroke();
      c.fillStyle = rgba('#ffffff', f.life); c.beginPath(); c.arc(f.x, f.y, 2.2, 0, 6.29); c.fill();
    }
  };

  Scene.prototype.batteries = function (c, d) {
    const s = this.s, fl = this.fl, B = s.m[5], n = Math.min(B, 3);
    if (!B) { this.ghost(c, Z.battX, Z.battBase - 48, 30, 48); return; }
    const cap = KK.R.battCap * B, lvl = cap ? s.batt / cap : 0;
    const dis = !!(fl && this.t >= 0 && fl.battFlow < -0.01);
    for (let i = 0; i < n; i++) this.battery(c, Z.battX + i * Z.battGap, Z.battBase, lvl, d, dis);
  };
  Scene.prototype.battery = function (c, x, b, lvl, d, dis) {
    const w = 28, h = 48;
    this.shadow(c, x + w / 2, b + 2, 18, 4);
    const g = c.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, mix('#353a45', '#a19c93', d)); g.addColorStop(1, mix('#1f232b', '#5f5b55', d));
    c.fillStyle = g; rr(c, x, b - h, w, h, 7); c.fill();
    c.fillStyle = mix('#454b57', '#c9c3b8', d); c.beginPath(); c.ellipse(x + w / 2, b - h + 3, w / 2 - 1, 4, 0, 0, 6.29); c.fill();
    c.fillStyle = mix('#2b2f37', '#6d6963', d); rr(c, x + w / 2 - 5, b - h - 5, 10, 6, 2); c.fill();
    c.fillStyle = '#0d1014'; rr(c, x + 7, b - h + 11, w - 14, h - 19, 3); c.fill();
    const fh = (h - 21) * clamp(lvl, 0, 1);
    c.fillStyle = dis ? '#b6ecff' : COL.cam; c.fillRect(x + 8, b - 9 - fh, w - 16, fh);
    c.fillStyle = this.team; c.fillRect(x, b - 7, w, 2.5);
    if (lvl > 0.02) glow(c, x + w / 2, b - h / 2, 38, COL.cam, (dis ? 0.3 : 0.1) * (0.5 + 0.5 * (1 - d)) * Math.min(1, lvl * 3));
  };

  Scene.prototype.motesDraw = function (c) {
    const hx = Z.hopX, hy = 404, arc = (k) => Math.sin(Math.PI * clamp(k, 0, 1)) * 42;
    for (const m of this.motes) {
      const k = m.k, k2 = Math.max(0, k - 0.07);
      c.fillStyle = rgba(COL.toz, 0.3);
      c.beginPath(); c.arc(lerp(m.x0, hx, k2), lerp(m.y0, hy, k2) - arc(k2), 2, 0, 6.29); c.fill();
      c.fillStyle = rgba(COL.toz, 0.9);
      c.beginPath(); c.arc(lerp(m.x0, hx, k), lerp(m.y0, hy, k) - arc(k), 3.2, 0, 6.29); c.fill();
    }
  };

  Scene.prototype.robotsDraw = function (c, d) {
    const night = 1 - d;
    for (const q of this.puffs) {
      c.fillStyle = 'rgba(181,171,154,' + (0.32 * q.life).toFixed(3) + ')';
      c.beginPath(); c.arc(q.x, q.y, 3 + (1 - q.life) * 6, 0, 6.29); c.fill();
    }
    const list = this.robots.slice().sort((a, b) => a.y - b.y);
    if (night > 0.2) {
      const op = c.globalCompositeOperation;
      c.globalCompositeOperation = 'lighter';
      for (const r of list) {
        const dir = Math.cos(r.a) >= 0 ? 1 : -1;
        const g = c.createLinearGradient(r.x + dir * 12, 0, r.x + dir * 100, 0);
        g.addColorStop(0, 'rgba(255,240,205,' + (0.3 * night * r.born).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,240,205,0)');
        c.fillStyle = g;
        c.beginPath(); c.moveTo(r.x + dir * 12, r.y - 6); c.lineTo(r.x + dir * 100, r.y - 30); c.lineTo(r.x + dir * 100, r.y + 22); c.closePath(); c.fill();
      }
      c.globalCompositeOperation = op;
    }
    for (const r of list) this.robot(c, r, d);
  };
  Scene.prototype.robot = function (c, r, d) {
    const dir = Math.cos(r.a) >= 0 ? 1 : -1, s = r.born;
    this.shadow(c, r.x, r.y + 10, 17 * s, 4.5 * s);
    c.save(); c.translate(r.x, r.y); c.scale(dir * s, s);
    c.fillStyle = '#121418'; rr(c, -15, 1, 10, 9, 3); c.fill(); rr(c, 5, 1, 10, 9, 3); c.fill();
    c.fillStyle = mix('#3a3c42', '#6f6b64', d); c.beginPath(); c.ellipse(16, 8, 6, 2.6, 0, 0, 6.29); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 1.2;
    c.beginPath(); for (let k = 0; k < 3; k++) { const a = r.br + k * 2.09; c.moveTo(16, 8); c.lineTo(16 + Math.cos(a) * 6, 8 + Math.sin(a) * 2.6); } c.stroke();
    const g = c.createLinearGradient(0, -16, 0, 6);
    g.addColorStop(0, mix('#6d7280', '#f0ebe1', d)); g.addColorStop(1, mix('#3a3e48', '#a7a299', d));
    c.fillStyle = g;
    c.beginPath(); c.moveTo(-16, 4); c.quadraticCurveTo(-16, -16, 0, -16); c.quadraticCurveTo(16, -16, 16, 4); c.closePath(); c.fill();
    c.fillStyle = this.team; c.fillRect(-16, 1, 32, 3.2);
    c.fillStyle = '#10141c'; c.beginPath(); c.ellipse(7, -7, 6.5, 4, 0, 0, 6.29); c.fill();
    c.fillStyle = 'rgba(160,220,255,.75)'; c.beginPath(); c.ellipse(5.5, -8.4, 2.2, 1.2, 0, 0, 6.29); c.fill();
    c.fillStyle = Math.sin(r.ph) > -0.2 ? this.team : rgba(this.team, 0.25);
    c.beginPath(); c.arc(-3, -17, 2.6, 0, 6.29); c.fill();
    c.restore();
  };

  Scene.prototype.fx = function (c, d) {
    const env = this.env;
    c.textAlign = 'center';
    for (const r of this.rings) {
      const a = r.life, rad = 16 + (1 - a) * 70;
      c.strokeStyle = rgba(this.team, a); c.lineWidth = 3;
      c.beginPath(); c.ellipse(r.x, r.y, rad, rad * 0.45, 0, 0, 6.29); c.stroke();
      c.font = '900 28px ' + FONT_D;
      c.fillStyle = rgba(this.team, Math.min(1, a * 1.6));
      c.fillText(r.text, r.x, r.y - 44 - (1 - a) * 26);
    }
    c.font = '900 26px ' + FONT_D;
    for (const q of this.pops) { c.fillStyle = rgba('#ffffff', q.life); c.fillText(q.text, q.x, q.y); }
    for (const q of this.sparks) { c.fillStyle = 'rgba(255,200,120,' + clamp(q.life * 1.5, 0, 1).toFixed(3) + ')'; c.fillRect(q.x, q.y, 2.5, 2.5); }
    if (this.bo > 0.05) {
      c.save(); c.globalAlpha = this.bo;
      rr(c, Z.panelX - 10, 312, 300, 100, 10);
      c.fillStyle = 'rgba(255,90,78,.16)'; c.fill();
      c.strokeStyle = 'rgba(255,90,78,.6)'; c.lineWidth = 2; c.setLineDash([8, 6]); c.stroke(); c.setLineDash([]);
      c.restore();
    }
    if (this.zap > 0) {
      c.fillStyle = 'rgba(255,90,78,' + (0.25 * this.zap).toFixed(3) + ')'; c.fillRect(0, 0, W, H);
      c.strokeStyle = 'rgba(255,244,240,' + this.zap.toFixed(3) + ')'; c.lineWidth = 5; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(196, -5); c.lineTo(150, 120); c.lineTo(204, 160); c.lineTo(160, 350); c.stroke();
      c.lineJoin = 'miter';
      glow(c, 160, 362, 130, COL.bad, 0.5 * this.zap);
    }
    if (this.meteor >= 0) {
      const m = this.meteor, tx = 170, ty = 372;
      if (m < 0.6) {
        const q = m / 0.6, mx = 420 + q * (tx - 420), my = -20 + q * (ty + 20);
        c.strokeStyle = 'rgba(255,214,160,.9)'; c.lineWidth = 5;
        c.beginPath(); c.moveTo(mx, my); c.lineTo(mx + 60, my - 70); c.stroke();
        c.fillStyle = '#fff4dc'; c.beginPath(); c.arc(mx, my, 6, 0, 6.29); c.fill();
      } else {
        const q = (m - 0.6) / 1.1;
        c.strokeStyle = 'rgba(255,200,140,' + (1 - q).toFixed(3) + ')'; c.lineWidth = 4;
        c.beginPath(); c.ellipse(tx, ty, 10 + q * 90, (10 + q * 90) * 0.45, 0, 0, 6.29); c.stroke();
        glow(c, tx, ty, 80, '#ffb070', 0.5 * (1 - q));
      }
    }
    if (env.tozMul > 1) {
      c.fillStyle = 'rgba(181,171,154,.1)'; c.fillRect(0, 0, W, H);
      c.strokeStyle = 'rgba(210,200,182,.24)'; c.lineWidth = 1.5;
      c.beginPath();
      for (let i = 0; i < 30; i++) {
        const x = ((i * 97 + this.time * 260) % (W + 80)) - 40, y = (i * 53) % 420 + 90;
        c.moveTo(x, y); c.lineTo(x + 34, y + 4);
      }
      c.stroke();
    }
    if (env.solarMul > 1 && d > 0.5) { c.fillStyle = 'rgba(255,214,140,.06)'; c.fillRect(0, 0, W, H); }
    if (env.price.kristal !== KK.PRICE.kristal) this.tag(c, Z.rail[2] - 46, Z.rail[3] - 30, 'KRİSTAL ' + env.price.kristal + '₺', COL.bad);
  };
  Scene.prototype.tag = function (c, x, y, text, col) {
    c.font = '800 19px ' + FONT_D; c.textAlign = 'center';
    const w = c.measureText(text).width + 20;
    rr(c, x - w / 2, y - 16, w, 28, 6);
    c.fillStyle = 'rgba(6,8,12,.84)'; c.fill();
    c.strokeStyle = col; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = col; c.fillText(text, x, y + 5);
  };

  // Kayanın ön yüzündeki isim plakaları: makine sayıları
  Scene.prototype.plates = function (c, d) {
    const s = this.s, fl = this.fl, live = this.t >= 0;
    const ls = 'letterSpacing' in c;
    c.font = '800 19px ' + FONT_D; c.textBaseline = 'middle'; c.textAlign = 'left';
    if (ls) c.letterSpacing = '1.5px';
    Z.plates.forEach(([name, id], i) => {
      const n = s.m[id], x = Z.plateX[i], y = frontY(uAt(x)) + 22;
      const bad = live && n > 0 && ((id === 2 && fl && fl.furnUtil < 0.95) || (id === 3 && fl && fl.pressUtil < 0.95) || (id === 4 && this.bo > 0.5));
      const cnt = n ? '×' + n : '—';
      const w1 = c.measureText(name).width, w2 = c.measureText(cnt).width, w = w1 + w2 + 34;
      rr(c, x - w / 2, y - 14, w, 28, 6);
      c.fillStyle = 'rgba(0,0,0,.36)'; c.fill();
      c.strokeStyle = bad ? 'rgba(255,90,78,.85)' : 'rgba(255,255,255,' + (0.08 + 0.08 * d).toFixed(3) + ')'; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = n ? '#e9ecef' : '#7e8794'; c.fillText(name, x - w / 2 + 12, y + 1);
      c.fillStyle = bad ? COL.bad : n ? this.team : '#7e8794'; c.fillText(cnt, x - w / 2 + 22 + w1, y + 1);
    });
    if (ls) c.letterSpacing = '0px';
    c.textBaseline = 'alphabetic';
  };

  // ---- Oyun durumu ve demo botları --------------------------------------------
  let G = null;
  const scenes = {};
  const shown = { y: 100, c: 100, tug: 0.5 };

  function newGame() {
    const seed = (Math.random() * 1e9) >>> 0;
    const rand = KK.rng(seed);
    const ev = KK.planEvent(rand);
    G = {
      seed, rand, ev, phase: 'run', t: -KK.PREP, k: 0, wStart: -KK.PREP,
      sides: { y: KK.newSide(), c: KK.newSide() },
      pickY: null, planY: 0, lockAt: 0,
      target: [0, 0, 0, 0, 0, 0, 0], votes: [0, 0, 0, 0, 0, 0, 0], curve: [1, 1, 1, 1, 1, 1, 1],
      prevC: 1, history: [], holdUntil: 0, restartAt: 0, lastVoter: '', voterT: 0, manual: false,
    };
    shown.y = shown.c = KK.START_MONEY; shown.tug = 0.5;
    scenes.y.reset(); scenes.c.reset();
    $('end').hidden = true;
    stinger.hide();
    buildTrack();
    startWindow();
  }

  function knownEvent(tb) { return Object.assign({}, G.ev, { known: tb >= G.ev.t - KK.TURN - 1e-6 }); }

  function project(s, tb) {
    const p = KK.clone(s);
    let t = Math.max(G.t, 0);
    while (t < tb - 1e-9) { const h = Math.min(0.5, tb - t); KK.step(p, h, KK.sideEnv(KK.envAt(t, G.ev), p, t)); t += h; }
    return p;
  }

  function crowd(vals, prev) {
    const finite = vals.filter((v) => v != null);
    const vmax = Math.max.apply(null, finite), vmin = Math.min.apply(null, finite);
    const tau = Math.max(60, (vmax - vmin) * 0.12);
    const sm = vals.map((v) => (v == null ? 0 : Math.exp((v - vmax) / tau)));
    const zs = sum(sm) || 1, n = vals.length;
    const shares = [], early = [];
    for (let i = 0; i < n; i++) {
      const s = MOOD.smart * sm[i] / zs, h = i === 3 ? MOOD.hype : 0, tr = i === 6 ? MOOD.troll : 0, f = i === prev ? MOOD.follow : 0, r = MOOD.random / n;
      const tot = s + h + tr + f + r;
      shares.push(tot); early.push((h + tr + f * 0.5) / tot);
    }
    return { shares, early };
  }

  // Yayıncı botu: çoğunlukla en iyi hamle, bazen ikincisi
  function botPick(vals) {
    const idx = vals.map((v, i) => [v, i]).filter((x) => x[0] != null).sort((a, b) => b[0] - a[0]).map((x) => x[1]);
    return idx[G.rand() < 0.9 ? 0 : Math.min(1, idx.length - 1)];
  }

  function startWindow() {
    const tb = G.k * KK.TURN;
    G.wStart = tb - KK.TURN;
    const pY = project(G.sides.y, tb), pC = project(G.sides.c, tb);
    const kn = knownEvent(tb);
    if (kn.known && kn.dur === 0 && Math.abs(kn.t - tb) < 1e-6) { KK.applyInstantEvent(pY, kn); KK.applyInstantEvent(pC, kn); }
    const vC = KK.evaluate(pC, tb, kn, pY);
    const { shares, early } = crowd(vC, G.prevC);
    const n = Math.round(1100 + G.rand() * 1900);
    const noisy = shares.map((p) => p * (0.75 + G.rand() * 0.5));
    const z = sum(noisy) || 1;
    G.target = noisy.map((p) => Math.round((p / z) * n));
    G.curve = early.map((e) => 1.25 - 0.7 * e);
    G.votes = G.target.map(() => 0);
    G.planY = botPick(KK.evaluate(pY, tb, kn, pC));
    G.pickY = null;
    G.lockAt = G.wStart + 3 + G.rand() * 7;
  }

  function reasonOf(pre, opp, id, r, g, tb) {
    const best = KK.MACHINES[g.bestId].name;
    if (id && !r.ok) return r.reason === 'hak' ? 'Karartma hakkı kalmamıştı, tur boşa gitti' : KK.MACHINES[id].name + ' için para yetmedi, tur boşa gitti';
    if (id === 6) {
      if (KK.isNight(tb)) return 'gece Karartma; paneller zaten kapalıydı';
      if (opp.m[5] > 0 && opp.batt > 150) return 'rakibin bataryası doluyken Karartma';
      return 'Karartma rakibe az zarar verdi';
    }
    const fl = KK.step(KK.clone(pre), 1, KK.envAt(0, null));
    if (id === 3 && fl.supply < fl.need + KK.R.pressPow - 1e-9) return 'enerji yetmezken Pres alındı';
    if (id === 3 && KK.R.furnaceRate * pre.m[2] < pre.m[3] + 1) return 'fırın azken Pres alındı';
    if (id && tb >= 240) return 'son dakikada ' + KK.MACHINES[id].name + ' alındı, kendini ödemedi';
    if (id === 0) return 'biriktirmek yerine ' + best + ' almak gerekiyordu';
    return KK.MACHINES[id].name + ' yerine ' + best + ' daha iyiydi';
  }

  function floatCost(key, v) {
    const host = $(key === 'y' ? 'bugY' : 'bugC');
    const sp = document.createElement('span');
    sp.className = 'float num'; sp.textContent = '−₺' + fmt(v);
    host.appendChild(sp);
    setTimeout(() => sp.remove(), 1600);
  }

  function resolve() {
    const k = G.k, tb = k * KK.TURN, ev = G.ev;
    if (Math.abs(ev.t - tb) < 1e-6 && ev.dur === 0) {
      KK.applyInstantEvent(G.sides.y, ev); KK.applyInstantEvent(G.sides.c, ev);
      scenes.y.meteorHit(); scenes.c.meteorHit();
    }
    const kn = knownEvent(tb);
    const preY = KK.clone(G.sides.y), preC = KK.clone(G.sides.c);
    const vY = KK.evaluate(preY, tb, kn, preC), vC = KK.evaluate(preC, tb, kn, preY);
    const yId = G.pickY == null ? 0 : G.pickY;
    let cId = 0;
    for (let i = 1; i < G.target.length; i++) if (G.target[i] > G.target[cId]) cId = i;
    G.votes = G.target.slice();
    const costY = KK.costOf(G.sides.y, yId), costC = KK.costOf(G.sides.c, cId);
    const ry = KK.buy(G.sides.y, yId), rc = KK.buy(G.sides.c, cId);
    if (ry.ok && yId) floatCost('y', costY);
    if (rc.ok && cId) floatCost('c', costC);
    if (yId === 6 && ry.ok) { KK.blackout(G.sides.c, tb); scenes.c.hit(); }
    if (cId === 6 && rc.ok) { KK.blackout(G.sides.y, tb); scenes.y.hit(); }
    if (ry.ok && yId > 0 && yId < 6) scenes.y.built(yId);
    if (rc.ok && cId > 0 && cId < 6) scenes.c.built(cId);
    const gy = KK.grade(vY, yId, ry.ok), gc = KK.grade(vC, cId, rc.ok);
    gy.why = gy.level === 'g' ? '' : reasonOf(preY, preC, yId, ry, gy, tb);
    gc.why = gc.level === 'g' ? '' : reasonOf(preC, preY, cId, rc, gc, tb);
    const total = sum(G.target);
    G.history.push({
      k, diff: preY.money - preC.money,
      y: { id: yId, ok: ry.ok, reason: ry.reason, chosen: G.pickY != null, g: gy },
      c: { id: cId, ok: rc.ok, reason: rc.reason, pct: total ? Math.round((G.target[cId] / total) * 100) : 0, total, g: gc },
    });
    stinger.show(G.history[G.history.length - 1]);
    G.holdUntil = performance.now() + REVEAL_MS / Math.sqrt(opts.speed);
    G.prevC = cId;
    G.k++;
    if (G.k < KK.TURNS) startWindow();
    else { G.target = G.target.map(() => 0); G.votes = G.target.slice(); }
  }

  function finish() {
    G.phase = 'end';
    G.t = KK.DUR;
    showEnd();
    G.restartAt = performance.now() + 14000;
  }

  function advance(dt) {
    const end = G.t + dt;
    let guard = 0;
    while (G.phase === 'run' && G.t < end - 1e-9 && guard++ < 4000) {
      const nextB = G.k < KK.TURNS ? G.k * KK.TURN : KK.DUR;
      const to = Math.min(end, nextB, G.t + 0.1);
      const h = to - G.t;
      if (G.t >= -1e-9 && h > 1e-9) {
        const env = KK.envAt(G.t, G.ev);
        KK.step(G.sides.y, h, KK.sideEnv(env, G.sides.y, G.t));
        KK.step(G.sides.c, h, KK.sideEnv(env, G.sides.c, G.t));
      }
      G.t = to;
      if (!G.manual && G.pickY == null && G.k < KK.TURNS && G.t >= G.lockAt) G.pickY = G.planY;
      if (Math.abs(G.t - nextB) < 1e-7) {
        G.t = nextB;
        if (G.k < KK.TURNS) resolve(); else finish();
        break;
      }
    }
    // Oylar tur boyunca birikir; coşkulu oylar (pres, karartma) erken gelir
    if (G.k < KK.TURNS) {
      const p = clamp((G.t - G.wStart) / KK.TURN, 0, 1);
      for (let i = 0; i < G.votes.length; i++) {
        const v = Math.floor(G.target[i] * Math.pow(p, G.curve[i]));
        if (v > G.votes[i]) G.votes[i] = v;
      }
      G.voterT += dt;
      if (G.voterT > 0.5 && p > 0.02) {
        G.voterT = 0;
        const w = G.target.map((v, i) => v * G.curve[i] * Math.pow(Math.max(p, 0.03), G.curve[i] - 1));
        let r = Math.random() * sum(w), i = 0;
        while (i < w.length - 1 && r > w[i]) { r -= w[i]; i++; }
        G.lastVoter = pick(NAME_A) + pick(NAME_B) + ' → ' + i;
      }
    }
  }

  function flowOf(s) {
    if (G.t >= 0 && s.flow) return s.flow;
    return KK.step(KK.clone(s), 1, KK.sideEnv(KK.envAt(Math.max(0, G.t), G.ev), s, Math.max(0, G.t)));
  }

  // ---- Açılış geçişi ----------------------------------------------------------
  const stinger = {
    el: null, state: 'off', outAt: 0,
    show(h) {
      const el = this.el;
      const panel = (key, e) => {
        const label = key === 'y' ? 'Yayıncı' : 'Chat · %' + e.pct + ' · ' + fmt(e.total) + ' oy';
        const name = key === 'y' && e.id === 0 && !e.chosen ? 'Seçim yok' : KK.MACHINES[e.id].name;
        const lv = e.g.level;
        const verdict = VERDICT[lv] + (lv !== 'g' ? ' · ≈' + fmt(e.g.loss) + '₺' : '');
        const stamp = e.id && !e.ok ? '<i class="stamp">' + (e.reason === 'hak' ? 'Hak bitti' : 'Para yetmedi') + '</i>' : '';
        return '<div class="st-p ' + key + '"><small>' + label + '</small><div class="pick">' + icon(e.id) + '<b>' + name + '</b></div>' +
          '<span class="verdict ' + lv + '">' + verdict + '</span>' + stamp + '</div>';
      };
      let note = '';
      if (h.y.id === 6 && h.y.ok && h.c.id === 6 && h.c.ok) note = 'Karşılıklı karartma!';
      else if (h.y.id === 6 && h.y.ok) note = "Yayıncı chat'in ışıklarını kapattı";
      else if (h.c.id === 6 && h.c.ok) note = 'Chat yayıncının ışıklarını kapattı';
      else if (h.y.id === h.c.id && h.y.id !== 0) note = 'Aynı seçim!';
      else if (h.y.g.level === 'g' && h.c.g.level === 'r') note = 'Bu turu yayıncı aldı';
      else if (h.c.g.level === 'g' && h.y.g.level === 'r') note = 'Bu turu chat aldı';
      el.innerHTML = '<div class="st-k">Karar ' + (h.k + 1) + ' / ' + KK.TURNS + '</div>' + panel('y', h.y) + panel('c', h.c) +
        '<div class="st-vs">VS</div>' + (note ? '<div class="st-note">' + note + '</div>' : '');
      el.classList.remove('out', 'on'); void el.offsetWidth; el.classList.add('on');
      el.hidden = false; this.state = 'on';
    },
    tick(now) {
      if (this.state === 'on' && now >= G.holdUntil) { this.el.classList.add('out'); this.state = 'out'; this.outAt = now + 320; }
      else if (this.state === 'out' && now >= this.outAt) this.hide();
    },
    hide() { this.el.hidden = true; this.el.classList.remove('on', 'out'); this.state = 'off'; },
  };

  // ---- Yayın arayüzü -------------------------------------------------------------
  const refs = {};
  function buildBay(key) {
    const el = $('bay-' + key);
    el.innerHTML =
      '<canvas class="scene"></canvas>' +
      '<div class="bay-head"><div class="who"><span class="team">' + (key === 'y' ? 'Yayıncı' : 'Chat') + '</span>' +
      '<span class="charges"><i></i><i></i><span>Karartma hakkı</span></span></div><span class="grow"></span>' +
      '<span class="rate"><b class="rv num">+0</b><small>₺/sn</small></span>' +
      '<span class="gauge">' + icon('pw') + '<span class="gt pwt num">0 kW</span><span class="gb"><i class="pw"></i></span></span>' +
      '<span class="gauge">' + icon(5) + '<span class="gt btt num">yok</span><span class="gb"><i class="batt bt"></i></span></span></div>' +
      '<div class="alerts"></div>';
    const q = (s) => el.querySelector(s);
    refs[key] = { el, rate: q('.rv'), charges: el.querySelectorAll('.charges i'), pw: q('.pw'), pwt: q('.pwt'), bt: q('.bt'), btt: q('.btt'), alerts: q('.alerts') };
    scenes[key] = new Scene(q('canvas'), key);
  }

  function buildCards() {
    const el = $('cards');
    el.innerHTML = KK.MACHINES.map((m, i) =>
      '<div class="card' + (i === 6 ? ' danger' : '') + '"><div class="clip"><div class="fill"></div></div><span class="flag">CHAT ŞU AN</span>' +
      '<div class="in"><div class="top"><span class="key">' + i + '</span>' + icon(i) + '</div>' +
      '<div class="nm">' + m.name + '</div><div class="desc">' + DESC[i] + '</div>' +
      '<div class="vote"><span class="pct num">%0</span><span class="cnt num">0 oy</span></div>' +
      '<div class="cost"><span class="cy"></span><span class="cc"></span></div></div></div>').join('');
    refs.cards = Array.from(el.children).map((c) => ({
      el: c, fill: c.querySelector('.fill'), pct: c.querySelector('.pct'), cnt: c.querySelector('.cnt'),
      cy: c.querySelector('.cy'), cc: c.querySelector('.cc'), desc: c.querySelector('.desc'),
    }));
  }

  function buildTrack() {
    const tr = $('track');
    tr.querySelectorAll('.tick').forEach((x) => x.remove());
    $('trNight').style.left = (KK.NIGHT_START / KK.DUR) * 100 + '%';
    $('trNight').style.width = ((KK.NIGHT_END - KK.NIGHT_START) / KK.DUR) * 100 + '%';
    refs.ticks = [];
    for (let k = 0; k < KK.TURNS; k++) {
      const d = document.createElement('div');
      d.className = 'tick';
      d.style.left = ((k * KK.TURN) / KK.DUR) * 100 + '%';
      tr.insertBefore(d, $('trNow'));
      refs.ticks.push(d);
    }
    $('trEv').style.left = (G.ev.t / KK.DUR) * 100 + '%';
  }

  function renderBay(key, env) {
    const s = G.sides[key], r = refs[key];
    const fl = flowOf(s);
    setText(r.rate, '+' + fmt1(fl.rate));
    r.charges.forEach((c, i) => setCls(c, 'used', i >= KK.usesLeft(s, 6)));
    // Etkin güç: panel üretimi + bataryadan çekilen
    const eff = Math.min(fl.need, fl.supply + Math.max(0, -fl.battFlow));
    if (fl.need > 0) { setW(r.pw, fl.f); setCls(r.pw, 'bad', fl.f < 0.999); setText(r.pwt, fmt1(eff) + ' / ' + fmt1(fl.need) + ' kW'); }
    else { setW(r.pw, fl.supply > 0 ? 1 : 0); setCls(r.pw, 'bad', false); setText(r.pwt, fmt1(fl.supply) + ' kW'); }
    const cap = KK.R.battCap * s.m[5];
    setW(r.bt, cap ? s.batt / cap : 0);
    setText(r.btt, cap ? fmt(s.batt) + ' kJ' : 'yok');
    const live = G.t >= 0, dark = live && G.t < s.bo;
    setCls(r.el, 'dark', dark);
    const al = [];
    if (dark) al.push(['bad blink', 'Karartma · ' + Math.ceil(s.bo - G.t) + ' sn']);
    if (live && env.night && fl.need > 0) al.push(fl.f < 0.01 ? ['bad', 'Gece · makineler durdu'] : ['night', 'Gece · bataryada %' + Math.round(cap ? (s.batt / cap) * 100 : 0)]);
    else if (live && !dark && fl.need > 0 && fl.f < 0.999) al.push(['bad', 'Enerji yetmiyor · %' + Math.round(fl.f * 100)]);
    if (live && fl.warn.some((w) => w.k === 'cam')) al.push(['warn', 'Pres cam bekliyor']);
    else if (live && fl.warn.some((w) => w.k === 'toz' && w.sev === 'warn')) al.push(['warn', 'Pres için toz az']);
    setHTML(r.alerts, al.slice(0, 2).map((a) => '<span class="al ' + a[0] + '">' + a[1] + '</span>').join(''));
    return fl;
  }

  function renderInfo(t, env, night) {
    const ev = G.ev, info = $('info');
    const soon = t >= ev.t - KK.TURN && t < ev.t, on = t >= ev.t && t < ev.t + Math.max(ev.dur, 8);
    let h, em = '', p, cls = '';
    if (soon) { cls = 'ev soon'; h = icon('star') + ev.name; em = Math.ceil(ev.t - t) + ' sn sonra'; p = ev.soon; }
    else if (on) { cls = 'ev'; h = icon('star') + ev.name; em = ev.dur ? Math.ceil(ev.t + ev.dur - t) + ' sn kaldı' : 'şimdi'; p = ev.text; }
    else if (t < 0) { h = icon('sun') + 'Hazırlık'; p = 'İlk karar için oylar toplanıyor. <b>20 karar, 5 dakika</b>; kasası en dolu olan kazanır.'; }
    else if (night) { cls = 'night'; h = icon('moon') + 'Gece'; em = mmss(KK.NIGHT_END - t) + ' kaldı'; p = 'Güneş yok. Fırın ve pres <b>sadece bataryayla</b> çalışır.'; }
    else {
      const toN = KK.NIGHT_START - t;
      h = icon('sun') + 'Gündüz'; em = toN > 0 ? 'gece ' + mmss(toN) + ' sonra' : 'son düzlük';
      p = '<span class="tipk">İpucu</span>' + TIPS[G.k % TIPS.length];
    }
    const pr = '<div class="pr">kg fiyatı · <span class="t">toz 1₺</span> · <span class="c">cam 4₺</span> · <span class="k' +
      (env.price.kristal < KK.PRICE.kristal ? ' down' : '') + '">kristal ' + env.price.kristal + '₺</span></div>';
    setHTML(info, '<div class="h">' + h + (em ? '<em>' + em + '</em>' : '') + '</div><p>' + p + '</p>' + pr);
    const want = ('info ' + cls).trim();
    if (info.className !== want) info.className = want;
  }

  function renderHud(rdt) {
    const t = G.t, env = KK.envAt(Math.max(0, t), G.ev), live = t >= 0, night = live && env.night;
    const y = G.sides.y, c = G.sides.c;
    const roll = (k, v) => { shown[k] += (v - shown[k]) * Math.min(1, rdt * 8); if (G.phase === 'end' || Math.abs(v - shown[k]) < 0.5) shown[k] = v; return shown[k]; };
    setText($('moneyY'), fmt(roll('y', y.money)));
    setText($('moneyC'), fmt(roll('c', c.money)));
    const gap = y.money - c.money, lY = $('leadY'), lC = $('leadC');
    lY.hidden = !(live && gap >= 1); lC.hidden = !(live && gap <= -1);
    if (!lY.hidden) setText(lY, 'Önde +' + fmt(gap) + '₺');
    if (!lC.hidden) setText(lC, 'Önde +' + fmt(-gap) + '₺');
    const a = Math.max(1, y.money), b = Math.max(1, c.money);
    shown.tug += (clamp(a / (a + b), 0.04, 0.96) - shown.tug) * Math.min(1, rdt * 4);
    setSt($('tugY'), 'width', (shown.tug * 100).toFixed(2) + '%');
    setSt($('tugN'), 'left', (shown.tug * 100).toFixed(2) + '%');

    const open = G.phase === 'run' && G.k < KK.TURNS;
    const remain = open ? G.k * KK.TURN - t : 0;
    $('ringFg').setAttribute('stroke-dashoffset', String(219.91 * (1 - (open ? clamp(remain / KK.TURN, 0, 1) : 0))));
    setText($('ringNum'), open ? String(Math.ceil(Math.max(0, remain - 1e-6))) : '—');
    const hot = open && remain > 0 && remain <= 3;
    setCls($('ring'), 'hot', hot);
    setText($('turnNo'), open ? (G.k + 1) + '/' + KK.TURNS : 'bitti');
    const lk = $('lockY');
    setText(lk, !open ? 'Bekliyor' : G.pickY == null ? 'Seçim bekliyor' : 'Kilitlendi');
    setCls(lk, 'on', open && G.pickY != null);
    const total = sum(G.votes);
    setText($('votesC'), fmt(total) + ' oy');

    setText($('time'), t < 0 ? '0:00' : mmss(t));
    setW($('trDone'), Math.max(0, t) / KK.DUR);
    setSt($('trNow'), 'left', ((clamp(t, 0, KK.DUR) / KK.DUR) * 100).toFixed(2) + '%');
    refs.ticks.forEach((el, i) => {
      const h = G.history[i];
      let cls = 'tick';
      if (h) { const ly = h.y.g.loss, lc = h.c.g.loss; if (ly + 40 < lc) cls += ' y'; else if (lc + 40 < ly) cls += ' c'; }
      if (el.className !== cls) el.className = cls;
    });
    const ph = $('phase');
    setHTML(ph, t < 0 ? icon('sun') + 'Hazırlık' : night ? icon('moon') + 'Gece' : icon('sun') + 'Gündüz');
    setCls(ph, 'night', night);
    renderInfo(t, env, night);

    const fy = renderBay('y', env), fc = renderBay('c', env);

    let lead = -1, maxV = 0;
    for (let i = 0; i < G.votes.length; i++) if (G.votes[i] > maxV) { maxV = G.votes[i]; lead = i; }
    refs.cards.forEach((o, i) => {
      const v = G.votes[i], share = total ? v / total : 0;
      setSt(o.fill, 'height', (maxV ? (v / maxV) * 84 : 0).toFixed(1) + '%');
      setSt(o.fill, 'opacity', v > 0 ? '1' : '0');
      setText(o.pct, '%' + Math.round(share * 100));
      setText(o.cnt, fmt(v) + ' oy');
      if (i === 0) { setText(o.cy, 'Ücretsiz'); setText(o.cc, ''); }
      else {
        setText(o.cy, 'Y ' + fmt(KK.costOf(y, i)) + '₺'); setText(o.cc, 'C ' + fmt(KK.costOf(c, i)) + '₺');
        setCls(o.cy, 'no', !KK.canBuy(y, i)); setCls(o.cc, 'no', !KK.canBuy(c, i));
      }
      if (i === 6) setText(o.desc, 'Rakibin panelleri 15 sn kapanır · hak Y ' + KK.usesLeft(y, 6) + ' · C ' + KK.usesLeft(c, 6));
      setCls(o.el, 'lead', open && i === lead && total > 0);
      setCls(o.el, 'hot', hot);
      setCls(o.el, 'closed', !open);
    });
    setHTML($('howto'), '<strong>Chat:</strong> oy vermek için <span class="k">0</span>–<span class="k">6</span> arası bir rakam yaz <span class="sep">·</span> her izleyicinin son oyu sayılır' +
      (open && G.lastVoter ? '<span class="last">son oy: <b>' + G.lastVoter + '</b></span>' : ''));
    return { fy, fc, env };
  }

  // ---- Maç sonu -------------------------------------------------------------------
  function showEnd() {
    const y = G.sides.y, c = G.sides.c;
    const diff = Math.round(y.money) - Math.round(c.money);
    const winner = diff > 0 ? ['Yayıncı kazandı', 'var(--yay)'] : diff < 0 ? ['Chat kazandı', 'var(--chat)'] : ['Berabere', 'var(--fg)'];
    const cells = (key) => G.history.map((h) => { const e = h[key]; return '<span class="cell ' + e.g.level + (e.id && !e.ok ? ' x' : '') + '">' + e.id + '</span>'; }).join('');
    const good = (key) => G.history.filter((h) => h[key].g.level === 'g').length;
    const worst = (key, who, whose) => {
      let w = null;
      for (const h of G.history) if (!w || h[key].g.loss > w[key].g.loss) w = h;
      if (!w || w[key].g.loss <= KK.GRADE.green) return '<li><b class="' + key + '">' + who + '</b> hiç pahalı hata yapmadı.</li>';
      return '<li><b class="' + key + '">' + whose + ' en pahalı kararı</b> Karar ' + (w.k + 1) + ': ' + w[key].g.why + ' (≈' + fmt(w[key].g.loss) + '₺)</li>';
    };
    let turning = '';
    const sign = Math.sign(diff);
    if (sign) {
      const who = sign > 0 ? 'Yayıncı' : 'Chat';
      let flip = -1;
      G.history.forEach((h, i) => { if (Math.sign(Math.round(h.diff)) !== sign) flip = i; });
      turning = flip === -1 ? who + ' maçın başından beri öndeydi.' : flip + 1 >= G.history.length ? who + ' son 15 saniyede öne geçti!' : who + ' Karar ' + (flip + 2) + ' anında öne geçti ve bir daha bırakmadı.';
    }
    $('end').innerHTML = '<div class="end-card">' +
      '<div class="end-top"><div class="winner" style="color:' + winner[1] + '">' + winner[0] + '</div><div class="finals">' +
      '<div style="--tc:var(--yay)"><small>Yayıncı</small><b>₺' + fmt(y.money) + '</b></div>' +
      '<div style="--tc:var(--chat)"><small>Chat</small><b>₺' + fmt(c.money) + '</b></div></div></div>' +
      '<div class="karne"><div class="krow"><span class="w y">Yayıncı</span><div class="cells">' + cells('y') + '</div><span class="sc">' + good('y') + '/' + G.history.length + '</span></div>' +
      '<div class="krow"><span class="w c">Chat</span><div class="cells">' + cells('c') + '</div><span class="sc">' + good('c') + '/' + G.history.length + '</span></div></div>' +
      '<ul class="breaks">' + (turning ? '<li><b>Kırılma anı</b>' + turning + '</li>' : '') + worst('y', 'Yayıncı', 'Yayıncının') + worst('c', 'Chat', "Chat'in") + '</ul>' +
      '<div class="end-foot"><span>Karedeki rakam seçilen kart · yeşil iyi hamle, kırmızı pahalı hata (simülasyon tahmini)</span><span id="endCount"></span></div></div>';
    $('end').hidden = false;
  }

  // ---- Ölçekleme ve döngü --------------------------------------------------------
  function fit() {
    const box = $('fit'), frame = $('frame');
    const cs = getComputedStyle(box);
    const hint = box.querySelector('.hint');
    const hintH = hint && getComputedStyle(hint).display !== 'none' ? hint.offsetHeight + 10 : 0;
    const w = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - hintH;
    const scale = Math.max(0.1, Math.min(w / 1920, h / 1080));
    frame.style.width = 1920 * scale + 'px';
    frame.style.height = 1080 * scale + 'px';
    $('stage').style.transform = 'scale(' + scale + ')';
    const k = scale * Math.min(2, window.devicePixelRatio || 1);
    scenes.y.resize(k); scenes.c.resize(k);
  }

  let lastNow = 0;
  function frame(now) {
    const rdt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0;
    lastNow = now;
    const hold = now < G.holdUntil;
    if (G.phase === 'run' && !opts.paused && !hold) advance(rdt * opts.speed);
    stinger.tick(now);
    if (G.phase === 'end') {
      const left = Math.ceil((G.restartAt - now) / 1000);
      setText($('endCount'), opts.paused ? 'Duraklatıldı' : 'Yeni maç ' + Math.max(0, left) + ' sn sonra');
      if (!opts.paused && now >= G.restartAt) newGame();
    }
    const { fy, fc, env } = renderHud(rdt);
    const gdt = opts.paused ? 0 : rdt * opts.speed * (hold ? 0.3 : 1);
    scenes.y.update(gdt, G.sides.y, KK.sideEnv(env, G.sides.y, G.t), G.t, fy);
    scenes.c.update(gdt, G.sides.c, KK.sideEnv(env, G.sides.c, G.t), G.t, fc);
    scenes.y.draw(); scenes.c.draw();
    requestAnimationFrame(frame);
  }

  function init() {
    buildBay('y'); buildBay('c'); buildCards();
    stinger.el = $('stinger');
    $('btnPause').addEventListener('click', () => { opts.paused = !opts.paused; setText($('btnPause'), opts.paused ? 'Devam' : 'Duraklat'); });
    $('btnNew').addEventListener('click', () => newGame());
    $('btnFull').addEventListener('click', () => { const el = document.documentElement; if (el.requestFullscreen) el.requestFullscreen().catch(() => {}); });
    $('segSpeed').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      opts.speed = Number(b.dataset.v);
      $('segSpeed').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    });
    // Yayıncı tarafını kullanıcı devralabilir: seçim gizli kalır, sadece kilit görünür
    const take = (i) => {
      if (!G || G.phase !== 'run' || G.k >= KK.TURNS) return;
      G.manual = true; G.pickY = i;
      setText($('sub'), 'Yayıncıyı sen oynuyorsun · seçimin gizli, sadece kilit görünür');
    };
    document.addEventListener('keydown', (e) => {
      if (/^[0-6]$/.test(e.key)) { take(Number(e.key)); e.preventDefault(); }
      else if (e.key === ' ') { $('btnPause').click(); e.preventDefault(); }
    });
    $('cards').addEventListener('click', (e) => { const c = e.target.closest('.card'); if (c) take(Array.from(c.parentNode.children).indexOf(c)); });
    window.addEventListener('resize', fit);
    newGame();
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    requestAnimationFrame(frame);
  }
  init();
})();
