/* Ядро: көмекші функциялар, дыбыс, Робиктің даусы (жұмсақ робот эффектімен + «бип-бип» сигналы), таймерлер, конфетти */
(function () {
  'use strict';
  const AZ = window.AZ = window.AZ || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  AZ.u = { $, $$, rnd, pick, shuffle, clamp, lerp, ease, easeOut };

  /* ---------- Сақтау (тек дыбыс баптаулары) ----------
     voice: 'robot' = audio/*.mp3 (Робиктің өз дауысы, робот эффектімен) — әдепкі
            'browser' = браузердің қазақ дауысы (эффектсіз) */
  const S = AZ.settings = { muted: false, voice: 'robot' };
  try { Object.assign(S, JSON.parse(localStorage.getItem('az_robik3') || '{}')); } catch (e) { /* ignore */ }
  AZ.saveSettings = () => { try { localStorage.setItem('az_robik3', JSON.stringify(S)); } catch (e) { /* ignore */ } };

  /* ---------- Таймерлер (үзіліс кезінде тоқтайды) ---------- */
  const Timers = (() => {
    let list = [], id = 0;
    return {
      after(sec, fn) { const t = { id: ++id, t: sec, fn }; list.push(t); return t.id; },
      clear(i) { list = list.filter(t => t.id !== i); },
      clearAll() { list = []; },
      update(dt) {
        if (!dt) return;
        const due = [];
        for (const t of list) { t.t -= dt; if (t.t <= 0) due.push(t); }
        if (due.length) { list = list.filter(t => !due.includes(t)); due.forEach(t => t.fn()); }
      },
      wait(sec) { return new Promise(r => this.after(sec, r)); }
    };
  })();
  AZ.Timers = Timers;

  /* ---------- Негізгі цикл ---------- */
  const Loop = AZ.Loop = {
    fns: [], paused: false, last: 0, t: 0,
    add(fn) { this.fns.push(fn); },
    start() {
      const tick = now => {
        const dt = Math.min(.05, (now - (this.last || now)) / 1000); this.last = now;
        const gdt = this.paused ? 0 : dt; this.t += gdt;
        Timers.update(gdt);
        for (const f of this.fns) f(gdt, dt);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  };

  /* ---------- Дыбыс эффектілері (WebAudio) ---------- */
  const Sfx = AZ.Sfx = {
    ctx: null,
    init() {
      if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; } }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    tone(f, d, type = 'sine', vol = .15, delay = 0, f2 = null) {
      if (S.muted || !this.ctx) return;
      const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + .05);
    },
    click() { this.tone(660, .06, 'triangle', .09); },
    key() { this.tone(520 + Math.random() * 60, .05, 'triangle', .07); },
    ok() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, .16, 'triangle', .14, i * .07)); },
    bad() { this.tone(240, .25, 'sawtooth', .07); this.tone(170, .35, 'sawtooth', .07, .16); },
    tick() { this.tone(900, .07, 'sine', .1); },
    go() { this.tone(1175, .3, 'triangle', .14); },
    whoosh() { this.tone(200, .4, 'sawtooth', .04, 0, 900); },
    pop() { this.tone(420, .12, 'sine', .12, 0, 880); },
    power() { this.tone(110, .5, 'sawtooth', .08, 0, 440); this.tone(440, .3, 'square', .05, .45, 880); },
    charge(big) { const n = big ? 12 : 4; for (let i = 0; i < n; i++) this.tone(300 + i * (big ? 70 : 90), .12, 'square', .05, i * (big ? .07 : .05)); },
    fanfare() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, .22, 'triangle', .15, i * .1)); },
    shatter() { for (let i = 0; i < 6; i++) this.tone(900 - i * 90, .12, 'square', .05, i * .03); },
    babble(n) { for (let i = 0; i < n; i++) this.tone(300 + Math.random() * 500, .07, 'square', .05, i * .1); },
    /* Роботтың «бип-бип» сигналы: екі қысқа электронды дыбыс (екіншісі сәл биігірек) */
    beep() {
      this.tone(1000, .13, 'square', .16, 0);
      this.tone(1000, .02, 'sine', .05, .13);
      this.tone(1350, .17, 'square', .16, .2);
    }
  };

  /* ---------- Робиктің даусы ----------
     ★ БАПТАУЛАР (осы жерде өзгертіңіз) ★
       SPEED  — жылдамдық: 1.0 = қалыпты, 1.1 = сәл жылдамырақ, 1.2 = жылдам (қазір), 1.3 = өте жылдам
       ROBOT  — робот эффектісі: 0 = жоқ, 0.3 = өте жұмсақ (1-нұсқадағыдай), 0.5 = жұмсақ робот (қазір),
                0.7 = анық робот, 0.9 = ауыр/қатты (бұрынғы «қорқынышты» нұсқа)
       BEEP_WAIT — «Бип-бип!» сигналынан кейінгі күту (сек)
     Эффект тек Live Server / интернеттегі сайтта жұмыс істейді (index.html-ді қос басып ашқанда жұмыс істемейді,
     бірақ жылдамдық пен бип сигналы жұмыс істей береді). */
  const SPEED = 1.2;
  const ROBOT = 0.5;
  const BEEP_WAIT = .55;
  const BEEP_RE = /бип[\s-]*бип[\s!.,…]*/i;                   // «Бип-бип!» — сөз ретінде айтылмайды, орнына сигнал ойналады
  const BEEP_LEAD_RE = /^\s*бип[\s-]*бип/i;

  const PAUSE = { sentence: .7, ellipsis: 1.1, comma: .35, colon: .5 };   // браузер даусының паузалары, сек
  const BROWSER_RATE = .95, BROWSER_PITCH = 1.0;

  /* Робот эффектісінің тізбегі (1-нұсқадағыдай жұмсақ): дыбыс -> таза дауыс + жеңіл ring modulation + жұмсақ металл жаңғырығы
     -> жұмсақ шектеуіш -> шығыс. Бұрмалау (distortion) және төменгі жиілікті кесу ЖОҚ — сондықтан дауыс «қатты/қорқынышты» емес. */
  const Robot = {
    input: null, failed: false,
    build() {
      if (this.input || this.failed) return this.input;
      try {
        if (ROBOT <= 0 || location.protocol === 'file:') { this.failed = true; return null; }   // file:// кезінде браузер дыбысты өшіріп жіберуі мүмкін
        Sfx.init(); const c = Sfx.ctx; if (!c) { this.failed = true; return null; }
        const input = c.createGain(), master = c.createGain(); master.gain.value = .75;
        const dry = c.createGain(); dry.gain.value = 1 - .35 * ROBOT;
        const ring = c.createGain(); ring.gain.value = 0;
        const osc = c.createOscillator(); osc.type = 'sine'; osc.frequency.value = 55; osc.connect(ring.gain); osc.start();
        const wet = c.createGain(); wet.gain.value = ROBOT * .8;
        const dl = c.createDelay(.05); dl.delayTime.value = .009;
        const fb = c.createGain(); fb.gain.value = .4;
        const comb = c.createGain(); comb.gain.value = .85 * ROBOT;
        input.connect(dry); dry.connect(master);
        input.connect(ring); ring.connect(wet); wet.connect(master);
        input.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(comb); comb.connect(master);
        const lim = c.createDynamicsCompressor(); lim.threshold.value = -8; lim.ratio.value = 4; lim.attack.value = .005; lim.release.value = .2;   // тек қырылдауға жол бермейді
        master.connect(lim); lim.connect(c.destination);
        this.input = input;
      } catch (e) { this.failed = true; this.input = null; }
      return this.input;
    },
    attach(a) {
      if (a._robot !== undefined) return;
      a._robot = false;
      const input = this.build(); if (!input) return;
      try { const src = Sfx.ctx.createMediaElementSource(a); src.connect(input); a._robot = true; } catch (e) { /* эффектсіз ойнай береді */ }
    }
  };

  const Voice = AZ.Voice = {
    cache: {}, cur: null, done: null, key: null, onTalk: null, paused: false, timer: 0, token: 0,
    kkVoice: null,
    find() {
      const list = (window.speechSynthesis && speechSynthesis.getVoices) ? speechSynthesis.getVoices() : [];
      const kk = list.filter(v => /^kk/i.test(v.lang));
      if (!kk.length) { this.kkVoice = null; return null; }
      const score = v => (/natural|online/i.test(v.name) ? 10 : 0) + (/daulet/i.test(v.name) ? 3 : /aigul/i.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1);
      kk.sort((a, b) => score(b) - score(a));
      return (this.kkVoice = kk[0]);
    },
    init() { this.find(); if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => this.find(); },
    hasBrowser() { return !!(this.kkVoice || this.find()); },
    useBrowser() { return S.voice === 'browser' && !!window.speechSynthesis && this.hasBrowser(); },
    talk(on) { if (this.onTalk) this.onTalk(on); },
    line(key) { return (window.AZ_LINES || {})[key] || { t: '', d: 2 }; },

    /* Браузер даусы үшін: мәтінді тыныс белгілері бойынша бөлшектерге бөлу */
    split(text) {
      const t = String(text).replace(/%/g, ' пайыз').replace(/\s+/g, ' ').trim();
      const re = /([^.!?…,;:]+)(\.{2,}|…|[.!?]+|[,;:])?/g, raw = [];
      let m;
      while ((m = re.exec(t))) {
        const body = m[1].trim(), p = m[2] || '';
        if (!body) continue;
        const gap = !p ? 0 : /\.{2,}|…/.test(p) ? PAUSE.ellipsis : /[.!?]/.test(p) ? PAUSE.sentence : p === ',' ? PAUSE.comma : PAUSE.colon;
        raw.push({ s: body + p, gap, words: body.split(' ').length });
      }
      const out = [];
      for (let i = 0; i < raw.length; i++) {
        const c = raw[i];
        if (c.gap === PAUSE.comma && c.words < 2 && i < raw.length - 1) { raw[i + 1].s = c.s + ' ' + raw[i + 1].s; continue; }
        out.push(c);
      }
      if (out.length) out[out.length - 1].gap = 0;
      return out;
    },

    speakChunks(line, tok, fin, fallback) {
      const parts = this.split(line.t), v = this.kkVoice;
      if (!parts.length || !v) return fallback();
      let i = 0;
      const next = () => {
        if (tok !== this.token) return;
        if (i >= parts.length) { fin(); return; }
        const p = parts[i++];
        const u = new SpeechSynthesisUtterance(p.s);
        u.voice = v; u.lang = v.lang; u.rate = BROWSER_RATE; u.pitch = BROWSER_PITCH; u.volume = 1;
        let moved = false, wd = 0;
        const adv = () => {
          if (moved || tok !== this.token) return; moved = true; Timers.clear(wd);
          this.talk(false);
          if (p.gap > 0) this.timer = Timers.after(p.gap, next); else next();
        };
        u.onstart = () => { if (tok === this.token) this.talk(true); };
        u.onend = adv; u.onerror = adv;
        wd = Timers.after(5 + p.s.length * .16, adv);
        this.cur = { browser: true, u, pause: () => this.silence() };
        try { speechSynthesis.speak(u); } catch (e) { adv(); }
      };
      next();
    },

    say(key) {
      this.stop();
      const line0 = this.line(key), tok = ++this.token;
      const text0 = line0.t || '';
      const hasBeep = BEEP_RE.test(text0);
      const line = hasBeep ? { t: text0.replace(BEEP_RE, ''), d: line0.d, b: line0.b } : line0;   // «Бип-бип» сөзі айтылмайды — орнына сигнал
      const timed = hasBeep && typeof line0.b === 'number';           // жаңа mp3: сигналдың орны файлда белгіленген (make_audio_simple.py)
      const legacy = hasBeep && !timed && BEEP_LEAD_RE.test(text0);   // ескі mp3: сигнал басында ойнап, дауыс сәл кейін басталады
      return new Promise(resolve => {
        let finished = false;
        const fin = () => { if (finished) return; finished = true; this.done = null; this.cur = null; Timers.clear(this.timer); this.talk(false); resolve(); };
        this.done = fin; this.key = key; this.paused = false;
        let lead = 0;
        const fallback = () => { Timers.clear(this.timer); this.timer = Timers.after((line.d || 2) / SPEED + .15 + lead, fin); };
        if (S.muted) { this.talk(true); return fallback(); }
        const browser = this.useBrowser();
        if (hasBeep && (browser || legacy)) { lead = BEEP_WAIT; Sfx.init(); Sfx.beep(); }   // браузер даусы / ескі mp3: сигнал алдымен, дауыс кейін
        const start = () => {
          if (tok !== this.token) return;
          if (browser) { this.speakChunks(line, tok, fin, fallback); return; }
          this.talk(true);
          let a = this.cache[key];
          if (!a) { a = new Audio('audio/' + key + '.mp3'); a.preload = 'auto'; this.cache[key] = a; }
          a.playbackRate = SPEED;
          try { a.preservesPitch = true; a.mozPreservesPitch = true; a.webkitPreservesPitch = true; } catch (e) { /* ignore */ }
          Robot.attach(a);
          a.onended = fin; a.onerror = () => { Sfx.babble(Math.ceil((line.d || 2) * 3)); fallback(); };
          a.onpause = () => { if (!this.paused && this.cur === a && !a.ended) fallback(); };
          try { a.currentTime = 0; } catch (e) { /* ignore */ }
          this.cur = a;
          if (timed) Timers.after(Math.max(0, line0.b) / SPEED, () => { if (tok === this.token) { Sfx.init(); Sfx.beep(); } });   // файлдағы бос орында «бип-бип»
          const pr = a.play();
          if (pr && pr.catch) pr.catch(() => { fallback(); });
        };
        if (lead > 0) this.timer = Timers.after(lead, start); else start();
      });
    },
    preload(keys) {
      if (this.useBrowser()) return;
      keys.forEach(k => { if (!this.cache[k]) { const a = new Audio('audio/' + k + '.mp3'); a.preload = 'auto'; this.cache[k] = a; } });
    },
    /* Дауысты өшіру (Mute): сөйлеуді үзеді, бірақ ойын ағымы тоқтап қалмайды */
    silence() {
      this.token++;
      if (window.speechSynthesis) { try { speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
      Timers.clear(this.timer); this.talk(false);
      const f = this.done; if (f) this.timer = Timers.after((this.line(this.key).d || 2), f);
    },
    stop() {
      this.token++;
      if (this.cur && this.cur.pause && !this.cur.browser) { try { this.cur.pause(); } catch (e) { /* ignore */ } }
      if (window.speechSynthesis) { try { speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
      Timers.clear(this.timer);
      const f = this.done; this.done = null; this.cur = null;
      if (f) f(); else this.talk(false);
    },
    pause() {
      this.paused = true;
      if (this.cur && this.cur.pause && !this.cur.browser) this.cur.pause();
      if (window.speechSynthesis && speechSynthesis.speaking) speechSynthesis.pause();
    },
    resume() {
      if (!this.paused) return; this.paused = false;
      if (this.cur && this.cur.play && !this.cur.browser) this.cur.play().catch(() => { });
      if (window.speechSynthesis && speechSynthesis.paused) speechSynthesis.resume();
    }
  };

  /* ---------- FX: конфетти және ұшатын жазулар ---------- */
  const FX = AZ.FX = (() => {
    const cv = document.getElementById('fx'), c = cv.getContext('2d');
    let W = 0, H = 0, parts = [];
    function resize() { const d = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; c.setTransform(d, 0, 0, d, 0, 0); }
    addEventListener('resize', resize); resize();
    const cols = ['#ff5a6e', '#2f8cff', '#ffc233', '#2dc98a', '#7b61ff', '#ff8a2b', '#4cc9ff'];
    function confetti(n = 160, x = W / 2, y = H * .3) {
      for (let i = 0; i < n; i++) parts.push({ x: x + (Math.random() - .5) * W * .3, y, vx: (Math.random() - .5) * 700, vy: -250 - Math.random() * 600, r: Math.random() * 6.28, vr: (Math.random() - .5) * 14, w: 6 + Math.random() * 8, h: 4 + Math.random() * 6, c: pick(cols), life: 3.5 + Math.random() * 1.5 });
    }
    function sparks(x, y, n = 18, col = '#ffe066') {
      for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = 80 + Math.random() * 260; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, r: 0, vr: 0, w: 5, h: 5, c: col, life: .7 + Math.random() * .5, round: true }); }
    }
    Loop.add((dt, rdt) => {
      c.clearRect(0, 0, W, H);
      if (!parts.length) return;
      const d = rdt;
      for (const p of parts) { p.vy += 900 * d; p.vx *= .995; p.x += p.vx * d; p.y += p.vy * d; p.r += p.vr * d; p.life -= d; }
      parts = parts.filter(p => p.life > 0 && p.y < H + 40);
      for (const p of parts) {
        c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.globalAlpha = Math.min(1, p.life * 1.5); c.fillStyle = p.c;
        if (p.round) { c.beginPath(); c.arc(0, 0, p.w / 2, 0, 6.283); c.fill(); } else c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        c.restore();
      }
    });
    function float(text, x, y, color) {
      const e = document.createElement('div'); e.className = 'floatx'; e.textContent = text; e.style.left = x + 'px'; e.style.top = y + 'px'; e.style.color = color || '#27c47d';
      document.body.appendChild(e); setTimeout(() => e.remove(), 1500);
    }
    return { confetti, sparks, float };
  })();
})();
