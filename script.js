(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg', CX = 300, CY = 150, PI = Math.PI;
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Bentuk organik (zona & kontur) ---------- */
  function lobe(t, c, w) { return Math.exp((Math.cos(t - c) - 1) / w); }
  function rad(R, amp, seed, t) {
    return R * (1 + amp * (0.95 * lobe(t, PI / 2 + 0.5, 0.10) + 0.6 * lobe(t, PI / 2 - 0.45, 0.12) + 0.3 * lobe(t, PI / 2 + 0.05, 0.05)) +
      0.07 * Math.sin(3 * t + seed) + 0.045 * Math.sin(5 * t + seed * 1.7) + 0.025 * Math.sin(9 * t + seed * 0.6));
  }
  function shape(R, amp, seed) {
    var pts = [], n = 96;
    for (var i = 0; i < n; i++) {
      var t = i / n * 2 * PI, r = rad(R, amp, seed, t);
      pts.push((CX + r * Math.cos(t)).toFixed(1) + ' ' + (CY + r * Math.sin(t)).toFixed(1));
    }
    return 'M' + pts.join('L') + 'Z';
  }
  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  $('z3').setAttribute('d', shape(46, 0.95, 1.1));
  $('z2').setAttribute('d', shape(92, 0.9, 2.3));
  $('z1').setAttribute('d', shape(140, 0.85, 3.4));

  var cg = $('contours');
  for (var i = 1; i <= 16; i++) {
    var R = 14 + i * 18, amp = 0.55 * Math.min(1, i / 8), seed = i * 0.35, idx = i % 4 === 0;
    var p = el('path', { d: shape(R, amp, seed) }, cg);
    if (idx) {
      p.setAttribute('class', 'idx');
      var t = PI * 0.92, r = rad(R, amp, seed, t);
      var tx = el('text', { x: (CX + r * Math.cos(t)).toFixed(1), y: (CY + r * Math.sin(t)).toFixed(1), 'text-anchor': 'middle', 'class': 'lbl', fill: '#e7cfb4', stroke: '#0f0a08' }, cg);
      tx.textContent = Math.round((2930 - i * 160) / 50) * 50;
    }
  }
  var gr = $('grid');
  for (var g = 0; g <= 600; g += 60) {
    el('line', { x1: g, y1: 0, x2: g, y2: 660 }, gr);
    el('line', { x1: 0, y1: g, x2: 600, y2: g }, gr);
  }
  el('line', { x1: 0, y1: 660, x2: 600, y2: 660 }, gr);

  /* ---------- Koordinat kursor (skala 17,5 px = 1 km) ---------- */
  var map = $('map'), coord = $('coord');
  function dms(v, pos, neg) {
    var s = v < 0 ? neg : pos; v = Math.abs(v);
    var d = Math.floor(v), m = (v - d) * 60;
    return d + '°' + m.toFixed(2) + '′ ' + s;
  }
  map.addEventListener('mousemove', function (e) {
    var r = map.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 600, y = (e.clientY - r.top) / r.height * 660;
    var lat = -7.540 - (y - CY) / 17.5 / 111, lon = 110.446 + (x - CX) / 17.5 / 111;
    var d = Math.sqrt((x - CX) * (x - CX) + (y - CY) * (y - CY)) / 17.5;
    coord.textContent = dms(lat, 'LU', 'LS') + ' · ' + dms(lon, 'BT', 'BB') + ' · jarak ke puncak ± ' + d.toFixed(1) + ' km';
  });
  map.addEventListener('mouseleave', function () { coord.textContent = 'Arahkan kursor ke peta untuk membaca koordinat.'; });

  /* ---------- Layer, info, tema ---------- */
  document.querySelectorAll('input[data-t]').forEach(function (c) {
    c.addEventListener('change', function () { var n = $(c.dataset.t); if (n) n.style.display = c.checked ? '' : 'none'; });
  });
  var info = $('info');
  function show(n) {
    info.textContent = '';
    var b = document.createElement('b'); b.textContent = n.dataset.n;
    var p = document.createElement('p'); p.style.margin = '6px 0'; p.textContent = n.dataset.d;
    var k = document.createElement('span'); k.style.color = 'var(--mut)'; k.textContent = n.dataset.k;
    info.appendChild(b); info.appendChild(p); info.appendChild(k);
  }
  document.querySelectorAll('.pt').forEach(function (n) {
    n.addEventListener('click', function () { show(n); });
    n.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(n); } });
  });
  var dark = false;
  $('theme').addEventListener('click', function () {
    var cur = document.documentElement.dataset.theme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = cur === 'dark' ? 'light' : 'dark';
  });

  /* ---------- Level status + abu ---------- */
  var NAMA = ['Normal', 'Waspada', 'Siaga', 'Awas'];
  var LV = [
    { t: 'Normal: aktivitas dasar. Warga beraktivitas seperti biasa.', o3: 0.35, o2: 0.2, s3: 1, s2: 1, pl: 0, po: 0 },
    { t: 'Waspada: aktivitas meningkat. Pantau informasi resmi; zona KRB III disorot.', o3: 0.55, o2: 0.25, s3: 1, s2: 1, pl: 0.45, po: 0.4 },
    { t: 'Siaga: KRB III dikosongkan. Warga di zona merah menuju barak.', o3: 0.85, o2: 0.3, s3: 1.15, s2: 1, pl: 0.85, po: 0.7 },
    { t: 'Awas: KRB III dan KRB II dikosongkan. Radius bahaya diperluas.', o3: 0.9, o2: 0.6, s3: 1.3, s2: 1.15, pl: 1.3, po: 1 }
  ];
  var level = 0, bearing = 250;
  var ARAH = ['Utara', 'Timur Laut', 'Timur', 'Tenggara', 'Selatan', 'Barat Daya', 'Barat', 'Barat Laut'];
  function scaleAround(s) { return 'translate(300px,150px) scale(' + s + ') translate(-300px,-150px)'; }
  function applyPlume() {
    var v = LV[level];
    $('gplume').style.transform = 'translate(300px,150px) rotate(' + (bearing - 90) + 'deg) scale(' + v.pl + ')';
    $('gplume').style.opacity = v.po;
    $('windt').textContent = 'Abu bergerak ke arah ' + ARAH[Math.round(bearing / 45) % 8] + ' (' + bearing + '°).';
  }
  function setLv(i) {
    level = i; var v = LV[i];
    $('z3').style.fillOpacity = v.o3; $('z2').style.fillOpacity = v.o2;
    $('gz3').style.transform = scaleAround(v.s3); $('gz2').style.transform = scaleAround(v.s2);
    $('lvt').textContent = v.t;
    $('badge').textContent = 'Status simulasi: ' + NAMA[i];
    document.body.dataset.level = i;
    document.querySelectorAll('.lv button').forEach(function (b, j) { b.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
    applyPlume();
  }
  document.querySelectorAll('.lv button').forEach(function (b) { b.addEventListener('click', function () { setLv(+b.dataset.l); }); });
  $('wind').addEventListener('input', function (e) { bearing = +e.target.value; applyPlume(); });
  setLv(0);

  /* ---------- Efek abu & bara di hero ---------- */
  var cv = $('fx'), ctx = cv.getContext('2d'), parts = [], W = 0, H = 0, ox = 0, oy = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  function resize() {
    var h = cv.parentNode.getBoundingClientRect(), s = $('mtn').getBoundingClientRect();
    W = h.width; H = h.height;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ox = W / 2; oy = (s.top - h.top) + s.height * (118 / 380);
  }
  function spawn() {
    var ember = Math.random() < 0.55, lv = level;
    parts.push({
      e: ember, x: ox + (Math.random() - 0.5) * 40, y: oy,
      vx: (Math.random() - 0.5) * (1 + lv) * 0.9 + (bearing > 180 ? -0.25 : 0.25),
      vy: -(ember ? 1.2 + Math.random() * (1.4 + lv) : 0.4 + Math.random() * 0.5),
      r: ember ? 0.8 + Math.random() * 1.6 : 12 + Math.random() * 22,
      life: 0, max: ember ? 90 + Math.random() * 80 : 260 + Math.random() * 120
    });
  }
  function frame() {
    ctx.clearRect(0, 0, W, H);
    var rate = [0.05, 0.25, 0.7, 1.6][level];
    if (Math.random() < rate % 1) spawn();
    for (var n = 0; n < Math.floor(rate); n++) spawn();
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.life++;
      if (p.life > p.max || parts.length > 420) { parts.splice(i, 1); continue; }
      var k = p.life / p.max;
      p.x += p.vx; p.y += p.vy; p.vy += p.e ? 0.012 : -0.0015;
      if (p.e) {
        ctx.globalAlpha = (1 - k) * 0.95; ctx.fillStyle = k < 0.4 ? '#ffd27a' : '#ff6a2b';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      } else {
        var rr = p.r * (1 + k * 2.2), gr2 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
        gr2.addColorStop(0, 'rgba(70,56,50,' + 0.22 * (1 - k) + ')'); gr2.addColorStop(1, 'rgba(70,56,50,0)');
        ctx.globalAlpha = 1; ctx.fillStyle = gr2; ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, 6.283); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('load', resize);
  resize();
  if (!reduce) frame();
})();
