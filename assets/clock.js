/* Atomic clock + animated physics visualisations (home page) */
(function () {
  'use strict';
  // ---------------- clock ----------------
  var offset = 0; // ms to add to device clock
  var $ = function (id) { return document.getElementById(id); };
  var syncEl = $('clk-sync');
  function sync() {
    var t0 = Date.now();
    fetch(location.href.split('#')[0], { method: 'HEAD', cache: 'no-store' }).then(function (r) {
      var t1 = Date.now(), d = r.headers.get('Date');
      if (!d) throw 0;
      var server = Date.parse(d) + 500;           // Date header has 1 s resolution
      var off = server - (t0 + t1) / 2;
      if (Math.abs(off) > 1000) { offset = off; syncEl.textContent = 'corrected to server time (' + (off / 1000).toFixed(1) + ' s)'; }
      else { syncEl.textContent = 'synchronised with server time (\u00b10.5 s)'; }
    }).catch(function () { syncEl.textContent = 'device clock'; });
  }
  var fmtTR = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  var fmtDate = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  var fmtUTC = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  var electrons = document.querySelectorAll('#atomic-clock .e');
  var lastSec = -1;
  function tick() {
    var now = new Date(Date.now() + offset), ms = now.getTime();
    $('clk-ms').textContent = '.' + String(ms % 1000).padStart(3, '0');
    var sec = Math.floor(ms / 1000);
    if (sec !== lastSec) {
      lastSec = sec;
      $('clk-time').textContent = fmtTR.format(now);
      $('clk-utc').textContent = fmtUTC.format(now);
      $('clk-date').textContent = fmtDate.format(now);
      $('clk-unix').textContent = String(sec);
      var y0 = Date.UTC(now.getUTCFullYear(), 0, 1);
      $('clk-doy').textContent = String(Math.floor((ms - y0) / 86400000) + 1);
    }
    // electrons: one full orbit per second, three orbits phase-shifted
    var f = (ms % 1000) / 1000;
    for (var i = 0; i < electrons.length; i++) {
      var th = 2 * Math.PI * (f + i / 3);
      electrons[i].setAttribute('cx', (100 * Math.cos(th)).toFixed(2));
      electrons[i].setAttribute('cy', (34 * Math.sin(th)).toFixed(2));
    }
    requestAnimationFrame(tick);
  }
  if ($('clk-time')) { sync(); requestAnimationFrame(tick); }

  // ---------------- physics visualisations ----------------
  var cv = $('phys-canvas'); if (!cv) return;
  var ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
  var off = document.createElement('canvas'), octx = off.getContext('2d');

  function cmap(v) { // v in [0,1] -> dark blue / cyan / white
    v = Math.max(0, Math.min(1, v));
    var r = Math.round(255 * Math.max(0, Math.min(1, 1.8 * v - 0.8)));
    var g = Math.round(255 * Math.max(0, Math.min(1, 1.6 * v - 0.25)));
    var b = Math.round(255 * Math.max(0.12, Math.min(1, 0.25 + 1.2 * v)));
    return [r, g, b];
  }
  function diverging(v) { // v in [-1,1]: blue (-) / black / orange (+)
    var a = Math.min(1, Math.abs(v));
    return v >= 0 ? [Math.round(255 * a), Math.round(150 * a * a), Math.round(40 * a)] : [Math.round(40 * a), Math.round(150 * a * a), Math.round(255 * a)];
  }
  function wl2rgb(l) { // wavelength nm -> rgb
    var r = 0, g = 0, b = 0;
    if (l >= 380 && l < 440) { r = -(l - 440) / 60; b = 1; } else if (l < 490) { g = (l - 440) / 50; b = 1; }
    else if (l < 510) { g = 1; b = -(l - 510) / 20; } else if (l < 580) { r = (l - 510) / 70; g = 1; }
    else if (l < 645) { r = 1; g = -(l - 645) / 65; } else if (l <= 780) { r = 1; }
    var f = l < 420 ? 0.3 + 0.7 * (l - 380) / 40 : l > 700 ? 0.3 + 0.7 * (780 - l) / 80 : 1;
    return 'rgb(' + Math.round(255 * r * f) + ',' + Math.round(255 * g * f) + ',' + Math.round(255 * b * f) + ')';
  }
  function grid(nx, ny) { off.width = nx; off.height = ny; return octx.createImageData(nx, ny); }
  function blit(img) { octx.putImageData(img, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(off, 0, 0, W, H); }

  // 1. two-source interference
  var interf = {
    title: 'Two-source interference', eq: '\u03c8 = \u03a3 (A/\u221ar) sin(kr \u2212 \u03c9t)',
    nx: 225, ny: 105, img: null,
    init: function () { this.img = grid(this.nx, this.ny); },
    draw: function (t) {
      var nx = this.nx, ny = this.ny, d = this.img.data, k = 0.55, w = 3.2;
      var sx1 = nx * 0.12, sy1 = ny * 0.5 - 14, sx2 = nx * 0.12, sy2 = ny * 0.5 + 14;
      for (var y = 0; y < ny; y++) for (var x = 0; x < nx; x++) {
        var r1 = Math.hypot(x - sx1, y - sy1) + 1, r2 = Math.hypot(x - sx2, y - sy2) + 1;
        var v = (Math.sin(k * r1 - w * t) / Math.sqrt(r1) + Math.sin(k * r2 - w * t) / Math.sqrt(r2)) * 2.2;
        var c = diverging(v), p = 4 * (y * nx + x);
        d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2]; d[p + 3] = 255;
      }
      blit(this.img);
    }
  };
  // 2. hydrogen 1s + 2p_z superposition (atomic units)
  var hyd = {
    title: 'Hydrogen atom: 1s + 2p\u2080 superposition', eq: '|\u03c8(t)|\u00b2 oscillates at \u03c9 = (E\u2082 \u2212 E\u2081)/\u0127',
    nx: 225, ny: 105, a: null, b: null, c: null, img: null,
    init: function () {
      var nx = this.nx, ny = this.ny, n = nx * ny; this.img = grid(nx, ny);
      this.a = new Float32Array(n); this.b = new Float32Array(n); this.c = new Float32Array(n);
      var L = 13, s = 2 * L / ny;
      for (var j = 0; j < ny; j++) for (var i = 0; i < nx; i++) {
        var x = (i - nx / 2) * s, z = (ny / 2 - j) * s, r = Math.hypot(x, z);
        var p1 = Math.exp(-r) / Math.sqrt(Math.PI), p2 = z * Math.exp(-r / 2) / (4 * Math.sqrt(2 * Math.PI));
        var q = j * nx + i; this.a[q] = p1 * p1; this.b[q] = p2 * p2; this.c[q] = 2 * p1 * p2;
      }
    },
    draw: function (t) {
      var d = this.img.data, n = this.a.length, cs = Math.cos(1.6 * t);
      for (var q = 0; q < n; q++) {
        var rho = 0.5 * (this.a[q] + this.b[q] + this.c[q] * cs);
        var c = cmap(Math.pow(Math.max(rho, 0) / 0.02, 0.38)), p = 4 * q;
        d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2]; d[p + 3] = 255;
      }
      blit(this.img);
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(W / 2, H / 2, 3, 0, 7); ctx.fill();
    }
  };
  // 3. electromagnetic plane wave
  var em = {
    title: 'Electromagnetic plane wave', eq: 'E \u22a5 B \u22a5 k,   |E| = c|B|',
    init: function () {},
    draw: function (t) {
      ctx.fillStyle = '#050b17'; ctx.fillRect(0, 0, W, H);
      var x0 = 60, x1 = W - 40, cy = H / 2 - 10, A = 120, k = 2 * Math.PI / 260, w = 2.4;
      var px = function (x, y, z) { return [x + z * 0.55, cy - y - z * 0.32]; };
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); var p = px(x0, 0, 0); ctx.moveTo(p[0], p[1]); p = px(x1, 0, 0); ctx.lineTo(p[0], p[1]); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = '15px Segoe UI, sans-serif'; ctx.fillText('k', x1 - 6, cy + 22);
      for (var pass = 0; pass < 2; pass++) {
        var col = pass === 0 ? 'rgba(90,170,255,' : 'rgba(255,90,90,';
        for (var x = x0; x <= x1; x += 9) {
          var ph = Math.sin(k * (x - x0) - w * t) * A;
          var q0 = px(x, 0, 0), q1 = pass === 0 ? px(x, 0, ph * 0.9) : px(x, ph, 0);
          ctx.strokeStyle = col + '.35)'; ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke();
        }
        ctx.strokeStyle = col + '1)'; ctx.lineWidth = 2.6; ctx.beginPath();
        for (var x2 = x0; x2 <= x1; x2 += 3) {
          var ph2 = Math.sin(k * (x2 - x0) - w * t) * A, q = pass === 0 ? px(x2, 0, ph2 * 0.9) : px(x2, ph2, 0);
          if (x2 === x0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]);
        }
        ctx.stroke(); ctx.lineWidth = 1.2;
      }
      ctx.fillStyle = '#ff6b6b'; ctx.fillText('E', 22, cy - 100); ctx.fillStyle = '#6fb6ff'; ctx.fillText('B', 22, cy + 70);
    }
  };
  // 4. Planck blackbody spectrum
  var planck = {
    title: 'Planck blackbody radiation', eq: 'B(\u03bb,T) = (2hc\u00b2/\u03bb\u2075) \u00b7 1/(e^{hc/\u03bbk_BT} \u2212 1)',
    init: function () {},
    B: function (l, T) { var h = 6.626e-34, c = 2.998e8, kB = 1.381e-23, L = l * 1e-9; return 2 * h * c * c / Math.pow(L, 5) / (Math.exp(h * c / (L * kB * T)) - 1); },
    draw: function (t) {
      ctx.fillStyle = '#050b17'; ctx.fillRect(0, 0, W, H);
      var T = 4500 + 1800 * Math.sin(0.5 * t), l0 = 100, l1 = 2500, X0 = 70, X1 = W - 30, Y0 = H - 70, Y1 = 30;
      var Bmax = this.B(2.898e6 / 6300, 6300);
      var X = function (l) { return X0 + (l - l0) / (l1 - l0) * (X1 - X0); };
      var Y = function (b) { return Y0 - b / Bmax * (Y0 - Y1); };
      for (var l = 380; l <= 780; l += 2) { ctx.fillStyle = wl2rgb(l); ctx.globalAlpha = 0.85; ctx.fillRect(X(l), Y(this.B(l, T)), X(l + 2) - X(l) + 0.5, Y0 - Y(this.B(l, T))); }
      ctx.globalAlpha = 1;
      [3000, 4000, 5000, 6000].forEach(function (TT) {
        ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; ctx.beginPath();
        for (var l = l0; l <= l1; l += 10) { var y = Y(planck.B(l, TT)); if (l === l0) ctx.moveTo(X(l), y); else ctx.lineTo(X(l), y); }
        ctx.stroke();
      });
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.4; ctx.beginPath();
      for (var l2 = l0; l2 <= l1; l2 += 5) { var y2 = Y(this.B(l2, T)); if (l2 === l0) ctx.moveTo(X(l2), y2); else ctx.lineTo(X(l2), y2); }
      ctx.stroke();
      var lp = 2.898e6 / T; ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.moveTo(X(lp), Y0); ctx.lineTo(X(lp), Y(this.B(lp, T))); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.moveTo(X0, Y1); ctx.lineTo(X0, Y0); ctx.lineTo(X1, Y0); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = '14px Segoe UI, sans-serif';
      [500, 1000, 1500, 2000, 2500].forEach(function (l) { ctx.fillText(l + ' nm', X(l) - 22, Y0 + 18); });
      ctx.font = '600 18px Segoe UI, sans-serif'; ctx.fillStyle = '#fff';
      ctx.fillText('T = ' + Math.round(T) + ' K', X1 - 175, 52);
      ctx.font = '14px Segoe UI, sans-serif'; ctx.fillStyle = '#9fd0ff';
      ctx.fillText('\u03bb_max = ' + Math.round(lp) + ' nm  (Wien)', X1 - 205, 74);
    }
  };
  // 5. quantum harmonic oscillator, coherent state
  var qho = {
    title: 'Quantum harmonic oscillator: coherent state', eq: '\u27e8x\u27e9(t) = x\u2080 cos \u03c9t,   E\u2099 = \u0127\u03c9(n + \u00bd)',
    init: function () {},
    draw: function (t) {
      ctx.fillStyle = '#050b17'; ctx.fillRect(0, 0, W, H);
      var cx = W / 2, base = H - 60, s = 52, x0 = 2.6, w = 1.3;
      var X = function (x) { return cx + x * s * 1.45; }, V = function (x) { return base - 0.5 * x * x * 30; };
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.beginPath();
      for (var x = -5.6; x <= 5.6; x += 0.05) { if (x === -5.6) ctx.moveTo(X(x), V(x)); else ctx.lineTo(X(x), V(x)); } ctx.stroke();
      ctx.lineWidth = 1;
      for (var n = 0; n < 11; n++) {
        var E = (n + 0.5) * 30, xt = Math.sqrt(2 * (n + 0.5));
        ctx.strokeStyle = 'rgba(127,211,255,.22)'; ctx.beginPath(); ctx.moveTo(X(-xt), base - E); ctx.lineTo(X(xt), base - E); ctx.stroke();
      }
      var xc = x0 * Math.cos(w * t), E0 = (0.5 * x0 * x0 + 0.5) * 30;
      ctx.beginPath(); ctx.moveTo(X(-5.6), base - E0);
      for (var x2 = -5.6; x2 <= 5.6; x2 += 0.03) { var rho = Math.exp(-(x2 - xc) * (x2 - xc)) / Math.sqrt(Math.PI); ctx.lineTo(X(x2), base - E0 - rho * 190); }
      ctx.lineTo(X(5.6), base - E0); ctx.closePath();
      var g = ctx.createLinearGradient(0, base - E0 - 110, 0, base - E0); g.addColorStop(0, 'rgba(127,211,255,.95)'); g.addColorStop(1, 'rgba(127,211,255,.12)');
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = '#ff9d5c'; ctx.lineWidth = 2; ctx.beginPath();
      for (var x3 = -5.6; x3 <= 5.6; x3 += 0.03) {
        var amp = Math.exp(-(x3 - xc) * (x3 - xc) / 2) / Math.pow(Math.PI, 0.25);
        var re = amp * Math.cos(-x0 * Math.sin(w * t) * x3 - 0.5 * w * t);
        var y = base - E0 - re * 95; if (x3 === -5.6) ctx.moveTo(X(x3), y); else ctx.lineTo(X(x3), y);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = '14px Segoe UI, sans-serif';
      ctx.fillText('|\u03c8|\u00b2', 24, 40); ctx.fillStyle = '#ff9d5c'; ctx.fillText('Re \u03c8', 24, 60); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillText('V(x) = \u00bd m\u03c9\u00b2x\u00b2', 24, 80);
    }
  };

  var scenes = [hyd, interf, em, planck, qho], cur = 0, t0 = performance.now(), sceneStart = t0, DUR = 11000;
  scenes.forEach(function (s) { s.init(); });
  var dots = $('vis-dots');
  scenes.forEach(function (s, i) { var b = document.createElement('button'); b.setAttribute('aria-label', s.title); b.addEventListener('click', function () { show(i); }); dots.appendChild(b); });
  function show(i) {
    cur = (i + scenes.length) % scenes.length; sceneStart = performance.now();
    $('vis-title').textContent = scenes[cur].title; $('vis-eq').textContent = scenes[cur].eq;
    [].forEach.call(dots.children, function (b, j) { b.className = j === cur ? 'on' : ''; });
  }
  show(0);
  var visible = true;
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(cv);
  function loop(now) {
    if (visible && !document.hidden) {
      if (now - sceneStart > DUR) show(cur + 1);
      scenes[cur].draw((now - t0) / 1000);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
