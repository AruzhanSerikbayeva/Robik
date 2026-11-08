/* Робик және қуат — ойын логикасы: кіріспе, 3 ойын, қорытынды */
(function () {
  'use strict';
  const AZ = window.AZ;
  const { $, $$, rnd, pick, shuffle, clamp, lerp, ease, easeOut } = AZ.u;
  const { Sfx, Voice, Timers, Loop, FX, Robot, Art } = AZ;
  const S = AZ.settings, LINES = window.AZ_LINES || {};
  const G = { run: 0, screen: 'start', game: 0, paused: false, locked: false, done: [false, false, false] };
  const stale = id => id !== G.run;

  const ICON = {
    star: '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" fill="#ffc233" stroke="#d99700" stroke-width="1.2" stroke-linejoin="round"/></svg>',
    back: '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M20 5H9l-6 7 6 7h11z M13 9.5l5 5M18 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    ok: '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M4 13l5 5L20 6" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor"/></svg>',
    next: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  const starsHTML = n => [0, 1, 2].map(i => ICON.star.replace('<svg', `<svg class="${i < n ? '' : 'off'}" style="animation-delay:${.15 + i * .2}s"`)).join('');
  const sup = (b, e) => `${b}<sup>${e}</sup>`;
  const mulS = (b, e) => Array(e).fill(b).join(' · ');

  /* ============================================================
     Канвас көмекшілері
     ============================================================ */
  function fitCanvas(cv) {
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(2, r.width), H = Math.max(2, r.height);
    const pw = Math.round(W * dpr), ph = Math.round(H * dpr);
    if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
    const k = H / 720;
    cv.getContext('2d').setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
    return { ctx: cv.getContext('2d'), Wu: W / k, k, dpr };
  }
  let builtK = 0;
  function buildArt() { const dpr = Math.min(2, window.devicePixelRatio || 1), k = Math.max(.5, (innerHeight - 64) / 720); const K = Math.round(k * dpr * 20) / 20; if (K !== builtK) { builtK = K; Art.build(K); } }
  buildArt();
  let rzT = 0; addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(buildArt, 200); });

  /* ============================================================
     Робиктер және қуат
     ============================================================ */
  const R = {
    hud: Robot.create($('#hud-robot'), { mini: true }),
    comp: Robot.create($('#comp-robot')),
    intro: Robot.create($('#intro-robot')),
    end: Robot.create($('#end-robot'))
  };
  R.comp.badge(false); R.intro.big(true);
  Voice.onTalk = on => { [R.intro, R.end, R.comp].forEach(r => r.talk(on)); };

  const Battery = {
    v: 10, anim: null, ctls: [R.hud, R.comp, R.intro, R.end],
    attach(c) { this.ctls.push(c); c.setCharge(this.v); },
    render() {
      const v = this.v;
      this.ctls = this.ctls.filter(c => document.body.contains(c.host));
      this.ctls.forEach(c => c.setCharge(v));
      const f = $('#bat-fill'); f.style.width = v + '%'; f.style.background = Robot.colFor(v);
      $('#bat-pct').textContent = Math.round(v) + '%';
    },
    set(to, dur) { to = clamp(to, 0, 100); if (!dur) { this.v = to; this.anim = null; this.render(); return; } this.anim = { from: this.v, to, t: 0, dur }; },
    add(units) {
      const to = Math.min(99, this.v + units), gain = to - this.v;
      if (gain <= 0) return 0;
      this.set(to, .7); Sfx.charge(false);
      this.ctls.forEach(c => { c.charging(true); c.bounce(); }); Timers.after(1, () => this.ctls.forEach(c => c.charging(false)));
      const r = $('.bat-bar').getBoundingClientRect(); FX.float('+' + (Math.round(gain * 10) / 10) + '%', r.left + r.width / 2, r.bottom + 6, '#1fa86a');
      return gain;
    }
  };
  Loop.add((dt, rdt) => {
    if (Battery.anim) { const a = Battery.anim; a.t += rdt; const p = clamp(a.t / a.dur, 0, 1); Battery.v = lerp(a.from, a.to, easeOut(p)); Battery.render(); if (p >= 1) Battery.anim = null; }
  });
  Battery.render();

  /* ============================================================
     Қоршаған фон (бастау / кіріспе / 3-ойын / қорытынды)
     ============================================================ */
  const Ambient = { cv: $('#bg'), cam: 0, snow: Art.makeSnow(120) };
  Loop.add(dt => {
    if (!['start', 'intro', 'g3', 'end'].includes(G.screen)) return;
    const f = fitCanvas(Ambient.cv); Ambient.cam += 16 * dt;
    const kind = G.screen === 'g3' ? 'path' : G.screen === 'end' ? 'rink' : 'trail';
    Art.world(f.ctx, f.Wu, Ambient.cam, Loop.t, [{ kind, x0: -4000, x1: 1e7 }]);
    Art.snowFall(f.ctx, f.Wu, Ambient.snow, Loop.t, dt, 20);
  });

  /* ============================================================
     Экран ауыстыру, жоғарғы панель
     ============================================================ */
  function show(id) {
    G.screen = id; document.body.dataset.screen = id;
    $$('.screen').forEach(s => s.classList.toggle('on', s.id === 'scr-' + id));
    $('#hud').classList.toggle('off', id === 'start');
    $('#companion').classList.toggle('off', !['g1', 'g2', 'g3'].includes(id));
    if (id !== 'g1' && id !== 'g2') { Panels.g1.unmount(true); Panels.g2.unmount(true); }
  }
  function setSteps(active) {
    $$('.step').forEach(b => { const n = +b.dataset.g; b.classList.toggle('on', n === active); b.classList.toggle('done', G.done[n - 1] && n !== active); });
  }

  /* ---------- Субтитр карточкасы (Робик сөйлейді) ---------- */
  function SubCard(textEl, dotsEl, total) {
    let typer = null;
    dotsEl.innerHTML = Array(total).fill('<i></i>').join('');
    Loop.add(dt => { if (!typer) return; typer.t += dt; const n = Math.floor(typer.text.length * Math.min(1, typer.t / typer.dur)); if (n !== typer.n) { typer.n = n; textEl.textContent = typer.text.slice(0, n); } });
    return {
      async say(key, idx) {
        const line = LINES[key]; if (!line) return;
        $$('i', dotsEl).forEach((d, i) => { d.className = i < idx ? 'done' : i === idx ? 'on' : ''; });
        typer = { text: line.t, t: 0, dur: Math.max(.8, line.d * .85), n: -1 };
        await Voice.say(key);
        typer = null; textEl.textContent = line.t;
      },
      done() { $$('i', dotsEl).forEach(d => { d.className = 'done'; }); }
    };
  }

  /* ---------- Ойын ішіндегі Робик ---------- */
  const Companion = {
    timer: 0,
    say(key, o) {
      o = o || {}; const line = LINES[key]; if (!line) return Promise.resolve();
      const b = $('#comp-bubble'); b.textContent = line.t; b.classList.add('on'); Timers.clear(this.timer);
      if (o.mood) R.comp.setMood(o.mood); if (o.hop) R.comp.bounce();
      return Voice.say(key).then(() => { R.comp.setMood(null); this.timer = Timers.after(2.2, () => b.classList.remove('on')); });
    },
    hide() { $('#comp-bubble').classList.remove('on'); Timers.clear(this.timer); }
  };

  /* ---------- Терезелер ---------- */
  const Overlay = {
    el: $('#overlay'), card: $('#ov-card'), open: false, kind: '',
    show(html, kind) { this.card.innerHTML = html; this.el.classList.remove('off'); this.open = true; this.kind = kind || 'result'; },
    hide() { this.el.classList.add('off'); this.open = false; this.kind = ''; }
  };
  function setPaused(b) {
    G.paused = b; Loop.paused = b; if (b) Voice.pause(); else Voice.resume();
    $('#b-pause').innerHTML = b ? ICON.play + '<span>Жалғастыру</span>' : ICON.pause + '<span>Тоқтату</span>';
  }

  /* ============================================================
     Жауап беру панелі (1- және 2-ойын үшін ортақ)
     ============================================================ */
  let activePanel = null;
  function makePanel(root) {
    let val = '', locked = false, nextRes = null, handlers = {}, qp = null;
    const P = {
      mount(cfg) {
        val = ''; locked = false; nextRes = null;
        const head = cfg.group
          ? `<div class="qp-head"><span class="qp-badge" style="--c:var(--g${cfg.group})">${cfg.group}</span><div><b>${cfg.group}-топ</b><small>көмектесіңдер!</small></div></div>`
          : `<div class="qp-head"><span class="qp-badge" style="--c:var(--orange)">?</span><div><b>${cfg.title}</b><small>${cfg.sub || ''}</small></div></div>`;
        const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="key" type="button" data-k="${n}">${n}</button>`).join('') +
          `<button class="key back" type="button" data-k="b" aria-label="Өшіру">${ICON.back}</button><button class="key" type="button" data-k="0">0</button><button class="key ok" type="button" data-k="ok" aria-label="Жауап беру">${ICON.ok}</button>`;
        root.innerHTML = `<div class="qp">${head}<div class="qp-q">${cfg.q}</div><div class="qp-fb"></div><div class="qp-body"><div class="qp-ans"><div class="qp-display empty"></div><span class="qp-unit">${cfg.unit || ''}</span></div>
          <div class="qp-keys">${keys}</div><div class="qp-act"><button class="btn sm ghost" type="button" data-a="hint">Кеңес</button><button class="btn sm ghost" type="button" data-a="skip">Жауабын көрсет</button></div></div></div>`;
        qp = $('.qp', root);
        $$('.key', root).forEach(k => k.addEventListener('click', () => { Sfx.key(); const d = k.dataset.k; if (d === 'ok') P.submit(); else if (d === 'b') P.back(); else P.type(d); }));
        $$('[data-a]', root).forEach(b => b.addEventListener('click', () => { Sfx.click(); const f = handlers[b.dataset.a]; if (f && !locked) f(); }));
        activePanel = P; return P;
      },
      disp() { return $('.qp-display', root); },
      type(d) { if (locked) return; if (val.length < 4) val += d; this.refresh(); },
      back() { if (locked) return; val = val.slice(0, -1); this.refresh(); },
      refresh() { const d = this.disp(); if (!d) return; d.textContent = val; d.classList.toggle('empty', !val); },
      clear() { val = ''; this.refresh(); },
      submit() { if (locked || !val) return; handlers.submit && handlers.submit(parseInt(val, 10)); },
      on(h) { handlers = h; },
      lock(b) { locked = b; },
      shake() { const d = this.disp(); if (!d) return; d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake'); },
      fb(html, cls) { const f = $('.qp-fb', root); if (f) { f.innerHTML = `<div class="fb ${cls || ''}">${html}</div>`; } },
      finish(html, cls, label) {          // жауап аяқталды → түсіндірме + «Келесі»
        locked = true; const body = $('.qp-body', root); if (body) body.style.display = 'none';
        const f = $('.qp-fb', root); if (!f) return Promise.resolve();
        f.innerHTML = `<div class="fb ${cls}">${html}</div><div class="qp-act"><button class="btn md green" type="button" id="qp-next">${label}${ICON.next}</button></div>`;
        return new Promise(res => { nextRes = res; $('#qp-next', root).addEventListener('click', () => { Sfx.click(); nextRes = null; res(); }); setTimeout(() => { const n = $('#qp-next', root); if (n) n.focus(); }, 50); });
      },
      pressNext() { const n = $('#qp-next', root); if (n && nextRes) n.click(); },
      unmount(now) { if (activePanel === P) activePanel = null; if (now) { root.innerHTML = ''; return; } const q = $('.qp', root); if (q) { q.classList.add('out'); setTimeout(() => { if (q.parentNode === root) root.innerHTML = ''; }, 300); } }
    };
    return P;
  }
  const Panels = { g1: makePanel($('#g1-panel')), g2: makePanel($('#g2-panel')) };
  addEventListener('keydown', e => {
    if (G.paused || Overlay.open || !activePanel) return;
    if (/^\d$/.test(e.key)) { Sfx.key(); activePanel.type(e.key); }
    else if (e.key === 'Backspace') { activePanel.back(); e.preventDefault(); }
    else if (e.key === 'Enter') { activePanel.pressNext(); activePanel.submit(); }
  });

  /* Бір тапсырманы 2 мүмкіндікпен шешу. Нәтиже: {ok, tries, revealed} */
  function askTask(panel, task, hooks) {
    return new Promise(resolve => {
      let tries = 0, done = false, hinted = false;
      const finish = (ok, revealed) => {
        if (done) return; done = true; panel.lock(true);
        resolve({ ok, tries, revealed, hinted });
      };
      panel.on({
        submit(v) {
          if (done) return;
          if (v === task.ans) { finish(true, false); return; }
          tries++; Sfx.bad(); panel.shake();
          if (tries < 2) {
            panel.clear(); panel.fb(`<b>Қате.</b> ${LINES[task.hint] ? LINES[task.hint].t : 'Қайта байқап көр!'}`, 'hint');
            Companion.say(task.hint || 'bad1', { mood: 'meh' });
            hooks && hooks.onWrong && hooks.onWrong();
          } else finish(false, true);
        },
        hint() { hinted = true; panel.fb(LINES[task.hint] ? LINES[task.hint].t : '', 'hint'); Companion.say(task.hint); },
        skip() { tries = 2; finish(false, true); }
      });
    });
  }
  const credit = r => r.ok ? (r.tries === 0 ? 1 : .6) : .3;

  /* ============================================================
     1-ОЙЫН. Сызба бойынша есеп (оқулық, 6-тапсырма)
     ============================================================ */
  const GEAR = {
    skate: { color: '#2f8cff', speed: 250, kind: 'rink', label: 'МҰЗ АЙДЫНЫ', gate: '#2f8cff', verb: 'конькимен сырғанды', act: 'Конькимен сырғану', q: 'Айзере конькимен неше минут сырғанды?' },
    ski:   { color: '#7b61ff', speed: 230, kind: 'trail', label: 'ШАҢҒЫ ТРАССАСЫ', gate: '#7b61ff', verb: 'шаңғымен жүрді', act: 'Шаңғымен жүру', q: 'Айзере шаңғымен неше минут жүрді?' },
    walk:  { color: '#1fb36f', speed: 135, kind: 'path', label: 'ЖАЯУ ЖОЛ', gate: '#1fb36f', verb: 'жаяу жүрді', act: 'Жаяу жүру', q: 'Айзере жаяу неше минут жүрді?' }
  };
  const VARS = [
    { segs: [{ g: 'skate', m: 25 }, { g: 'ski', m: 30 }, { g: 'walk', m: 15, u: 1 }], total: 70, ask: 'part' },      // оқулықтағы есеп
    { segs: [{ g: 'walk', m: 15 }, { g: 'skate', m: 25 }, { g: 'ski', m: 30, u: 1 }], total: 70, ask: 'part' },      // кері реттілік
    { segs: [{ g: 'ski', m: 20 }, { g: 'walk', m: 10 }, { g: 'skate', m: 25, u: 1 }], total: 55, ask: 'part' },
    { segs: [{ g: 'skate', m: 15 }, { g: 'ski', m: 25 }, { g: 'walk', m: 20 }], total: 60, ask: 'total' }
  ];
  const GICON = {
    skate: '<path d="M7 4h6v8l5 2.5V17H6z"/><path d="M5 20h14"/>',
    ski: '<path d="M3 18l17-3M3 21l17-3"/><path d="M9 3l3 12"/>',
    walk: '<circle cx="12" cy="4.5" r="2"/><path d="M12 7v7M12 14l-3.5 6M12 14l3.5 6M12 9l-4 3M12 9l4 2.5"/>'
  };

  const G1 = {
    cv: $('#g1-cv'), st: null,
    layout(v) {
      let x = 0;
      return v.segs.map(s => { const g = GEAR[s.g], dur = clamp(8 + s.m * .15, 9, 13); const o = Object.assign({}, s, { dur, x0: x, x1: x + g.speed * dur, speed: g.speed }); x = o.x1; return o; });
    },
    diagram(v, segs) {
      const W = 860, x0 = 48, x1 = 812, y = 114, tot = segs.reduce((a, s) => a + s.m, 0);
      let acc = 0; const xs = [x0]; segs.forEach(s => { acc += s.m; xs.push(x0 + (x1 - x0) * acc / tot); });
      const mid = (x0 + x1) / 2;
      let h = `<svg viewBox="0 0 ${W} 214">`;
      h += `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="#dbe6f5" stroke-width="12" stroke-linecap="round"/>`;
      segs.forEach((s, i) => {
        const a = xs[i], b = xs[i + 1], m = (a + b) / 2, col = GEAR[s.g].color;
        h += `<line class="fill" data-i="${i}" x1="${a + 2}" y1="${y}" x2="${a + 2}" y2="${y}" stroke="${col}" stroke-width="12" stroke-linecap="round"/>`;
        h += `<g class="sg" data-i="${i}" style="opacity:0;transition:opacity .5s"><line x1="${a + 8}" y1="${y - 40}" x2="${b - 18}" y2="${y - 40}" stroke="${col}" stroke-width="4" stroke-linecap="round"/><path d="M${b - 8} ${y - 40} l-14 -8 v16z" fill="${col}"/>`;
        h += `<g transform="translate(${m - 18} ${y - 104}) scale(1.5)"><circle cx="12" cy="12" r="12.5" fill="#fff" stroke="${col}" stroke-width="1.4"/><g fill="none" stroke="${col}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" transform="translate(3 3) scale(.75)">${GICON[s.g]}</g></g>`;
        h += `<text class="lab" data-i="${i}" x="${m}" y="${y - 50}" text-anchor="middle" font-size="27" fill="${s.u ? '#e8365a' : '#17263f'}">${s.u ? '? мин' : s.m + ' мин'}</text></g>`;
      });
      xs.forEach(x => { h += `<line x1="${x}" y1="${y - 13}" x2="${x}" y2="${y + 13}" stroke="#17263f" stroke-width="4" stroke-linecap="round"/>`; });
      h += `<circle id="dg-mk" cx="${x0}" cy="${y}" r="11" fill="#ff9f1c" stroke="#fff" stroke-width="4"/>`;
      h += `<path d="M${x0} ${y + 24} v8 q0 10 10 10 H${mid - 14} q12 0 14 12 q2 -12 14 -12 H${x1 - 10} q10 0 10 -10 v-8" fill="none" stroke="#5d6f8c" stroke-width="3.2" stroke-linecap="round"/>`;
      h += `<text id="dg-total" x="${mid}" y="${y + 92}" text-anchor="middle" font-size="30" fill="${v.ask === 'total' ? '#e8365a' : '#17263f'}">${v.ask === 'total' ? '? мин' : v.total + ' мин'}</text></svg>`;
      $('#g1-diagram').innerHTML = h; return xs;
    },
    story(v, withQ) {
      const conn = ['Алдымен', 'содан кейін', 'одан кейін'];
      const parts = v.segs.map((s, i) => `${conn[i]} ${s.u ? '<b>біраз уақыт</b>' : '<b>' + s.m + ' минут</b>'} ${GEAR[s.g].verb}`);
      let t = `Айзере смарт-сағатының көмегімен жаттығуын тексерді. ${parts.join(', ')}.`;
      if (v.ask === 'part') t += ` Барлығы <b>${v.total} минут</b> жаттықты.`;
      const unk = v.segs.find(s => s.u);
      const q = v.ask === 'part' ? GEAR[unk.g].q : 'Айзере барлығы неше минут жаттықты?';
      return { text: t, q, html: `${t}<span class="ask">${q}</span>` };
    },
    task(v) {
      const unk = v.segs.find(s => s.u), known = v.segs.filter(s => !s.u).map(s => s.m), all = v.segs.map(s => s.m);
      if (v.ask === 'part') return { ans: unk.m, hint: 'hsub', expl: `<div class="sol-line">${v.total} − ${known.join(' − ')} = <b>${unk.m}</b> мин</div><div>Тексеру: ${all.join(' + ')} = ${v.total}</div>` };
      return { ans: v.total, hint: 'hadd', expl: `<div class="sol-line">${all.join(' + ')} = <b>${v.total}</b> мин</div>` };
    },
    begin(vi) {
      const v = VARS[vi], segs = this.layout(v);
      const plan = segs.map((s, i) => ({ kind: GEAR[s.g].kind, x0: i === 0 ? -4000 : s.x0, x1: i === segs.length - 1 ? s.x1 + 6000 : s.x1 }));
      const xs = this.diagram(v, segs);
      const st = this.st = { vi, v, segs, plan, xs, phase: 'lead', leadT: 0, i: 0, tau: 0, pos: segs[0].x0 - 230, run: 0, scale: 1, parts: [], gearT: 0, gt: 0, cheer: 0, stopT: 0, emit: 0, snow: Art.makeSnow(70), resolveAnim: null, solved: false, cam: 0 };
      $('#g1-tag').textContent = `${vi + 1}-есеп · ${vi + 1} / ${VARS.length}`;
      $('#w-act').textContent = 'Смарт-сағат'; $('#w-time').textContent = '0'; $('#w-time').classList.remove('q');
      $('#g1-speed').classList.remove('hidden'); this.setSpeed(1);
      return new Promise(r => { st.resolveAnim = r; });
    },
    setSpeed(s) { if (this.st) this.st.scale = s; $('#g1-speed').style.opacity = s > 1 ? .6 : 1; },
    enterSeg(i) {
      const st = this.st, s = st.segs[i], g = GEAR[s.g];
      $$('#g1-diagram .sg')[i].style.opacity = 1; $('#w-act').textContent = g.act; Sfx.pop();
      for (let k = 0; k < 10; k++) st.parts.push({ x: st.pos - 20 + Math.random() * 30, y: 620 + Math.random() * 16, vx: -80 + Math.random() * 160, vy: -90 - Math.random() * 90, life: .7, r: 3 + Math.random() * 4 });
    },
    update(dt) {
      const st = this.st; if (!st) return;
      const segs = st.segs, last = segs.length - 1;
      st.gt += dt * (st.scale > 1 ? 1.8 : 1);
      if (st.phase === 'lead') {
        st.leadT += dt; const p = clamp(st.leadT / 1.1, 0, 1);
        st.pos = lerp(segs[0].x0 - 230, segs[0].x0, easeOut(p)); st.run = Math.min(1, p * 1.5);
        if (p >= 1) { st.phase = 'anim'; st.gearT = 0; this.enterSeg(0); }
      } else if (st.phase === 'anim') {
        const s = segs[st.i]; st.tau += dt * st.scale; st.gearT += dt; st.run = Math.min(1, st.gearT / .5);
        st.pos = s.x0 + s.speed * Math.min(st.tau, s.dur);
        if (st.tau >= s.dur) { if (st.i < last) { st.i++; st.tau = 0; st.gearT = 0; this.enterSeg(st.i); } else { st.phase = 'stop'; st.stopT = 0; } }
      } else if (st.phase === 'stop') {
        st.stopT += dt; const k = 1 - clamp(st.stopT / .8, 0, 1); st.run = k; st.pos += segs[last].speed * k * dt * .6;
        if (st.stopT >= .8) { st.phase = 'ask'; st.run = 0; $('#g1-speed').classList.add('hidden'); if (st.resolveAnim) { const r = st.resolveAnim; st.resolveAnim = null; r(); } }
      }
      if (st.cheer > 0) st.cheer -= dt;
      // бөлшектер
      if ((st.phase === 'anim' || st.phase === 'lead') && st.run > .3) {
        st.emit += dt * (st.scale > 1 ? 2 : 1); const g = segs[st.i].g, rate = g === 'walk' ? .16 : .05;
        if (st.emit > rate) { st.emit = 0; st.parts.push({ x: st.pos - 26, y: 636 + Math.random() * 8, vx: -30 - Math.random() * 60, vy: -30 - Math.random() * 70, life: .55, r: g === 'walk' ? 3 : 2.2 + Math.random() * 2.5 }); }
      }
      for (const p of st.parts) { p.vy += 260 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
      st.parts = st.parts.filter(p => p.life > 0);
      this.updateDiagram();
    },
    updateDiagram() {
      const st = this.st, v = st.v, segs = st.segs; if (!document.getElementById('dg-mk')) return;
      const fills = $$('#g1-diagram .fill'), xs = st.xs;
      let prog = 0;
      segs.forEach((s, j) => {
        const p = st.phase === 'lead' ? 0 : (st.phase === 'ask' || st.phase === 'stop' || j < st.i) ? 1 : j === st.i ? clamp(st.tau / s.dur, 0, 1) : 0;
        fills[j].setAttribute('x2', (xs[j] + 2 + Math.max(0, xs[j + 1] - xs[j] - 4) * p).toFixed(1)); if (j <= st.i || st.phase === 'ask') prog = xs[j] + (xs[j + 1] - xs[j]) * p;
      });
      $('#dg-mk').setAttribute('cx', (st.phase === 'lead' ? xs[0] : prog).toFixed(1));
      const wt = $('#w-time');
      if (st.phase === 'anim') { const s = segs[st.i]; if (s.u && !st.solved) { wt.textContent = '?'; wt.classList.add('q'); } else { wt.textContent = Math.round(s.m * clamp(st.tau / s.dur, 0, 1)); wt.classList.remove('q'); } }
    },
    reveal() {      // дұрыс жауаптан кейін белгісізді көрсету
      const st = this.st, v = st.v; st.solved = true;
      const un = st.segs.findIndex(s => s.u);
      if (un >= 0) { const t = $$('#g1-diagram .lab')[un]; t.textContent = st.segs[un].m + ' мин'; t.setAttribute('fill', '#168a57'); $('#w-time').textContent = st.segs[un].m; $('#w-time').classList.remove('q'); $('#w-act').textContent = GEAR[st.segs[un].g].act; }
      else { const t = $('#dg-total'); t.textContent = v.total + ' мин'; t.setAttribute('fill', '#168a57'); }
    },
    draw() {
      const st = this.st; if (!st || G.screen !== 'g1') return;
      const f = fitCanvas(this.cv), c = f.ctx, Wu = f.Wu;
      const gx = Wu > 1000 ? Wu * .3 : Wu * .42, cam = st.pos - gx, gy = 640;
      st.cam = cam;
      Art.world(c, Wu, cam, Loop.t, st.plan);
      st.segs.forEach((s, i) => { const sx = s.x0 - cam; if (sx > -260 && sx < Wu + 260) Art.gate(c, sx, GEAR[s.g].label, GEAR[s.g].gate, 1); });
      for (const p of st.parts) { c.globalAlpha = clamp(p.life * 1.8, 0, .9); c.fillStyle = '#fff'; c.beginPath(); c.arc(p.x - cam, p.y, p.r, 0, 6.283); c.fill(); c.strokeStyle = 'rgba(120,160,215,.5)'; c.lineWidth = 1; c.stroke(); }
      c.globalAlpha = 1;
      const gear = st.segs[st.i].g;
      const pose = st.cheer > 0 ? 'cheer' : (st.phase === 'ask' ? ((Math.floor(Loop.t / 3.2) % 2) ? 'watch' : 'think') : 'move');
      const info = Art.girl(c, gx, gy, 1.9, { gear, pose: st.solved && st.cheer <= 0 && st.phase === 'ask' ? 'stand' : pose, t: st.gt, run: st.run, talk: false });
      if (st.phase === 'ask' && !st.solved) thought(c, info.hx, info.hy, Loop.t);
      Art.snowFall(c, Wu, st.snow, Loop.t, Loop.paused ? 0 : .016, 10);
    },
    stop() { this.st = null; }
  };
  function thought(c, x, y, t) {
    const s = 1 + .04 * Math.sin(t * 3);
    c.save(); c.translate(x + 40, y - 70); c.scale(s, s);
    c.fillStyle = '#fff'; c.strokeStyle = '#22344f'; c.lineWidth = 2.5;
    [[-34, 52, 5], [-22, 38, 8]].forEach(([a, b, r]) => { c.beginPath(); c.arc(a, b, r, 0, 6.283); c.fill(); c.stroke(); });
    c.beginPath(); c.ellipse(10, 0, 40, 30, 0, 0, 6.283); c.fill(); c.stroke();
    c.fillStyle = '#ff9f1c'; c.font = '900 40px "Trebuchet MS","Segoe UI",Arial,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', 10, 3);
    c.restore();
  }
  Loop.add(dt => { G1.update(dt); G1.draw(); });
  $('#g1-speed').addEventListener('click', () => { Sfx.click(); G1.setSpeed(G1.st && G1.st.scale > 1 ? 1 : 3); });

  async function playG1(id) {
    show('g1'); setSteps(1); G.game = 1; Companion.say('g1a');
    const results = [];
    for (let vi = 0; vi < VARS.length; vi++) {
      if (stale(id)) return null;
      await G1.begin(vi); if (stale(id)) return null;
      const v = VARS[vi], story = G1.story(v), task = G1.task(v), P = Panels.g1;
      P.mount({ title: 'Айзереге көмектес', sub: 'Сызбаға қарап жауап бер', q: story.html, unit: 'мин' });
      if (vi === 0) Companion.say('g1q');
      const r = await askTask(P, task); if (stale(id)) return null;
      results.push(r); G1.reveal();
      const gain = Battery.add(5 * credit(r)); G.gain1 = (G.gain1 || 0) + gain;
      if (r.ok) { G1.st.cheer = 2.2; Sfx.ok(); FX.sparks(innerWidth * .3, innerHeight * .6, 22); Companion.say('ok' + rnd(1, 6), { mood: 'happy', hop: true }); }
      else { Sfx.bad(); Companion.say('sol', { mood: 'meh' }); }
      const html = (r.ok ? `<b>Дұрыс!</b> ` : `<b>Дұрыс жауап: ${task.ans} мин.</b> `) + task.expl;
      await P.finish(html, r.ok ? 'ok' : 'bad', vi === VARS.length - 1 ? 'Нәтиже' : 'Келесі есеп'); if (stale(id)) return null;
      P.unmount();
    }
    return results;
  }

  /* ============================================================
     2-ОЙЫН. Шытырман оқиға (оқулық, 7-тапсырма): 4 топ, 12 тапсырма
     ============================================================ */
  const vis = (b, e) => {
    if (b > 10 || (e === 3 && b > 5)) return '';
    const col = e === 2 ? '#2f6fed' : '#7b61ff', cells = n => `<div class="mini-grid" style="--n:${n};--c:${col}">${'<i></i>'.repeat(n * n)}</div>`;
    return `<div class="vis">${e === 2 ? cells(b) : Array(b).fill(cells(b)).join('')}</div>`;
  };
  const tPow = (b, e) => ({ q: `<div class="big-eq">${sup(b, e)} = ?</div>`, ans: Math.pow(b, e), hint: e === 2 ? 'hsq' : 'hcu',
    expl: `<div class="sol-line">${sup(b, e)} = ${mulS(b, e)} = <b>${Math.pow(b, e)}</b></div>${vis(b, e)}` });
  const tRev = (b, e) => ({ q: `<div class="big-eq">?<sup>${e}</sup> = ${Math.pow(b, e)}</div><div class="qsub">${e === 2 ? 'Квадраты' : 'Кубы'} ${Math.pow(b, e)} болатын сан қандай?</div>`, ans: b, hint: 'hrev',
    expl: `<div class="sol-line">${mulS(b, e)} = ${Math.pow(b, e)}, сондықтан ${sup(b, e)} = ${Math.pow(b, e)}. Жауабы: <b>${b}</b></div>${vis(b, e)}` });
  const tExpr = terms => {
    const val = terms.map(([b, e, sg]) => (sg === '−' ? -1 : 1) * Math.pow(b, e)), ans = val.reduce((a, b) => a + b, 0);
    const txt = terms.map(([b, e, sg], i) => (i ? ` ${sg} ` : '') + sup(b, e)).join('');
    const nums = terms.map(([b, e], i) => (i ? ` ${terms[i][2]} ` : '') + Math.pow(b, e)).join('');
    return { q: `<div class="big-eq sm">${txt} = ?</div>`, ans, hint: 'hexp',
      expl: `<div class="sol-line">${terms.map(([b, e]) => `${sup(b, e)} = ${Math.pow(b, e)}`).join(', ')}</div><div class="sol-line">${nums} = <b>${ans}</b></div>` };
  };
  const tCount = () => ({ q: `<div>Белгілерде мына сандар бар:</div><div class="big-eq sm">4, 8, 9, 16, 25, 36, 49, 64, 81</div><span class="ask">Олардың ішінде неше сан — бір санның кубы?</span>`, ans: 2, hint: 'hcnt',
    expl: `<div class="sol-line">8 = 2 · 2 · 2 = ${sup(2, 3)}</div><div class="sol-line">64 = 4 · 4 · 4 = ${sup(4, 3)}</div><div>Қалғандары куб емес. Жауабы: <b>2</b> сан.</div>` });
  const TASKS = {
    1: [tPow(7, 2), tPow(3, 3), tExpr([[6, 2, '+'], [3, 2, '+'], [2, 3, '−']])],
    2: [tPow(9, 2), tPow(4, 3), tExpr([[4, 3, '+'], [3, 3, '−'], [2, 3, '+']])],
    3: [tRev(6, 2), tCount(), tExpr([[9, 2, '+'], [3, 3, '−'], [7, 2, '+']])],
    4: [tPow(10, 2), tRev(5, 3), tExpr([[8, 2, '+'], [4, 3, '+'], [5, 2, '−']])]
  };
  const GCOL = { 1: '#ff5a6e', 2: '#2f8cff', 3: '#2dc98a', 4: '#ffa024' };
  const OB_SCALE = { rock: 1.7, log: 1.7, drift: 1.6, ice: 1.15, snowman: 1.3, gate: 1.55 };

  const G2 = {
    cv: $('#g2-cv'), st: null,
    begin() {
      const types = shuffle(['rock', 'log', 'drift', 'ice', 'snowman', 'gate', 'rock', 'log', 'drift', 'ice', 'snowman', 'gate']);
      let seq; do { seq = shuffle([1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4]); } while (seq.some((g, i) => i && g === seq[i - 1]));
      const per = {}; [1, 2, 3, 4].forEach(g => { per[g] = shuffle(TASKS[g]); });
      const cnt = { 1: 0, 2: 0, 3: 0, 4: 0 };
      const obs = types.map((type, i) => { const g = seq[i]; return { type, x: 1000 + i * 880, group: g, task: per[g][cnt[g]++], clear: 0, clearing: false, shake: 0 }; });
      this.st = { obs, idx: 0, pos: -60, vel: 0, phase: 'run', hold: true, finishX: obs[obs.length - 1].x + 1050, plan: [{ kind: 'signs', x0: -4000, x1: 1e7 }], parts: [], snow: Art.makeSnow(80), cheer: 0, gt: 0, pts: [0, 0, 0, 0], arrive: null, fin: null, outcome: [] };
      $('#g2-score').innerHTML = [1, 2, 3, 4].map(g => `<div class="gs" data-g="${g}" style="--c:${GCOL[g]}"><i>${g}</i><span>${ICON.star}<b>0</b></span></div>`).join('');
      $('#g2-prog').innerHTML = obs.map(() => '<i></i>').join(''); this.mark(0, 'on');
    },
    mark(i, cls) { const d = $$('#g2-prog i'); if (!d[i]) return; if (cls === 'on') { d.forEach(x => x.classList.remove('on')); d[i].classList.add('on'); } else { d[i].classList.add(cls); } },
    scoreUI(act) { $$('#g2-score .gs').forEach(e => { const g = +e.dataset.g; e.classList.toggle('act', g === act); $('b', e).textContent = this.st.pts[g - 1]; }); },
    waitArrive() { return new Promise(r => { this.st.arrive = r; }); },
    waitFinish() { return new Promise(r => { this.st.fin = r; }); },
    clearOb(i) { const o = this.st.obs[i]; o.clearing = true; Sfx.shatter(); this.st.cheer = 2; FX.sparks(innerWidth * .3 + 200, innerHeight * .6, 26, '#fff'); },
    update(dt) {
      const st = this.st; if (!st) return;
      st.gt += dt;
      const STOP = 250, vmax = 270;
      if (st.phase === 'run' || st.phase === 'finish') {
        const ob = st.obs[st.idx], target = st.phase === 'run' ? ob.x - STOP : st.finishX + 140;
        const d = target - st.pos, want = vmax * clamp(d / 280, 0, 1);
        st.vel = st.vel < want ? Math.min(want, st.vel + 480 * dt) : lerp(st.vel, want, Math.min(1, dt * 7));
        st.pos += st.vel * dt;
        if (d <= 2 && st.vel < 14 && (st.phase === 'finish' || !st.hold)) {
          st.vel = 0; st.pos = target;
          if (st.phase === 'run') { st.phase = 'wait'; if (st.arrive) { const r = st.arrive; st.arrive = null; r(); } }
          else { st.phase = 'celebrate'; if (st.fin) { const r = st.fin; st.fin = null; r(); } }
        }
      }
      if (st.cheer > 0) st.cheer -= dt;
      for (const o of st.obs) { if (o.clearing && o.clear < 1) o.clear = Math.min(1, o.clear + dt / 1.1); if (o.shake > 0) o.shake = Math.max(0, o.shake - dt * 2.2); }
      if (st.vel > 40) { st.emit = (st.emit || 0) + dt; if (st.emit > .05) { st.emit = 0; st.parts.push({ x: st.pos - 30, y: 636 + Math.random() * 8, vx: -30 - Math.random() * 70, vy: -30 - Math.random() * 80, life: .55, r: 2 + Math.random() * 3 }); } }
      for (const p of st.parts) { p.vy += 260 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
      st.parts = st.parts.filter(p => p.life > 0);
    },
    draw() {
      const st = this.st; if (!st || G.screen !== 'g2') return;
      const f = fitCanvas(this.cv), c = f.ctx, Wu = f.Wu;
      const gx = Wu > 1000 ? Wu * .28 : Wu * .4, cam = st.pos - gx, gy = 640;
      Art.world(c, Wu, cam, Loop.t, st.plan);
      for (const o of st.obs) { const sx = o.x - cam; if (sx > -300 && sx < Wu + 300 && o.clear < 1) Art.obstacle(c, o.type, sx, o.type === 'gate' ? 640 : 646, OB_SCALE[o.type], { clear: o.clear, shake: o.shake, t: Loop.t }); }
      const fx = st.finishX - cam; if (fx > -300 && fx < Wu + 300) Art.finishArch(c, fx, 640, 1.5);
      for (const p of st.parts) { c.globalAlpha = clamp(p.life * 1.8, 0, .9); c.fillStyle = '#fff'; c.beginPath(); c.arc(p.x - cam, p.y, p.r, 0, 6.283); c.fill(); }
      c.globalAlpha = 1;
      const moving = st.vel > 12, pose = st.cheer > 0 || st.phase === 'celebrate' ? 'cheer' : moving ? 'move' : (Math.floor(Loop.t / 3.2) % 2 ? 'watch' : 'think');
      const info = Art.girl(c, gx, gy, 1.9, { gear: 'ski', pose, t: st.gt, run: clamp(st.vel / 270, 0, 1) });
      if (st.phase === 'wait' && st.cheer <= 0) thought(c, info.hx, info.hy, Loop.t);
      Art.snowFall(c, Wu, st.snow, Loop.t, Loop.paused ? 0 : .016, 10 + st.vel * .1);
    },
    stop() { this.st = null; }
  };
  Loop.add(dt => { G2.update(dt); G2.draw(); });

  async function playG2(id) {
    show('g2'); setSteps(2); G.game = 2; G2.begin();
    const st = G2.st, P = Panels.g2;
    Companion.say('g2a').then(() => { if (G2.st === st) st.hold = false; });
    const first = [0, 0, 0, 0], tot = [0, 0, 0, 0];
    for (let i = 0; i < st.obs.length; i++) {
      await G2.waitArrive(); if (stale(id)) return null;
      const ob = st.obs[i]; G2.mark(i, 'on'); G2.scoreUI(ob.group);
      P.mount({ group: ob.group, q: ob.task.q, unit: '' });
      Voice.say('ob' + rnd(1, 3)).then(() => Companion.say('grp' + ob.group));
      const r = await askTask(P, ob.task, { onWrong() { ob.shake = 1; } }); if (stale(id)) return null;
      const pts = r.ok ? (r.tries === 0 ? 3 : 2) : 0; st.pts[ob.group - 1] += pts; tot[ob.group - 1]++; if (r.ok && r.tries === 0) first[ob.group - 1]++;
      G2.scoreUI(ob.group); G2.mark(i, r.ok ? (r.tries === 0 ? 'ok' : 'mid') : 'no'); st.outcome.push(r);
      Battery.add(4 * credit(r));
      if (r.ok) { Sfx.ok(); Companion.say('clr' + rnd(1, 3), { mood: 'happy', hop: true }); } else { Sfx.bad(); Companion.say('sol', { mood: 'meh' }); }
      G2.clearOb(i);
      const html = (r.ok ? `<b>Дұрыс! +${pts} ұпай.</b> ` : `<b>Дұрыс жауап: ${ob.task.ans}.</b> `) + ob.task.expl;
      await P.finish(html, r.ok ? 'ok' : 'bad', i === st.obs.length - 1 ? 'Мәреге!' : 'Алға!'); if (stale(id)) return null;
      P.unmount(); st.idx = i + 1; st.phase = i === st.obs.length - 1 ? 'finish' : 'run'; $$('#g2-score .gs').forEach(e => e.classList.remove('act'));
    }
    await G2.waitFinish(); if (stale(id)) return null;
    Sfx.fanfare(); FX.confetti(140);
    return { pts: st.pts.slice(), first, outcome: st.outcome };
  }

  /* ============================================================
     3-ОЙЫН. Ақиқат па, жалған ба? (оқулық, 8-тапсырма)
     ============================================================ */
  const BANK = [
    ['Айзере 5 000 қадам жүруі қажет. Ол 4 800 қадам жүріп, мақсатына жетті.', false, '4 800 қадам — 5 000-нан аз. Мақсатына жеткен жоқ.', 1],
    [`${sup(2, 3)}-ы 12-ге тең.`, false, '2³ = 2 · 2 · 2 = 8, ал 12 емес.'],
    [`${sup(3, 2)} = 9`, true, '3 · 3 = 9'], [`${sup(4, 2)} = 8`, false, '4 · 4 = 16. (8 болса 4 · 2 болар еді)'],
    [`${sup(5, 3)} = 15`, false, '5 · 5 · 5 = 125'], [`${sup(10, 2)} = 100`, true, '10 · 10 = 100'],
    [`${sup(2, 3)} = 8`, true, '2 · 2 · 2 = 8'], [`${sup(7, 2)} = 42`, false, '7 · 7 = 49'],
    [`${sup(1, 3)} = 1`, true, '1 · 1 · 1 = 1'], [`${sup(4, 3)} = 64`, true, '4 · 4 · 4 = 64'],
    [`${sup(3, 3)} = 9`, false, '3 · 3 · 3 = 27. (9 — бұл 3²)'], [`${sup(9, 2)} = 81`, true, '9 · 9 = 81'],
    [`${sup(3, 2)} > ${sup(2, 3)}`, true, '9 > 8'], [`${sup(2, 3)} = ${sup(3, 2)}`, false, '8 ≠ 9'],
    [`${sup(8, 2)} = ${sup(4, 3)}`, true, '64 = 64'], ['36 — санның квадраты', true, '36 = 6 · 6'],
    ['49 — санның кубы', false, '49 = 7 · 7 — квадрат, ал куб емес.'], ['64 — санның квадраты да, кубы да', true, '64 = 8² және 64 = 4³'],
    ['16 — санның кубы', false, '16 = 4 · 4 — квадрат, ал куб емес.'], ['8 — санның кубы', true, '8 = 2 · 2 · 2'],
    [`${sup(6, 2)} + ${sup(2, 2)} = 40`, true, '36 + 4 = 40'], [`${sup(9, 2)} − ${sup(3, 3)} = 54`, true, '81 − 27 = 54'],
    [`${sup(4, 2)} : ${sup(2, 2)} = 2`, false, '16 : 4 = 4'], [`${sup(2, 3)} · ${sup(3, 2)} = 72`, true, '8 · 9 = 72'],
    [`${sup(5, 2)} = 25`, true, '5 · 5 = 25'], [`${sup(6, 3)} = 18`, false, '6 · 6 · 6 = 216'],
    ['Санның квадраты — санды өзіне көбейту', true, 'Мысалы, 5² = 5 · 5'], ['Санның кубы — санды екі рет көбейту', false, 'Куб — санды үш рет көбейту: 3³ = 3 · 3 · 3']
  ];
  const G3 = {
    st: null, DUR: 60,
    startCard() {
      const c = $('#g3-start'); c.classList.remove('hidden');
      c.innerHTML = `<h2>Ақиқат па, жалған ба?</h2><p>Экранда пікір шығады. Дұрыс болса — <b>Ақиқат</b>, қате болса — <b>Жалған</b> бас.<br>60 секундта қанша пікірді дұрыс табасыңдар?</p>
        <div class="row"><button id="g3-go" class="btn xl green" type="button">${ICON.play.replace('width="20" height="20"', 'width="30" height="30"')}Бастау</button></div>
        <div class="row"><button id="g3-end2" class="btn md ghost" type="button">Ойынды аяқтау</button></div>`;
      $('#g3-stmt').innerHTML = sup(3, 2) + ' = 9'; $('#g3-fb').innerHTML = ''; $('#g3-time').textContent = this.DUR; $('#g3-score').textContent = 0; $('#g3-streak').textContent = 0; $('#g3-barfill').style.width = '100%';
      $('#g3-go').addEventListener('click', () => { Sfx.init(); G3.begin(); });
      $('#g3-end2').addEventListener('click', () => confirmFinish());
    },
    begin() {
      Sfx.go && Sfx.go(); Sfx.tick(); $('#g3-start').classList.add('hidden');
      const order = shuffle(BANK.map((_, i) => i)); order.unshift(order.splice(order.indexOf(0), 1)[0]);   // оқулықтағы пікір бірінші
      this.st = { left: this.DUR, score: 0, streak: 0, on: true, lock: false, paused: false, order, qi: 0, q: null, wrong: 0, right: 0 };
      this.next();
    },
    next() { const st = this.st; const b = BANK[st.order[st.qi % st.order.length]]; st.qi++; st.q = b; const s = $('#g3-stmt'); s.innerHTML = b[0]; s.classList.toggle('long', b[0].length > 40); $('#g3-fb').innerHTML = ''; },
    answer(v) {
      const st = this.st; if (!st || !st.on || st.lock) return;
      Sfx.init(); const ok = v === st.q[1], card = $('#g3-card'); card.classList.remove('good', 'bad'); void card.offsetWidth;
      if (ok) {
        st.score++; st.right++; st.streak++; Sfx.ok(); card.classList.add('good'); Battery.add(1.5);
        $('#g3-fb').innerHTML = `<div class="fb ok"><b>${pick(['Жарайсың!', 'Дұрыс!', 'Тамаша!', 'Керемет!'])}</b> ${st.q[2]}</div>`;
        if (st.streak % 3 === 0) { Companion.say('ok' + rnd(1, 6), { mood: 'happy', hop: true }); }
        st.lock = true; Timers.after(.7, () => { if (this.st === st && st.on) { st.lock = false; this.next(); } });
      } else {
        st.streak = 0; st.wrong++; Sfx.bad(); card.classList.add('bad'); st.lock = true; st.paused = true;
        $('#g3-fb').innerHTML = `<div class="fb bad"><b>Бұл пікір — ${st.q[1] ? 'ақиқат' : 'жалған'}.</b> ${st.q[2]}<div class="qp-act" style="margin-top:8px"><button id="g3-nx" class="btn md green" type="button">Түсіндім${ICON.next}</button></div></div>`;
        $('#g3-nx').addEventListener('click', () => { Sfx.click(); st.lock = false; st.paused = false; this.next(); }); $('#g3-nx').focus();
        Companion.say('bad' + rnd(1, 4), { mood: 'meh' });
      }
      $('#g3-score').textContent = st.score; $('#g3-streak').textContent = st.streak;
    },
    update(dt) {
      const st = this.st; if (!st || !st.on || G.screen !== 'g3') return;
      if (!st.paused) st.left -= dt;
      $('#g3-time').textContent = Math.max(0, Math.ceil(st.left)); $('#g3-barfill').style.width = Math.max(0, st.left / this.DUR * 100) + '%';
      if (st.left <= 0) { st.on = false; this.onEnd && this.onEnd({ score: st.score, wrong: st.wrong }); }
    },
    stop() { if (this.st) this.st.on = false; this.st = null; }
  };
  Loop.add(dt => G3.update(dt));
  $('#g3-true').addEventListener('click', () => G3.answer(true));
  $('#g3-false').addEventListener('click', () => G3.answer(false));
  $('#g3-end').addEventListener('click', () => confirmFinish());
  addEventListener('keydown', e => { if (G.screen !== 'g3' || G.paused || Overlay.open) return; if (e.key === 'ArrowLeft') G3.answer(true); if (e.key === 'ArrowRight') G3.answer(false); });

  function playG3(id) {
    show('g3'); setSteps(3); G.game = 3; G3.startCard(); Companion.say('g3a');
    return new Promise(res => { G3.onEnd = r => { if (!stale(id)) res(r); }; });
  }

  /* ============================================================
     Нәтиже терезесі
     ============================================================ */
  function resultCard(o) {
    Overlay.show(`<div class="ov-robot" id="ov-robot"></div><h2>${o.title}</h2><div class="stars">${starsHTML(o.stars)}</div>${o.extra || ''}
      <div class="stat-row">${o.stats.map(s => `<div class="stat"><b>${s[0]}</b><small>${s[1]}</small></div>`).join('')}</div>
      <div class="gain">+${Math.round(o.gain * 10) / 10}% қуат · Робик: ${Math.round(Battery.v)}%</div><p>${o.msg}</p>
      <div class="ov-actions"><button id="ov-again" class="btn md ghost" type="button">Қайталау</button><button id="ov-next" class="btn md green" type="button">${o.nextLabel}${ICON.next}</button></div>`);
    const r = Robot.create($('#ov-robot'), { mini: true, charge: Battery.v }); Battery.attach(r); r.setPose('cheer');
    $('#ov-again').addEventListener('click', () => { Sfx.click(); Overlay.hide(); o.onAgain(); });
    $('#ov-next').addEventListener('click', () => { Sfx.click(); Overlay.hide(); o.onNext(); });
    Sfx.fanfare(); if (o.stars >= 2) FX.confetti(90);
  }

  /* ============================================================
     Ағын (flow)
     ============================================================ */
  function cleanup() {
    Timers.clearAll(); Voice.stop(); Companion.hide(); G1.stop(); G2.stop(); G3.stop(); Overlay.hide();
    Panels.g1.unmount(true); Panels.g2.unmount(true); if (G.paused) setPaused(false);
  }
  async function goGame(n) {
    const id = ++G.run; cleanup();
    if (n === 1) {
      G.gain1 = 0; const before = Battery.v;
      const res = await playG1(id); if (stale(id) || !res) return;
      G.done[0] = true; setSteps(1);
      const okFirst = res.filter(r => r.ok && r.tries === 0).length, okAny = res.filter(r => r.ok).length;
      const stars = okFirst === res.length ? 3 : okAny >= 3 ? 2 : 1;
      Voice.say('e1');
      resultCard({ title: '1-ойын аяқталды!', stars, stats: [[`${okAny} / ${res.length}`, 'дұрыс жауап'], [`${okFirst}`, 'бірінші рет']], gain: Battery.v - before + 0, msg: 'Айзере жаттығуын аяқтады. Робиктің қуаты өсті!', nextLabel: '2-ойын', onNext: () => goGame(2), onAgain: () => goGame(1) });
      Timers.after(.9, () => resultGain());
    } else if (n === 2) {
      const before = Battery.v;
      const res = await playG2(id); if (stale(id) || !res) return;
      G.done[1] = true; setSteps(2);
      const total = res.pts.reduce((a, b) => a + b, 0), maxPts = 36, ratio = total / maxPts;
      const stars = ratio > .85 ? 3 : ratio > .55 ? 2 : 1;
      const max = Math.max(...res.pts, 1);
      const board = `<div class="board">${[1, 2, 3, 4].map(g => `<div class="brow" style="--c:${GCOL[g]}"><i>${g}</i><div class="bar"><span data-w="${res.pts[g - 1] / 9 * 100}"></span></div><b>${res.pts[g - 1]}</b></div>`).join('')}</div>`;
      Voice.say('e2');
      resultCard({ title: 'Мәреге жеттік!', stars, extra: `<p>Топтардың ұпайы (ең көбі — 9):</p>${board}`, stats: [[`${total}`, 'жалпы ұпай']], gain: Battery.v - before, msg: 'Барлық кедергілерден өттіңдер. Керемет командалық жұмыс!', nextLabel: '3-ойын', onNext: () => goGame(3), onAgain: () => goGame(2) });
      setTimeout(() => $$('.brow .bar span').forEach(s => { s.style.width = s.dataset.w + '%'; }), 120);
      Timers.after(.9, () => resultGain());
    } else {
      const before = Battery.v;
      const res = await playG3(id); if (stale(id)) return;
      G.done[2] = true; setSteps(3);
      const stars = res.score >= 12 ? 3 : res.score >= 7 ? 2 : 1;
      Voice.say('e3');
      resultCard({ title: 'Уақыт бітті!', stars, stats: [[res.score, 'дұрыс жауап'], [res.wrong, 'қате']], gain: Battery.v - before, msg: 'Енді Робикті толық зарядтайық!', nextLabel: 'Робикті зарядтау', onNext: () => finale(false), onAgain: () => goGame(3) });
    }
  }
  function resultGain() { /* қуат анимациясы аяқталған соң шағын Робик жаңарады (Battery.attach арқылы) */ }

  function confirmFinish() {
    if (Overlay.open || ['start', 'intro', 'end'].includes(G.screen)) return;
    setPaused(true);
    Overlay.show(`<h2>Ойынды аяқтаймыз ба?</h2><p>Барлық ойын тоқтайды, Робик бірден толық зарядталады.</p>
      <div class="ov-actions"><button id="cf-no" class="btn md ghost" type="button">Жоқ, ойнаймыз</button><button id="cf-yes" class="btn md red" type="button">Иә, аяқтаймыз</button></div>`, 'confirm');
    $('#cf-no').addEventListener('click', () => { Sfx.click(); Overlay.hide(); setPaused(false); });
    $('#cf-yes').addEventListener('click', () => { Sfx.click(); Overlay.hide(); finale(true); });
  }
  function togglePause() {
    if (G.screen === 'start') return;
    if (G.paused && Overlay.kind === 'pause') { Overlay.hide(); setPaused(false); return; }
    if (G.paused || Overlay.open) return;
    setPaused(true);
    const bv = Voice.hasBrowser();
    Overlay.show(`<h2>Тоқтатылды</h2><p>Дайын болғанда жалғастырыңдар.</p>
      <div class="ov-actions"><button id="pz-go" class="btn xl green" type="button">${ICON.play.replace('width="20" height="20"', 'width="28" height="28"')}Жалғастыру</button></div>
      <div class="ov-actions">${['g1', 'g2', 'g3'].includes(G.screen) ? '<button id="pz-end" class="btn md ghost" type="button">Ойынды аяқтау</button>' : ''}${bv ? `<button id="pz-voice" class="btn md ghost" type="button">Дауыс: ${S.voice === 'robot' ? 'Робот' : 'Браузер'}</button>` : ''}</div>`, 'pause');
    $('#pz-go').addEventListener('click', () => { Sfx.click(); Overlay.hide(); setPaused(false); });
    const e = $('#pz-end'); if (e) e.addEventListener('click', () => { Sfx.click(); Overlay.hide(); finale(true); });
    const v = $('#pz-voice'); if (v) v.addEventListener('click', () => { S.voice = S.voice === 'robot' ? 'browser' : 'robot'; AZ.saveSettings(); v.textContent = 'Дауыс: ' + (S.voice === 'robot' ? 'Робот' : 'Браузер'); });
  }

  /* ---------- Кіріспе ---------- */
  const INTRO = [
    ['i1', { mood: 'meh', pose: 'wave' }], ['i2', { mood: 'ok', pose: 'idle' }], ['i3', { mood: 'ok' }], ['i4', { mood: 'meh' }],
    ['i5', { mood: 'sad', alert: true }], ['i6', { mood: 'sad' }], ['i7', { mood: 'meh' }], ['i8', { mood: 'ok' }], ['i9', { mood: 'happy', pose: 'wave' }]
  ];
  async function runIntro() {
    const id = ++G.run; cleanup(); show('intro'); const scr = $('#scr-intro'); scr.classList.remove('poster');
    Battery.set(10); R.intro.setPose('idle'); R.intro.setMood('meh');
    const card = SubCard($('#intro-text'), $('#intro-dots'), INTRO.length); $('#intro-text').textContent = '';
    Sfx.power(); await Timers.wait(1.5); if (stale(id)) return;
    for (let i = 0; i < INTRO.length; i++) {
      const [key, o] = INTRO[i]; R.intro.setMood(o.mood); R.intro.setPose(o.pose || 'idle');
      if (o.alert) { Sfx.babble(5); R.intro.bounce(); }
      await card.say(key, i); if (stale(id)) return;
    }
    card.done(); R.intro.setMood('sad'); R.intro.setPose('idle');
    scr.classList.add('poster'); Sfx.babble(3);
  }
  $('#intro-skip').addEventListener('click', () => { Sfx.click(); Voice.stop(); });
  $('#poster-go').addEventListener('click', () => { Sfx.click(); goGame(1); });

  /* ---------- Қорытынды ---------- */
  const END = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10'];
  async function finale(early) {
    const id = ++G.run; cleanup(); show('end'); setSteps(0); G.done = [true, true, true];
    const scr = $('#scr-end'); $('#recap').classList.remove('on'); $('#hands').classList.remove('on'); $('#end-actions').classList.remove('on'); $$('.rc').forEach(r => r.classList.remove('open'));
    const card = SubCard($('#end-text'), $('#end-dots'), END.length); $('#end-text').textContent = '';
    R.end.setCharge(Battery.v); R.end.setPose('idle'); R.end.setMood(null); R.end.big(false);
    if (early) { $('#end-text').textContent = LINES.fin.t; await Voice.say('fin'); if (stale(id)) return; }
    // қуат күрт толады
    Sfx.charge(true); R.end.charging(true); R.end.setMood('happy'); Battery.set(100, 1.3);
    await Timers.wait(1.5); if (stale(id)) return;
    R.end.charging(false); R.end.big(true); R.end.setMood('ecstatic'); R.end.setPose('cheer'); Sfx.fanfare(); FX.confetti(240);
    for (let i = 0; i < END.length; i++) {
      const k = END[i];
      if (k === 'f3') R.end.setPose('idle'); if (k === 'f4') { $('#recap').classList.add('on'); }
      if (k === 'f5') { R.end.setPose('up'); $('#hands').classList.add('on'); }
      if (k === 'f6') { R.end.setPose('cheer'); FX.confetti(60); }
      if (k === 'f7') { R.end.setPose('idle'); $('#hands').classList.remove('on'); }
      if (k === 'f10') R.end.setPose('wave');
      await card.say(k, i); if (stale(id)) return;
    }
    card.done(); $('#end-actions').classList.add('on'); FX.confetti(120);
  }
  $('#end-skip').addEventListener('click', () => { Sfx.click(); Voice.stop(); });
  $$('.rc').forEach(b => b.addEventListener('click', () => { Sfx.click(); b.classList.toggle('open'); }));
  $('#end-again').addEventListener('click', () => location.reload());
  $('#end-full').addEventListener('click', () => toggleFull());

  /* ---------- HUD ---------- */
  function toggleFull() { const d = document; if (!d.fullscreenElement) (d.documentElement.requestFullscreen || d.documentElement.webkitRequestFullscreen || (() => { })).call(d.documentElement); else (d.exitFullscreen || d.webkitExitFullscreen || (() => { })).call(d); }
  $('#b-full').addEventListener('click', toggleFull);
  $('#b-pause').addEventListener('click', () => { Sfx.click(); togglePause(); });
  $('#b-finish').addEventListener('click', () => { Sfx.click(); confirmFinish(); });
  const paintSound = () => { $('#ic-sound').style.opacity = S.muted ? .35 : 1; $('#b-sound').title = S.muted ? 'Дыбыс өшірулі' : 'Дыбыс'; };
  $('#b-sound').addEventListener('click', () => { S.muted = !S.muted; AZ.saveSettings(); paintSound(); if (S.muted) { Voice.cur && Voice.cur.pause && Voice.cur.pause(); } else Sfx.click(); });
  paintSound();
  $$('.step').forEach(b => b.addEventListener('click', () => { if (['start', 'intro'].includes(G.screen) || Overlay.open) return; Sfx.click(); goGame(+b.dataset.g); }));
  document.addEventListener('visibilitychange', () => { if (document.hidden && ['g1', 'g2', 'g3'].includes(G.screen) && !G.paused && !Overlay.open) togglePause(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && G.screen !== 'start') { if (G.paused && Overlay.kind === 'pause') togglePause(); else if (!G.paused) togglePause(); } });

  /* ---------- Бастау ---------- */
  $('#btn-start').addEventListener('click', () => {
    Sfx.init(); Voice.init(); Voice.preload(['i1', 'i2', 'i3', 'i4', 'i5', 'i6', 'i7', 'i8', 'i9']); Sfx.click(); runIntro();
    setTimeout(() => Voice.preload(Object.keys(LINES)), 5000);
  });

  window.__RB = { G, Battery, Voice, goGame, finale, runIntro, G1, G2, G3, R, Panels, VARS, TASKS, BANK, setPaused, togglePause, confirmFinish };
  Loop.start();
})();
