/* Графика: қысқы мультфильм әлемі (canvas), Айзере кейіпкері, кедергілер.
   Барлық сурет 720 бірлік биіктікте салынады және экранға масштабталады. */
(function () {
  'use strict';
  const AZ = window.AZ = window.AZ || {};
  const { clamp, lerp } = AZ.u;
  const OUT = '#22344f', TAU = Math.PI * 2;
  const GROUND_TOP = 492;

  /* ---------- көмекшілер ---------- */
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function fs(c, fill, lw, stroke) { if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.lineWidth = lw; c.strokeStyle = stroke || OUT; c.lineJoin = 'round'; c.stroke(); } }
  function lin(c, x0, y0, x1, y1, stops) { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; }

  let K = 1;
  function tile(w, h, oy, fn) {
    const cv = document.createElement('canvas'); cv.width = Math.ceil(w * K); cv.height = Math.ceil(h * K);
    const c = cv.getContext('2d'); c.scale(K, K); c.translate(0, -oy); fn(c, w, h);
    return { cv, w, h, oy };
  }

  /* ---------- нысандар ---------- */
  function pine(c, x, y, s, o) {
    o = o || {}; const g1 = o.g1 || '#1d7a54', g2 = o.g2 || '#2ea36f', ol = o.ol === undefined ? OUT : o.ol;
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = '#6b4428'; c.fillRect(-6, -18, 12, 20); if (ol) { c.lineWidth = 2; c.strokeStyle = ol; c.strokeRect(-6, -18, 12, 20); }
    const tiers = [[46, -14, -66], [38, -46, -96], [28, -76, -128]];
    tiers.forEach(([w, b, a]) => {
      c.beginPath(); c.moveTo(-w, b); c.lineTo(0, a); c.lineTo(w, b); c.quadraticCurveTo(0, b + 9, -w, b); c.closePath(); fs(c, g1, ol ? 2.4 : 0, ol);
      c.beginPath(); c.moveTo(0, a); c.lineTo(w, b); c.quadraticCurveTo(w * .3, b + 6, w * .05, b + 3); c.closePath(); c.fillStyle = g2; c.globalAlpha = .55; c.fill(); c.globalAlpha = 1;
      if (o.snow !== false) {
        const sy = a + (b - a) * .5;
        c.beginPath(); c.moveTo(0, a - 1); c.lineTo(w * .52, sy); c.quadraticCurveTo(w * .36, sy + 9, w * .2, sy + 2); c.quadraticCurveTo(0, sy + 12, -w * .22, sy + 3); c.quadraticCurveTo(-w * .4, sy + 9, -w * .52, sy); c.closePath();
        fs(c, '#fff', ol ? 1.6 : 0, ol);
      }
    });
    c.restore();
  }
  function mountain(c, cx, base, w, h, col, shade, snow) {
    c.beginPath(); c.moveTo(cx - w / 2, base); c.lineTo(cx - w * .12, base - h); c.lineTo(cx + w * .06, base - h * .92); c.lineTo(cx + w / 2, base); c.closePath(); c.fillStyle = col; c.fill();
    c.beginPath(); c.moveTo(cx - w * .12, base - h); c.lineTo(cx + w * .06, base - h * .92); c.lineTo(cx + w / 2, base); c.lineTo(cx + w * .08, base); c.closePath(); c.fillStyle = shade; c.fill();
    c.beginPath(); c.moveTo(cx - w * .12, base - h); c.lineTo(cx + w * .06, base - h * .92);
    const sy = base - h * .62; c.lineTo(cx + w * .17, sy); c.lineTo(cx + w * .09, sy + 14); c.lineTo(cx + w * .02, sy + 4); c.lineTo(cx - w * .05, sy + 20); c.lineTo(cx - w * .12, sy + 6); c.lineTo(cx - w * .2, sy + 16); c.lineTo(cx - w * .24, sy + 2); c.closePath(); c.fillStyle = snow; c.fill();
  }
  function cloud(c, x, y, s, a) {
    c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha = a == null ? .95 : a; c.fillStyle = '#fff';
    c.beginPath(); c.ellipse(0, 0, 46, 18, 0, 0, TAU); c.ellipse(-26, -10, 24, 18, 0, 0, TAU); c.ellipse(8, -18, 30, 24, 0, 0, TAU); c.ellipse(34, -6, 22, 16, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(160,195,235,.35)'; c.beginPath(); c.ellipse(0, 10, 44, 8, 0, 0, TAU); c.fill();
    c.restore();
  }
  function bush(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.beginPath(); c.ellipse(-16, -12, 20, 15, 0, 0, TAU); c.ellipse(8, -16, 24, 19, 0, 0, TAU); c.ellipse(26, -9, 17, 12, 0, 0, TAU); fs(c, '#2f8a62', 2.2);
    c.beginPath(); c.moveTo(-30, -18); c.quadraticCurveTo(-12, -34, 6, -30); c.quadraticCurveTo(24, -34, 36, -16); c.quadraticCurveTo(10, -24, -8, -22); c.quadraticCurveTo(-20, -26, -30, -18); fs(c, '#fff', 0);
    c.restore();
  }
  function rockBg(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.beginPath(); c.moveTo(-28, 0); c.quadraticCurveTo(-30, -24, -8, -28); c.quadraticCurveTo(18, -34, 28, -10); c.quadraticCurveTo(30, 0, 24, 2); c.closePath(); fs(c, '#8f9bb0', 2.2);
    c.beginPath(); c.moveTo(-22, -16); c.quadraticCurveTo(-6, -32, 14, -26); c.quadraticCurveTo(0, -22, -22, -16); c.fillStyle = '#fff'; c.fill();
    c.restore();
  }
  function lamp(c, x, y, s, kind) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = '#39465e'; rr(c, -4, -190, 8, 190, 3); c.fill();
    if (kind === 'rink') { c.fillStyle = '#39465e'; rr(c, -26, -204, 52, 14, 5); c.fill(); c.fillStyle = '#fff6bf'; rr(c, -22, -192, 44, 8, 4); c.fill(); c.fillStyle = 'rgba(255,246,191,.18)'; c.beginPath(); c.moveTo(-22, -184); c.lineTo(22, -184); c.lineTo(60, -40); c.lineTo(-60, -40); c.fill(); }
    else { c.strokeStyle = '#39465e'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -186); c.quadraticCurveTo(0, -206, 20, -204); c.stroke(); c.beginPath(); c.arc(22, -192, 12, 0, TAU); fs(c, '#fff3b0', 2.5); c.fillStyle = 'rgba(255,243,176,.2)'; c.beginPath(); c.arc(22, -192, 30, 0, TAU); c.fill(); }
    c.restore();
  }
  function bench(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = '#6b4428'; c.fillRect(-36, -30, 6, 30); c.fillRect(30, -30, 6, 30);
    c.beginPath(); rr(c, -42, -34, 84, 10, 3); fs(c, '#b5793f', 2); rr(c, -42, -56, 84, 9, 3); fs(c, '#b5793f', 2); rr(c, -42, -45, 84, 9, 3); fs(c, '#c8864a', 2);
    c.beginPath(); c.moveTo(-42, -57); c.quadraticCurveTo(0, -66, 42, -57); c.quadraticCurveTo(0, -60, -42, -57); fs(c, '#fff', 0);
    c.restore();
  }
  function cabin(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    rr(c, -62, -84, 124, 84, 6); fs(c, lin(c, 0, -84, 0, 0, ['#c98a4e', '#a86d38']), 2.5);
    c.strokeStyle = 'rgba(80,45,20,.35)'; c.lineWidth = 2; for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(-62, -84 + i * 17); c.lineTo(62, -84 + i * 17); c.stroke(); }
    c.beginPath(); c.moveTo(-78, -80); c.lineTo(0, -140); c.lineTo(78, -80); c.closePath(); fs(c, '#b3402f', 2.5);
    c.beginPath(); c.moveTo(-70, -84); c.lineTo(0, -138); c.lineTo(70, -84); c.quadraticCurveTo(40, -100, 0, -118); c.quadraticCurveTo(-40, -100, -70, -84); fs(c, '#fff', 0);
    rr(c, 28, -130, 14, 34, 3); fs(c, '#8a8f9c', 2);
    rr(c, -14, -52, 28, 52, 5); fs(c, '#6b4428', 2.2); c.fillStyle = '#ffd35c'; c.beginPath(); c.arc(8, -26, 2.5, 0, TAU); c.fill();
    rr(c, -52, -66, 24, 22, 3); fs(c, '#ffe9a6', 2.2); rr(c, 28, -66, 24, 22, 3); fs(c, '#ffe9a6', 2.2);
    c.strokeStyle = OUT; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-40, -66); c.lineTo(-40, -44); c.moveTo(-52, -55); c.lineTo(-28, -55); c.moveTo(40, -66); c.lineTo(40, -44); c.moveTo(28, -55); c.lineTo(52, -55); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.8)'; [[35, -146, 7], [42, -162, 9], [54, -182, 11]].forEach(([a, b, r]) => { c.beginPath(); c.arc(a, b, r, 0, TAU); c.fill(); });
    c.restore();
  }
  function sign(c, x, y, txt, s) {
    c.save(); c.translate(x, y); c.scale(s || 1, s || 1);
    c.fillStyle = '#6b4428'; c.fillRect(-26, -42, 6, 42); c.fillRect(20, -42, 6, 42);
    rr(c, -40, -84, 80, 46, 6); fs(c, lin(c, 0, -84, 0, -38, ['#f6e3b9', '#e6c98e']), 2.6);
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-42, -84); c.quadraticCurveTo(0, -96, 42, -84); c.quadraticCurveTo(0, -88, -42, -84); c.fill();
    c.fillStyle = '#3a2a1a'; c.font = '900 ' + (String(txt).length > 2 ? 28 : 34) + 'px "Trebuchet MS","Segoe UI",Arial,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, 0, -60);
    c.restore();
  }
  function crowd(c, r, x0, x1, y) {
    const cols = ['#ff5a6e', '#2f8cff', '#ffc233', '#2dc98a', '#7b61ff', '#ff8a2b', '#4cc9ff', '#f06292'];
    const skin = ['#ffd5b3', '#f2b88f', '#d99b73', '#fbe0c8'];
    for (let x = x0; x < x1; x += 16 + r() * 10) {
      const h = 18 + r() * 8, col = cols[Math.floor(r() * cols.length)];
      c.beginPath(); rr(c, x - 7, y - h, 14, h + 2, 6); fs(c, col, 1.6);
      c.beginPath(); c.arc(x, y - h - 6, 7, 0, TAU); fs(c, skin[Math.floor(r() * 4)], 1.6);
      if (r() < .5) { c.beginPath(); c.arc(x, y - h - 9, 7.4, Math.PI, TAU); fs(c, cols[Math.floor(r() * cols.length)], 1.4); }
    }
  }
  function bunting(c, x0, y0, x1, y1, sag, r) {
    c.strokeStyle = '#5c6b86'; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + sag, x1, y1); c.stroke();
    const cols = ['#ff5a6e', '#ffc233', '#2f8cff', '#2dc98a'];
    for (let i = 1; i < 14; i++) {
      const t = i / 14, x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * ((x0 + x1) / 2) + t * t * x1, y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (Math.max(y0, y1) + sag) + t * t * y1;
      c.beginPath(); c.moveTo(x - 7, y); c.lineTo(x + 7, y); c.lineTo(x, y + 16); c.closePath(); fs(c, cols[i % 4], 1.2);
    }
  }
  function boards(c, x0, x1, y) {
    for (let x = x0; x < x1; x += 160) {
      c.beginPath(); rr(c, x, y - 40, 158, 44, 6); fs(c, lin(c, 0, y - 40, 0, y + 4, ['#ffffff', '#dfeaf7']), 2.2);
      c.fillStyle = '#2f8cff'; c.fillRect(x + 4, y - 22, 150, 8); c.fillStyle = '#ff5a6e'; c.fillRect(x + 4, y - 14, 150, 4);
      c.fillStyle = '#39465e'; c.fillRect(x + 2, y - 2, 154, 6);
      c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(x + 12, y - 36, 30, 5);
    }
  }

  /* ---------- плиткалар (фон қабаттары) ---------- */
  const T = {};
  const TW = 1280;
  const per = (seed, fn) => (c) => { for (const dx of [-TW, 0, TW]) { c.save(); c.translate(dx, 0); fn(c, rng(seed)); c.restore(); } };
  function build(k) {
    K = k; Object.keys(T).forEach(x => delete T[x]);
    // алыс таулар
    T.far = tile(1600, 330, 190, (c) => {
      const r = rng(11);
      const peaks = [[120, 300, 210], [420, 380, 250], [760, 330, 190], [1090, 420, 260], [1420, 340, 200]];
      peaks.forEach(([x, w, h], i) => { [-1600, 0, 1600].forEach(o => mountain(c, x + o, 520, w, h, i % 2 ? '#b4c9e8' : '#bfd3ee', i % 2 ? '#9db6dc' : '#a9c1e4', '#ffffff')); });
    });
    // орта төбелер
    T.hill = tile(1400, 250, 300, (c) => {
      const f = x => 440 + 22 * Math.sin(TAU * x / 1400 * 2 + 1) + 14 * Math.sin(TAU * x / 1400 * 5 + 2);
      c.beginPath(); c.moveTo(0, 560); for (let x = 0; x <= 1400; x += 20) c.lineTo(x, f(x)); c.lineTo(1400, 560); c.closePath();
      c.fillStyle = lin(c, 0, 420, 0, 520, ['#eef6ff', '#d7e8fa']); c.fill();
      c.strokeStyle = 'rgba(160,190,225,.5)'; c.lineWidth = 3; c.beginPath(); for (let x = 0; x <= 1400; x += 20) { const y = f(x) + 26; x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    });
    // алыстағы шыршалар
    T.ftr = tile(1100, 160, 360, (c) => {
      const r = rng(5);
      for (let x = -40; x < 1140; x += 36 + r() * 40) { const s = .42 + r() * .26; [-1100, 0, 1100].forEach(o => pine(c, x + o, 482, s, { g1: '#4d9a8c', g2: '#67b3a3', ol: null })); }
    });
    // жер: трасса
    T.gTrail = tile(TW, 240, GROUND_TOP, (c) => {
      const r = rng(21);
      c.fillStyle = lin(c, 0, GROUND_TOP, 0, 720, ['#ffffff', '#f1f7ff', '#dbe9fb']); c.fillRect(0, GROUND_TOP, TW, 240);
      for (let i = 0; i < 14; i++) { c.fillStyle = 'rgba(150,185,228,.28)'; c.beginPath(); c.ellipse(r() * TW, 530 + r() * 170, 60 + r() * 90, 6 + r() * 6, 0, 0, TAU); c.fill(); }
      c.strokeStyle = 'rgba(120,160,215,.38)'; c.lineWidth = 3; [592, 614].forEach((y, j) => { c.beginPath(); for (let x = 0; x <= TW; x += 20) { const yy = y + 3 * Math.sin(TAU * x / TW * 2 + j); x ? c.lineTo(x, yy) : c.moveTo(x, yy); } c.stroke(); });
      for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(r() * TW, 510 + r() * 200, 1.4 + r() * 1.6, 0, TAU); c.fill(); }
    });
    // жер: мұз айдыны
    T.gIce = tile(TW, 240, GROUND_TOP, (c) => {
      const r = rng(31);
      c.fillStyle = lin(c, 0, GROUND_TOP, 0, 720, ['#e4f6ff', '#bfe7fa', '#9ed8f2']); c.fillRect(0, GROUND_TOP, TW, 240);
      for (let i = 0; i < 9; i++) { c.fillStyle = 'rgba(255,255,255,.35)'; c.save(); c.translate(r() * TW, 520 + r() * 170); c.rotate(-.12); c.beginPath(); c.ellipse(0, 0, 90 + r() * 120, 7 + r() * 6, 0, 0, TAU); c.fill(); c.restore(); }
      c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 2; c.lineCap = 'round';
      for (let i = 0; i < 26; i++) { const x = r() * TW, y = 520 + r() * 180, w = 60 + r() * 140; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + w / 2, y + (r() - .5) * 18, x + w, y + (r() - .5) * 8); c.stroke(); }
      c.strokeStyle = 'rgba(110,170,215,.5)'; c.lineWidth = 1.6; for (let i = 0; i < 12; i++) { const x = r() * TW, y = 540 + r() * 150; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 20 + r() * 30, y + r() * 12 - 6); c.lineTo(x + 40 + r() * 30, y + r() * 10); c.stroke(); }
    });
    // жер: жаяу жол
    T.gPath = tile(TW, 240, GROUND_TOP, (c) => {
      const r = rng(41);
      c.fillStyle = lin(c, 0, GROUND_TOP, 0, 720, ['#ffffff', '#f1f7ff', '#dbe9fb']); c.fillRect(0, GROUND_TOP, TW, 240);
      c.beginPath(); c.moveTo(0, 556); for (let x = 0; x <= TW; x += 20) c.lineTo(x, 556 + 3 * Math.sin(TAU * x / TW * 3)); c.lineTo(TW, 700); for (let x = TW; x >= 0; x -= 20) c.lineTo(x, 700 + 3 * Math.sin(TAU * x / TW * 2)); c.closePath();
      c.fillStyle = lin(c, 0, 556, 0, 700, ['#d8cdbb', '#c5b8a3']); c.fill();
      for (let row = 0; row < 5; row++) for (let x = -30 + (row % 2) * 30; x < TW; x += 60) { rr(c, x + 3, 566 + row * 26, 54, 20, 7); c.fillStyle = (row + x / 60) % 3 ? '#cfc3ae' : '#c0b29c'; c.fill(); c.strokeStyle = 'rgba(100,85,65,.25)'; c.lineWidth = 1.5; c.stroke(); }
      for (let i = 0; i < 10; i++) { c.fillStyle = 'rgba(255,255,255,.95)'; c.beginPath(); c.ellipse(r() * TW, 557 + r() * 140, 20 + r() * 40, 5 + r() * 4, 0, 0, TAU); c.fill(); }
      c.fillStyle = 'rgba(150,185,228,.25)'; for (let i = 0; i < 8; i++) { c.beginPath(); c.ellipse(r() * TW, 710 + r() * 8, 100, 8, 0, 0, TAU); c.fill(); }
    });
    // безендіру: мұз айдыны
    T.dRink = tile(TW, 360, 170, per(51, (c, r) => {
      [330, 960].forEach(x => pine(c, x, 466, 1.25, {}));
      crowd(c, r, 30, TW - 20, 466);
      boards(c, 0, TW, 498);
      [170, 810].forEach(x => lamp(c, x, 500, 1.15, 'rink'));
      bunting(c, 170, 296, 810, 296, 36, r); bunting(c, 810, 296, 1450, 296, 36, r);
    }));
    // безендіру: трасса
    T.dTrail = tile(TW, 360, 170, per(61, (c, r) => {
      [[40, 1.5], [150, 1.1], [215, 1.7], [520, 1.3], [590, .95], [880, 1.55], [960, 1.15], [1100, 1.7], [1210, 1.2]].forEach(([x, s]) => pine(c, x, 496 + (s < 1.2 ? 0 : 4), s));
      cabin(c, 720, 498, 1.05); rockBg(c, 400, 500, 1.1); rockBg(c, 1060, 502, .8); bush(c, 300, 502, 1); bush(c, 800, 506, .8);
    }));
    // безендіру: жаяу жол (саябақ)
    T.dPath = tile(TW, 360, 170, per(71, (c) => {
      [[70, 1.55], [330, 1.15], [620, 1.4], [1010, 1.2], [1200, 1.6]].forEach(([x, s]) => pine(c, x, 498, s));
      lamp(c, 190, 506, 1.05, 'park'); lamp(c, 780, 506, 1.05, 'park'); lamp(c, 1130, 506, 1.05, 'park');
      bench(c, 470, 520, 1.15); bench(c, 930, 520, 1.15); bush(c, 270, 508, 1.1); bush(c, 640, 510, 1); bush(c, 1060, 508, 1.1);
    }));
    // безендіру: нөмірлі белгілер (7-тапсырма)
    T.dSigns = tile(TW, 360, 170, per(81, (c) => {
      [[30, 1.6], [190, 1.1], [420, 1.45], [700, 1.2], [860, 1.65], [1130, 1.2], [1240, 1.5]].forEach(([x, s]) => pine(c, x, 496, s));
      const nums = [4, 8, 9, 16, 25, 36, 49, 64, 81]; const xs = [90, 250, 420, 560, 700, 840, 980, 1110, 1230];
      nums.forEach((n, i) => sign(c, xs[i], 514 + (i % 2) * 8, n, 1));
      rockBg(c, 360, 502, 1); rockBg(c, 900, 504, .9); bush(c, 480, 508, .9); bush(c, 1100, 508, 1);
    }));
  }

  /* ---------- әлем сызу ---------- */
  function blit(c, t, x, y) { c.drawImage(t.cv, x, y + t.oy, t.w, t.h); }
  function loopTile(c, t, cam, factor, Wu, y) {
    const off = -((cam * factor) % t.w), start = off > 0 ? off - t.w : off;
    for (let x = start; x < Wu + 2; x += t.w) c.drawImage(t.cv, Math.floor(x), y + t.oy, t.w + 1, t.h);
  }
  const KIND = { rink: ['gIce', 'dRink'], trail: ['gTrail', 'dTrail'], path: ['gPath', 'dPath'], signs: ['gTrail', 'dSigns'] };

  function world(c, Wu, cam, t, plan) {
    // аспан
    const g = c.createLinearGradient(0, 0, 0, 520); g.addColorStop(0, '#79c4ff'); g.addColorStop(.55, '#bfe5ff'); g.addColorStop(1, '#eaf6ff');
    c.fillStyle = g; c.fillRect(0, 0, Wu, 720);
    // күн
    const sx = Wu * .82, sy = 120;
    c.save(); c.translate(sx, sy); c.rotate(t * .08);
    c.strokeStyle = 'rgba(255,230,120,.55)'; c.lineWidth = 6; c.lineCap = 'round';
    for (let i = 0; i < 12; i++) { c.rotate(TAU / 12); c.beginPath(); c.moveTo(56, 0); c.lineTo(76 + 6 * Math.sin(t * 2 + i), 0); c.stroke(); }
    c.restore();
    c.fillStyle = 'rgba(255,240,170,.35)'; c.beginPath(); c.arc(sx, sy, 62, 0, TAU); c.fill();
    c.fillStyle = '#ffd84a'; c.beginPath(); c.arc(sx, sy, 42, 0, TAU); c.fill(); c.fillStyle = '#fff1a0'; c.beginPath(); c.arc(sx - 10, sy - 10, 18, 0, TAU); c.fill();
    // бұлттар
    for (let i = 0; i < 5; i++) { const sp = 6 + i * 3, w = Wu + 300; let x = ((i * 330 + t * sp - cam * .03) % w + w) % w - 150; cloud(c, x, 70 + (i * 53) % 170, .8 + (i % 3) * .25, .9); }
    loopTile(c, T.far, cam, .06, Wu, 0);
    loopTile(c, T.hill, cam, .16, Wu, 0);
    loopTile(c, T.ftr, cam, .35, Wu, 0);
    // сегменттер: безендіру + жер
    for (const seg of plan) {
      const a = Math.max(seg.x0, cam), b = Math.min(seg.x1, cam + Wu);
      if (b <= a) continue;
      const [gk, dk] = KIND[seg.kind];
      c.save(); c.beginPath(); c.rect(a - cam, 0, b - a, 720); c.clip();
      for (const pass of [gk, dk]) {          // алдымен жер, оның үстіне безендіру
        const tl = T[pass], i = Math.floor((a - seg.x0) / TW);
        for (let x = seg.x0 + i * TW; x < b; x += TW) c.drawImage(tl.cv, Math.floor(x - cam), tl.oy, tl.w + 1, tl.h);
      }
      c.restore();
    }
  }

  function gate(c, sx, label, col, k) {
    c.save(); c.translate(sx, GROUND_TOP + 78); c.scale(k || 1, k || 1);
    c.fillStyle = '#6b4428'; rr(c, -150, -230, 16, 232, 4); c.fill(); rr(c, 134, -230, 16, 232, 4); c.fill();
    rr(c, -170, -250, 340, 62, 14); fs(c, col, 3);
    c.fillStyle = 'rgba(255,255,255,.2)'; rr(c, -164, -246, 328, 20, 10); c.fill();
    c.fillStyle = '#fff'; c.font = '900 34px "Trebuchet MS","Segoe UI",Arial,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, 0, -219);
    c.restore();
  }
  function finishArch(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = 'rgba(40,70,120,.2)'; c.beginPath(); c.ellipse(0, 4, 190, 12, 0, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(-150, 0); c.lineTo(-150, -150); c.quadraticCurveTo(0, -250, 150, -150); c.lineTo(150, 0); c.lineTo(122, 0); c.lineTo(122, -146); c.quadraticCurveTo(0, -214, -122, -146); c.lineTo(-122, 0); c.closePath();
    fs(c, lin(c, 0, -230, 0, 0, ['#ff6b7f', '#d93a52']), 3);
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 4; c.beginPath(); c.moveTo(-136, -10); c.lineTo(-136, -148); c.stroke();
    c.save(); c.beginPath(); c.moveTo(-100, -176); c.quadraticCurveTo(0, -224, 100, -176); c.lineTo(100, -140); c.quadraticCurveTo(0, -186, -100, -140); c.closePath(); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke(); c.restore();
    c.fillStyle = '#d93a52'; c.font = '900 40px "Trebuchet MS","Segoe UI",Arial,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.save(); c.translate(0, -176); c.rotate(0); c.fillText('МӘРЕ', 0, 0); c.restore();
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { c.fillStyle = (i + j) % 2 ? '#22344f' : '#fff'; c.fillRect(-150 + i * 14, -20 - j * 14, 14, 14); c.fillRect(122 + i * 14, -20 - j * 14, 14, 14); }
    c.restore();
    // финиш сызығы
    c.save(); c.translate(x, y + 18); for (let i = -9; i < 9; i++) for (let j = 0; j < 2; j++) { c.fillStyle = (i + j) % 2 ? '#22344f' : '#fff'; c.fillRect(i * 12 * s, j * 12 * s, 12 * s, 12 * s); } c.restore();
  }

  /* ---------- Айзере ---------- */
  const L1 = 24, L2 = 24, A1 = 17, A2 = 16;
  function limb(c, pts, w, col) {
    c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
    c.strokeStyle = OUT; c.lineWidth = w + 4; c.stroke(); c.strokeStyle = col; c.lineWidth = w; c.stroke();
  }
  function footwear(c, gear, a, near, rot) {
    c.save(); c.translate(a.x, a.y);
    if (gear === 'ski') {
      c.beginPath(); c.moveTo(-36, 5); c.lineTo(52, 5); c.quadraticCurveTo(66, 4, 72, -6); c.lineTo(70, -2); c.quadraticCurveTo(62, 10, 50, 10); c.lineTo(-36, 10); c.closePath(); fs(c, near ? '#ffb703' : '#d98c00', 2);
      c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(-30, 6, 76, 1.8);
      rr(c, -7, -9, 19, 14, 4); fs(c, near ? '#2d3550' : '#232a40', 2);
    } else if (gear === 'skate') {
      rr(c, -6, -12, 19, 18, 5); fs(c, near ? '#ffffff' : '#e5ecf6', 2); c.fillStyle = '#ff5a6e'; c.fillRect(-5, -6, 17, 3);
      rr(c, -10, 7, 31, 3.6, 1.8); fs(c, '#c2ccdb', 1.8); c.fillStyle = '#7f8ca3'; c.fillRect(-4, 4, 3, 4); c.fillRect(11, 4, 3, 4);
    } else {
      c.rotate(rot * .5); rr(c, -7, -8, 24, 16, 6); fs(c, near ? '#7a4a2c' : '#63391f', 2); rr(c, -7, 4, 24, 5, 2.5); fs(c, '#efe7da', 1.6);
    }
    c.restore();
  }
  function girl(c, x, y, s, st) {
    const gear = st.gear || 'walk', pose = st.pose || 'stand', t = st.t || 0, run = st.run == null ? 1 : st.run;
    const moving = pose === 'move';
    let lean = .04, bob = 0, foot = gear === 'skate' ? 8 : gear === 'ski' ? 6 : 5, tilt = 0, mouth = 'smile', pole = false;
    const leg = [{ a: 0, b: 0 }, { a: 0, b: 0 }], arm = [{ a: .1, b: .2 }, { a: -.1, b: .1 }];
    const w = moving ? (gear === 'walk' ? 7.4 : gear === 'skate' ? 4.6 : 5.4) : 0;
    const p = t * w;
    if (moving) {
      for (let i = 0; i < 2; i++) {
        const ph = p + i * Math.PI, sn = Math.sin(ph), cs = Math.cos(ph);
        if (gear === 'walk') {
          leg[i].a = .55 * run * sn; leg[i].b = .1 + .95 * run * Math.max(0, cs);
          arm[i].a = -.6 * run * sn; arm[i].b = arm[i].a + .35 + .25 * run;
          lean = .07; bob = -Math.abs(cs) * 1.2 * run;
        } else if (gear === 'skate') {
          const u = (sn + 1) / 2;
          leg[i].a = lerp(.1, lerp(-.38, .5, u), run); leg[i].b = lerp(.1, lerp(.12, 1.05, u) + .55 * Math.max(0, cs), run);
          arm[i].a = lerp(.1, .9 * Math.sin(ph + Math.PI) + .25, run); arm[i].b = arm[i].a * .4 + .35;
          lean = lerp(.05, .42, run); mouth = 'smile';
        } else {
          leg[i].a = .3 * run * sn + .05; leg[i].b = .35 + .25 * Math.max(0, cs) * run;
          arm[i].a = .95 * run * Math.sin(ph + Math.PI) + .2; arm[i].b = arm[i].a + .55;
          lean = .05 + .19 * run; pole = true;
          arm[i].pa = -.55 + .25 * Math.sin(ph + Math.PI) * run;
        }
      }
    } else if (pose === 'cheer') {
      const j = Math.abs(Math.sin(t * 8));
      bob = -j * (gear === 'ski' ? 14 : 22); lean = 0; leg[0] = { a: .08, b: .1 + .4 * (1 - j) }; leg[1] = { a: -.08, b: .1 + .4 * (1 - j) };
      arm[0] = { a: 2.75 + .15 * Math.sin(t * 10), b: 2.85 }; arm[1] = { a: -2.75 - .15 * Math.sin(t * 10 + 1), b: -2.85 }; mouth = 'open';
      if (gear === 'ski') pole = true;
    } else {      // stand / watch / think
      const br = Math.sin(t * 2.2);
      bob = br * .9; leg[0] = { a: gear === 'ski' ? .05 : .16, b: .06 + (gear === 'skate' ? .35 : 0) }; leg[1] = { a: gear === 'ski' ? -.05 : -.13, b: .06 + (gear === 'skate' ? .35 : 0) };
      if (gear === 'walk' && pose === 'think') leg[1].a = -.13 + .08 * Math.sin(t * 6);   // аяғымен тықылдату
      arm[0] = { a: .1, b: .15 }; arm[1] = { a: -.12, b: .05 }; lean = gear === 'skate' ? .12 : .02;
      if (gear === 'ski') { pole = true; arm[0].pa = -.15; arm[1].pa = .1; arm[0].a = .5; arm[0].b = .35; arm[1].a = .15; arm[1].b = .1; }
      if (pose === 'watch') { arm[0] = { a: .35, b: -2.3 }; tilt = .1; }
      if (pose === 'think') { arm[0] = { a: .6, b: -2.65 }; tilt = -.08; mouth = 'flat'; }
    }
    if (st.talk) mouth = 'open';
    const hh = leg.map(l => L1 * Math.cos(l.a) + L2 * Math.cos(l.a - l.b));
    const hip = { x: 0, y: -(Math.max(hh[0], hh[1]) + foot) + bob };
    const sh = { x: hip.x + Math.sin(lean) * 30, y: hip.y - Math.cos(lean) * 30 };
    const neck = { x: sh.x + Math.sin(lean) * 5, y: sh.y - Math.cos(lean) * 5 };
    const head = { x: neck.x + Math.sin(lean * .7 + tilt) * 15, y: neck.y - Math.cos(lean * .7 + tilt) * 15 };
    const J = leg.map(l => { const k = { x: hip.x + Math.sin(l.a) * L1, y: hip.y + Math.cos(l.a) * L1 }; const an = { x: k.x + Math.sin(l.a - l.b) * L2, y: k.y + Math.cos(l.a - l.b) * L2 }; return { k, an, rot: l.a - l.b }; });
    const AJ = arm.map(a => { const so = { x: sh.x - 1, y: sh.y + 3 }; const e = { x: so.x + Math.sin(a.a) * A1, y: so.y + Math.cos(a.a) * A1 }; const h = { x: e.x + Math.sin(a.b) * A2, y: e.y + Math.cos(a.b) * A2 }; return { so, e, h, pa: a.pa }; });

    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = 'rgba(40,70,120,.22)'; c.beginPath(); c.ellipse(4, 3, gear === 'ski' ? 58 : 32, 7, 0, 0, TAU); c.fill();
    const drawPole = (i, col) => { const a = AJ[i], ang = a.pa == null ? -.5 : a.pa, L = 62; const tx = a.h.x + Math.sin(ang) * L, ty = a.h.y + Math.cos(ang) * L;
      c.strokeStyle = OUT; c.lineWidth = 4.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(a.h.x, a.h.y); c.lineTo(tx, ty); c.stroke(); c.strokeStyle = col; c.lineWidth = 2.4; c.stroke();
      c.beginPath(); c.arc(tx - Math.sin(ang) * 6, ty - Math.cos(ang) * 6, 4.5, 0, TAU); fs(c, '#4a5873', 1.5); };
    const drawArm = (i, near) => { const a = AJ[i]; limb(c, [a.so, a.e, a.h], 8, near ? '#ff5a6e' : '#d94459'); c.beginPath(); c.arc(a.h.x, a.h.y, 5.6, 0, TAU); fs(c, '#ffcc33', 2); };
    const drawLeg = (i, near) => { limb(c, [hip, J[i].k, J[i].an], 9.5, near ? '#2d4a86' : '#233a6b'); footwear(c, gear, J[i].an, near, J[i].rot); };

    if (pole) drawPole(1, '#7b8aa3');
    drawLeg(1, false); drawArm(1, false);
    // дене
    c.save(); c.translate(hip.x, hip.y); c.rotate(lean);
    rr(c, -13, -4, 28, 14, 7); fs(c, '#2d4a86', 2.2);
    rr(c, -14, -42, 30, 46, 12); fs(c, lin(c, 0, -42, 0, 4, ['#ff6f82', '#f04a60']), 2.4);
    c.save(); rr(c, -14, -42, 30, 46, 12); c.clip(); c.fillStyle = '#fff'; c.fillRect(-16, -18, 34, 5); c.fillStyle = '#ffd24a'; c.fillRect(-16, -12, 34, 2.5); c.restore();
    c.strokeStyle = 'rgba(120,20,40,.35)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(1, -40); c.lineTo(1, 2); c.stroke();
    c.restore();
    // шарф ұшы
    const fl = Math.sin(t * 9) * 3 * (moving ? 1 : .3), back = moving ? 20 + 14 * run : 8;
    c.beginPath(); c.moveTo(neck.x - 6, neck.y + 1); c.quadraticCurveTo(neck.x - back * .6, neck.y + 8 + fl, neck.x - back, neck.y + 4 + fl * 1.6); c.lineTo(neck.x - back + 1, neck.y + 12 + fl * 1.6); c.quadraticCurveTo(neck.x - back * .5, neck.y + 16 + fl, neck.x - 2, neck.y + 8); c.closePath(); fs(c, '#ffc233', 2);
    drawLeg(0, true); drawArm(0, true);
    if (pole) drawPole(0, '#9aa8bf');
    c.save(); c.translate(neck.x, neck.y); c.rotate(lean); rr(c, -11, -7, 24, 10, 5); fs(c, '#ffc233', 2); c.restore();
    // бас
    c.save(); c.translate(head.x, head.y); c.rotate(tilt * .6 + lean * .35);
    const sw = Math.sin(t * (moving ? 7 : 2.4)) * (moving ? 5 : 2) * (moving ? run : 1), tail = moving ? 10 * run : 0;
    c.beginPath(); c.arc(-3, -1, 17.5, 0, TAU); fs(c, '#3b2417', 2.2);
    limb(c, [{ x: -13, y: -2 }, { x: -24 - tail * .4, y: 6 + sw * .4 }, { x: -30 - tail, y: 15 + sw }], 7, '#3b2417'); c.beginPath(); c.arc(-23, 8 + sw * .3, 3.2, 0, TAU); fs(c, '#ff5a6e', 1.6);
    c.beginPath(); c.arc(0, 0, 16.5, 0, TAU); fs(c, '#ffd5b3', 2.4);
    c.beginPath(); c.ellipse(5, 6, 4, 2.6, 0, 0, TAU); c.fillStyle = 'rgba(255,110,130,.45)'; c.fill();
    const blink = (t % 3.4) > 3.28 || st.blink;
    [[2, 1.9], [10, 2.5]].forEach(([ex, rx]) => { c.beginPath(); c.ellipse(ex, -1, rx, blink ? .5 : 3.3, 0, 0, TAU); c.fillStyle = '#1b2438'; c.fill(); if (!blink) { c.beginPath(); c.arc(ex + .6, -2.4, .9, 0, TAU); c.fillStyle = '#fff'; c.fill(); } });
    c.strokeStyle = '#3b2417'; c.lineWidth = 1.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(-.5, -6.5); c.quadraticCurveTo(2, -8, 4.5, -6.5); c.moveTo(7.5, -6.5); c.quadraticCurveTo(10.5, -8, 13, -6.5); c.stroke();
    c.beginPath(); c.arc(16, 2.5, 1.5, 0, TAU); c.fillStyle = '#f0b08e'; c.fill();
    c.strokeStyle = '#b3414f'; c.lineWidth = 1.8; c.beginPath();
    if (mouth === 'open') { c.ellipse(9.5, 8.5, 3.6, 3 + Math.abs(Math.sin(t * 12)) * 1.2, 0, 0, TAU); c.fillStyle = '#8a2b3a'; c.fill(); c.stroke(); }
    else if (mouth === 'flat') { c.moveTo(6, 9); c.lineTo(12, 9); c.stroke(); }
    else { c.arc(9.5, 5.5, 4.2, .25, Math.PI - .25); c.stroke(); }
    // бөрік
    c.beginPath(); c.arc(0, -3, 19.5, Math.PI * 1.02, TAU * .995); c.closePath(); fs(c, lin(c, 0, -24, 0, -4, ['#ff6f82', '#e84860']), 2.4);
    c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 2; [-10, -2, 6, 14].forEach(vx => { c.beginPath(); c.moveTo(vx, -20); c.lineTo(vx + 1, -6); c.stroke(); });
    rr(c, -20.5, -8, 41, 9, 4.5); fs(c, '#ffffff', 2.4);
    c.save(); c.beginPath(); rr(c, -20.5, -8, 41, 9, 4.5); c.clip(); c.fillStyle = '#cfe3ff'; for (let i = -20; i < 22; i += 8) c.fillRect(i, -8, 3, 9); c.restore();
    const pb = Math.sin(t * (moving ? 9 : 2)) * (moving ? 3 : 1);
    c.beginPath(); c.arc(-9 + pb * .4, -25 + pb, 6.5, 0, TAU); fs(c, '#fff', 2.2);
    c.restore();
    c.restore();
    return { hx: x + head.x * s, hy: y + head.y * s };
  }

  /* ---------- кедергілер ---------- */
  const OB = {};
  OB.rock = (c, st) => {
    const k = st.clear;
    if (k > 0) {
      [[-46, -4, 30, -1], [4, -20, 34, .8], [48, -2, 24, 1.2], [-12, -46, 24, -.7]].forEach(([px, py, r, rv]) => {
        c.save(); const e = Math.min(1, k * 1.2); c.globalAlpha = 1 - k; c.translate(px * (1 + e * 2.2), py - Math.sin(e * Math.PI) * 60 + e * e * 40); c.rotate(rv * e * 3);
        c.beginPath(); c.moveTo(-r, 0); c.quadraticCurveTo(-r, -r * 1.1, 0, -r * 1.2); c.quadraticCurveTo(r, -r, r * 1.05, 0); c.closePath(); fs(c, '#8793a8', 2.4); c.restore();
      }); return;
    }
    c.beginPath(); c.moveTo(-66, 2); c.bezierCurveTo(-70, -34, -42, -70, -6, -74); c.bezierCurveTo(30, -78, 66, -50, 68, -8); c.bezierCurveTo(69, 2, 64, 6, 58, 6); c.lineTo(-58, 6); c.closePath();
    fs(c, lin(c, -60, -70, 60, 6, ['#b3bdcd', '#8a96aa', '#6a7589']), 3);
    c.beginPath(); c.moveTo(-50, -44); c.bezierCurveTo(-40, -62, -20, -68, 0, -68); c.bezierCurveTo(-24, -58, -38, -44, -44, -26); c.closePath(); c.fillStyle = 'rgba(255,255,255,.22)'; c.fill();
    c.strokeStyle = 'rgba(40,50,70,.5)'; c.lineWidth = 2.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(14, -66); c.lineTo(6, -44); c.lineTo(20, -32); c.lineTo(10, -14); c.moveTo(-26, -30); c.lineTo(-14, -20); c.stroke();
    c.beginPath(); c.moveTo(-44, -54); c.bezierCurveTo(-30, -74, 30, -82, 56, -48); c.bezierCurveTo(40, -56, 28, -50, 16, -58); c.bezierCurveTo(4, -48, -8, -58, -18, -54); c.bezierCurveTo(-28, -46, -36, -52, -44, -54); c.closePath(); fs(c, '#fff', 2);
  };
  OB.log = (c, st) => {
    const k = st.clear; c.save(); if (k > 0) { c.globalAlpha = 1 - k; c.translate(k * 280, 0); c.rotate(k * 3); c.translate(0, -22 * k); }
    rr(c, -92, -46, 176, 48, 24); fs(c, lin(c, 0, -46, 0, 2, ['#b77b45', '#8f5a2f', '#6f4423']), 3);
    c.strokeStyle = 'rgba(60,30,10,.45)'; c.lineWidth = 2.2; c.lineCap = 'round'; [-50, -10, 38].forEach(x => { c.beginPath(); c.moveTo(x, -40); c.quadraticCurveTo(x + 8, -22, x - 2, -4); c.stroke(); });
    c.beginPath(); c.ellipse(84, -22, 14, 24, 0, 0, TAU); fs(c, '#e8c18a', 3); c.lineWidth = 1.8; [16, 9, 3].forEach(r => { c.beginPath(); c.ellipse(84, -22, r * .6, r * 1.4, 0, 0, TAU); c.strokeStyle = '#b07a42'; c.stroke(); });
    c.beginPath(); c.moveTo(-60, -46); c.quadraticCurveTo(-50, -66, -36, -50); c.lineTo(-30, -44); fs(c, '#8f5a2f', 2.6);
    c.beginPath(); c.moveTo(-88, -40); c.bezierCurveTo(-60, -62, -20, -48, 10, -58); c.bezierCurveTo(40, -50, 62, -60, 80, -42); c.bezierCurveTo(60, -44, 44, -38, 28, -46); c.bezierCurveTo(10, -40, -6, -46, -24, -42); c.bezierCurveTo(-50, -38, -70, -46, -88, -40); c.closePath(); fs(c, '#fff', 2);
    c.restore();
  };
  OB.drift = (c, st) => {
    const k = st.clear; c.save(); if (k > 0) { c.globalAlpha = 1 - k * .9; c.scale(1 + k * .1, 1 - k * .95); }
    c.beginPath(); c.moveTo(-120, 4); c.bezierCurveTo(-110, -46, -60, -86, -4, -88); c.bezierCurveTo(50, -90, 108, -56, 124, 4); c.closePath(); fs(c, lin(c, 0, -90, 0, 6, ['#ffffff', '#eaf3ff', '#cfe0f6']), 3);
    c.strokeStyle = 'rgba(140,175,220,.6)'; c.lineWidth = 2.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(-70, -30); c.quadraticCurveTo(-30, -56, 10, -46); c.moveTo(20, -58); c.quadraticCurveTo(60, -62, 84, -30); c.stroke();
    c.fillStyle = '#fff'; for (let i = 0; i < 7; i++) { const a = (i * 1.9 + st.t * 2) % 6; c.globalAlpha = (1 - k) * (.4 + .6 * Math.abs(Math.sin(a))); c.beginPath(); c.arc(-80 + i * 26, -50 - (i % 3) * 16, 2.4, 0, TAU); c.fill(); } c.globalAlpha = 1;
    c.restore();
  };
  OB.ice = (c, st) => {
    const k = st.clear, rx = 116 * (1 - k * .95), ry = 26 * (1 - k * .95);
    c.save();
    c.beginPath(); c.ellipse(0, -2, rx + 12, ry + 8, 0, 0, TAU); fs(c, '#e8f7ff', 3);
    if (k < .95) { c.beginPath(); c.ellipse(0, -2, rx, ry, 0, 0, TAU); c.fillStyle = lin(c, 0, -30, 0, 24, ['#2a77b8', '#0f3f78']); c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke(); }
    c.strokeStyle = '#d6efff'; c.lineWidth = 3; c.lineCap = 'round'; c.globalAlpha = 1 - k;
    [[-96, 0, -150, -12], [96, -4, 150, 6], [-30, 24, -40, 44], [40, -26, 52, -44], [-60, -20, -88, -42]].forEach(([a, b, x, y]) => { c.beginPath(); c.moveTo(a, b); c.lineTo((a + x) / 2 + 6, (b + y) / 2 - 6); c.lineTo(x, y); c.stroke(); });
    [[-44, 0, 24], [30, -4, 20], [0, 8, 14]].forEach(([x, y, r]) => { c.beginPath(); c.moveTo(x - r, y); c.lineTo(x - r * .3, y - r * .5); c.lineTo(x + r, y - r * .1); c.lineTo(x + r * .5, y + r * .4); c.closePath(); fs(c, '#dff3ff', 2); });
    c.globalAlpha = 1; c.restore();
  };
  OB.snowman = (c, st) => {
    const k = st.clear; c.save(); if (k > 0) { c.globalAlpha = 1 - k; c.translate(0, -k * 40); c.scale(1 - k * .25, 1 - k * .25); c.rotate(Math.sin(k * 14) * .08); }
    c.beginPath(); c.arc(0, -42, 46, 0, TAU); fs(c, lin(c, -30, -80, 30, 0, ['#ffffff', '#dbe8f8']), 3);
    c.beginPath(); c.arc(0, -108, 34, 0, TAU); fs(c, lin(c, -20, -140, 20, -80, ['#ffffff', '#dbe8f8']), 3);
    c.beginPath(); c.arc(0, -158, 25, 0, TAU); fs(c, lin(c, -16, -180, 16, -134, ['#ffffff', '#dbe8f8']), 3);
    c.strokeStyle = '#6b4428'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(-30, -112); c.lineTo(-84, -150); c.moveTo(-64, -138); c.lineTo(-76, -168); c.moveTo(30, -112); c.lineTo(84, -150); c.moveTo(64, -138); c.lineTo(76, -168); c.stroke();
    c.fillStyle = '#1b2438'; [[-9, -164], [9, -164]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill(); }); [[-14, -146], [-5, -141], [5, -141], [14, -146]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 2.2, 0, TAU); c.fill(); });
    c.beginPath(); c.moveTo(0, -158); c.lineTo(30, -153); c.lineTo(0, -149); c.closePath(); fs(c, '#ff8a2b', 2);
    c.fillStyle = '#1b2438'; [-100, -84, -68].forEach(y => { c.beginPath(); c.arc(0, y - 8, 3.2, 0, TAU); c.fill(); });
    rr(c, -26, -186, 52, 7, 3); fs(c, '#2f8cff', 2.4); rr(c, -17, -216, 34, 32, 4); fs(c, '#2f8cff', 2.4); c.fillStyle = '#ffc233'; c.fillRect(-17, -194, 34, 6);
    c.beginPath(); rr(c, -28, -130, 56, 10, 5); fs(c, '#ff5a6e', 2.4);
    c.restore();
  };
  OB.gate = (c, st) => {
    const k = st.clear;
    c.fillStyle = '#39465e'; rr(c, -112, -120, 14, 122, 4); c.fill(); rr(c, 98, -120, 14, 122, 4); c.fill();
    c.save(); c.translate(-98, -88); c.rotate(-k * 1.35);
    rr(c, 0, -9, 206, 18, 5); fs(c, '#fff', 2.8); c.save(); rr(c, 0, -9, 206, 18, 5); c.clip(); c.fillStyle = '#e8365a'; for (let x = 10; x < 206; x += 44) { c.beginPath(); c.moveTo(x, -9); c.lineTo(x + 22, -9); c.lineTo(x + 12, 9); c.lineTo(x - 10, 9); c.fill(); } c.restore();
    c.restore();
    c.beginPath(); c.arc(-98, -88, 8, 0, TAU); fs(c, '#ffc233', 2.4);
    rr(c, -46, -180, 92, 38, 9); fs(c, '#e8365a', 3); c.fillStyle = '#fff'; c.font = '900 19px "Trebuchet MS","Segoe UI",Arial,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ТОҚТА!', 0, -161);
    c.fillStyle = '#39465e'; c.fillRect(-3, -142, 6, 22);
  };
  const OB_NAMES = { rock: 'тас', log: 'құлаған ағаш', drift: 'қар үйіндісі', ice: 'мұз жарығы', snowman: 'қарлы адам', gate: 'тосқауыл' };
  function obstacle(c, type, x, y, s, st) {
    c.save(); c.translate(x + (st.shake ? Math.sin(st.t * 60) * 5 * st.shake : 0), y); c.scale(s, s);
    c.fillStyle = 'rgba(40,70,120,.18)'; c.beginPath(); c.ellipse(0, 4, 100, 10, 0, 0, TAU); c.fill();
    OB[type](c, { clear: st.clear || 0, t: st.t || 0 });
    c.restore();
  }

  /* ---------- қар жауу ---------- */
  function makeSnow(n) { return Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 2.8, s: .03 + Math.random() * .07, p: Math.random() * 6 })); }
  function snowFall(c, Wu, flakes, t, dt, wind) {
    c.fillStyle = 'rgba(255,255,255,.92)';
    for (const f of flakes) {
      f.y += f.s * dt * 1.2; f.p += dt; f.x += (Math.sin(f.p) * .012 - (wind || 0) * f.r * .00012) * dt * 3;
      if (f.y > 1) { f.y = -.02; f.x = Math.random(); } if (f.x < -.02) f.x = 1.02; if (f.x > 1.02) f.x = -.02;
      c.beginPath(); c.arc(f.x * Wu, f.y * 720, f.r, 0, TAU); c.fill();
    }
  }

  AZ.Art = { build, world, gate, finishArch, girl, obstacle, makeSnow, snowFall, OB_NAMES, GROUND_TOP, rr, pine, cloud, rng, lin, TAU };
})();
