/* Робик — жүргізуші робот (SVG). Жүзі, қуат индикаторы, қимылдары. */
(function () {
  'use strict';
  const AZ = window.AZ = window.AZ || {};
  let UID = 0;

  function markup(p) {
    const segs = [0, 1, 2, 3, 4].map(i =>
      `<rect class="seg-bg" x="${111 + i * 16}" y="248" width="13" height="26" rx="3"/>` +
      `<rect class="seg-fill" data-i="${i}" x="${111 + i * 16}" y="248" width="0" height="26" rx="3"/>`).join('');
    const ring = (cx, cy, rot) => `<circle class="ring" cx="${cx}" cy="${cy}" r="21" transform="rotate(${rot} ${cx} ${cy})"/>`;
    return `
<svg class="rb" viewBox="0 0 300 430" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Робик роботы">
  <defs>
    <radialGradient id="${p}sh" cx=".3" cy=".2" r=".95"><stop offset="0" stop-color="#ffffff"/><stop offset=".65" stop-color="#eef3fa"/><stop offset="1" stop-color="#c9d5e6"/></radialGradient>
    <linearGradient id="${p}vi" x1="0" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="#1b2947"/><stop offset="1" stop-color="#05080f"/></linearGradient>
    <clipPath id="${p}cl"><polygon points="76,141 150,108 150,176 76,176"/></clipPath>
    <clipPath id="${p}cr"><polygon points="224,141 150,108 150,176 224,176"/></clipPath>
  </defs>
  <ellipse class="rb-shadow" cx="150" cy="424" rx="86" ry="9"/>
  <g class="rb-all">
    <!-- аяқтар -->
    <rect x="116" y="372" width="16" height="28" rx="6" class="shell"/>
    <rect x="168" y="372" width="16" height="28" rx="6" class="shell"/>
    <path class="black" d="M86 414 L96 394 Q99 388 108 388 H142 Q151 388 154 394 L162 414 Q163 420 156 420 H92 Q85 420 86 414Z"/>
    <path class="black" d="M214 414 L204 394 Q201 388 192 388 H158 Q149 388 146 394 L138 414 Q137 420 144 420 H208 Q215 420 214 414Z" transform="translate(0 0)"/>
    <!-- дене -->
    <rect x="96" y="330" width="108" height="48" rx="24" fill="url(#${p}sh)" class="shellp"/>
    <rect x="74" y="216" width="152" height="124" rx="42" fill="url(#${p}sh)" class="shellp"/>
    <path d="M90 238 q-9 32 0 62 M210 238 q9 32 0 62" class="seam"/>
    <rect x="104" y="234" width="92" height="82" rx="15" class="panel"/>
    ${segs}
    <rect x="199" y="256" width="6" height="14" rx="2" class="cap"/>
    <text class="pct" x="150" y="300" text-anchor="middle">10%</text>
    <text class="lbl" x="150" y="334" text-anchor="middle">РОБИК</text>
    <!-- қолдар -->
    <g class="arm arm-l" style="transform-origin:64px 252px">
      <rect x="48" y="236" width="32" height="66" rx="16" fill="url(#${p}sh)" class="shellp"/>
      <rect x="44" y="292" width="40" height="40" rx="16" class="black"/>
      <path d="M52 309 h24 M52 320 h24" class="knuck"/>
    </g>
    <g class="arm arm-r" style="transform-origin:236px 252px">
      <rect x="220" y="236" width="32" height="66" rx="16" fill="url(#${p}sh)" class="shellp"/>
      <rect x="216" y="292" width="40" height="40" rx="16" class="black"/>
      <path d="M224 309 h24 M224 320 h24" class="knuck"/>
    </g>
    <rect x="128" y="206" width="44" height="18" rx="7" class="neck"/>
    <!-- бас -->
    <g class="head">
      <rect x="28" y="108" width="32" height="66" rx="16" class="black"/>
      <rect x="240" y="108" width="32" height="66" rx="16" class="black"/>
      <rect x="46" y="62" width="208" height="150" rx="58" fill="url(#${p}sh)" class="shellp"/>
      <circle cx="150" cy="66" r="13" class="sensor"/>
      <circle class="led" cx="150" cy="66" r="5.5"/>
      <rect x="68" y="84" width="164" height="112" rx="42" fill="url(#${p}vi)"/>
      <path d="M88 104 Q100 91 130 91" class="shine"/>
      <g class="face">
        <g class="eyes e-ok">${ring(116, 134, -80)}${ring(184, 134, -100)}
          <circle class="glint" cx="106" cy="124" r="4"/><circle class="glint" cx="174" cy="124" r="4"/></g>
        <g class="eyes e-sad">
          <g clip-path="url(#${p}cl)">${ring(116, 136, -80)}</g><g clip-path="url(#${p}cr)">${ring(184, 136, -100)}</g>
          <path class="tear" d="M96 164 q-6 10 0 14 q6 -4 0 -14z"/>
        </g>
        <g class="eyes e-happy"><path class="arc" d="M92 146 Q116 108 140 146"/><path class="arc" d="M160 146 Q184 108 208 146"/></g>
        <g class="eyes e-sleep"><path class="arc" d="M92 134 Q116 152 140 134"/><path class="arc" d="M160 134 Q184 152 208 134"/></g>
        <g class="mouth m-smile"><path class="mline" d="M128 172 Q150 190 172 172"/></g>
        <g class="mouth m-big"><path class="mfill" d="M124 168 Q150 206 176 168 Q150 176 124 168Z"/></g>
        <g class="mouth m-sad"><path class="mline" d="M130 184 Q150 168 170 184"/></g>
        <g class="mouth m-flat"><path class="mline" d="M134 178 H166"/></g>
        <ellipse class="blush" cx="86" cy="168" rx="9" ry="5"/><ellipse class="blush" cx="214" cy="168" rx="9" ry="5"/>
      </g>
    </g>
    <g class="sparks">
      <path d="M36 150 l12 -22 l4 12 l12 -4 l-14 24 l-4 -12z"/><path d="M262 120 l10 -18 l4 10 l10 -3 l-12 20 l-4 -10z"/>
      <path d="M30 262 l9 -16 l3 9 l9 -3 l-10 18 l-3 -9z"/><path d="M262 280 l9 -16 l3 9 l9 -3 l-10 18 l-3 -9z"/>
    </g>
    <g class="zz"><text x="228" y="60">z</text><text x="246" y="38" style="font-size:30px">Z</text><text x="268" y="14" style="font-size:38px">Z</text></g>
    <!-- процент белгісі -->
    <g class="badge">
      <rect class="bb" x="78" y="-34" width="144" height="46" rx="23"/>
      <path class="bbp" d="M142 12 L150 24 L158 12Z"/>
      <text class="bt" x="150" y="-2" text-anchor="middle">10%</text>
    </g>
  </g>
</svg>`;
  }

  const MOODS = {
    sleep:   { eyes: 'sleep', mouth: 'flat' },
    sad:     { eyes: 'sad',   mouth: 'sad' },
    meh:     { eyes: 'ok',    mouth: 'flat' },
    ok:      { eyes: 'ok',    mouth: 'smile' },
    happy:   { eyes: 'happy', mouth: 'smile' },
    ecstatic:{ eyes: 'happy', mouth: 'big' }
  };
  const moodFor = c => c <= 25 ? 'sad' : c <= 55 ? 'meh' : c < 90 ? 'ok' : 'happy';
  const colFor = c => c >= 100 ? '#f5a700' : c < 30 ? '#ff4d5e' : c < 60 ? '#ff9f1c' : '#27c47d';

  function create(host, opts) {
    opts = opts || {};
    const p = 'rb' + (++UID) + '_';
    host.innerHTML = markup(p);
    const svg = host.querySelector('svg');
    if (opts.mini) { svg.setAttribute('viewBox', '16 -6 268 222'); svg.classList.add('rb-mini'); }
    const fills = [...svg.querySelectorAll('.seg-fill')];
    const pct = svg.querySelector('.pct'), bt = svg.querySelector('.bt');
    const ctl = { el: svg, host, charge: 10, mood: null, _auto: true };

    ctl.setMood = function (m) {            // m=null → зарядқа қарай автоматты
      this._auto = !m; this.mood = m;
      const mm = MOODS[m || moodFor(this.charge)];
      svg.dataset.eyes = mm.eyes; svg.dataset.mouth = mm.mouth;
      svg.dataset.mood = m || moodFor(this.charge);
    };
    ctl.setCharge = function (v) {
      v = Math.max(0, Math.min(100, v)); this.charge = v;
      const col = colFor(v);
      svg.style.setProperty('--bcol', col);
      fills.forEach((f, i) => {
        const k = Math.max(0, Math.min(1, v / 20 - i));
        f.setAttribute('width', (13 * k).toFixed(1));
        f.style.fill = col;
      });
      const txt = Math.round(v) + '%';
      pct.textContent = txt; bt.textContent = txt;
      svg.dataset.low = v <= 20 ? '1' : '0';
      svg.dataset.full = v >= 100 ? '1' : '0';
      if (this._auto) this.setMood(null);
    };
    ctl.setPose = function (name) { svg.dataset.pose = name || 'idle'; };
    ctl.talk = function (on) { svg.dataset.talk = on ? '1' : '0'; };
    ctl.badge = function (on) { svg.dataset.badge = on ? '1' : '0'; };
    ctl.big = function (on) { svg.dataset.bigbadge = on ? '1' : '0'; };
    ctl.charging = function (on) { svg.dataset.charging = on ? '1' : '0'; };
    ctl.bounce = function () { svg.classList.remove('hop'); void svg.getBoundingClientRect(); svg.classList.add('hop'); };
    ctl.setPose('idle'); ctl.badge(opts.badge !== false); ctl.setMood(null); ctl.setCharge(opts.charge != null ? opts.charge : 10);
    return ctl;
  }

  AZ.Robot = { create, moodFor, colFor };
})();
