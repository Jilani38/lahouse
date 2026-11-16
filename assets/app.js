(() => {
  "use strict";

  const CFG = window.LAHOUSE || {};
  const TARGET = new Date(CFG.target || "2027-03-20T00:00:00+01:00").getTime();
  const START = new Date(CFG.start || "2026-11-17T00:00:00+01:00").getTime();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const body = document.body;
  const STAR = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 0Q11.2 8.8 20 10Q11.2 11.2 10 20Q8.8 11.2 0 10Q8.8 8.8 10 0Z" fill="currentColor"/></svg>';

  /* ---------- Cadre doré ---------- */

  const frameSvg = document.querySelector(".frame svg");
  document.querySelectorAll(".corner").forEach((c) => (c.innerHTML = STAR));
  document.querySelectorAll(".sep, .motto i").forEach((c) => (c.innerHTML = STAR));

  function layoutFrame() {
    const r = frameSvg.getBoundingClientRect();
    const w = Math.max(10, r.width);
    const h = Math.max(10, r.height);
    frameSvg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const set = (el, o) => {
      el.setAttribute("x", o);
      el.setAttribute("y", o);
      el.setAttribute("width", w - o * 2);
      el.setAttribute("height", h - o * 2);
    };
    set(frameSvg.querySelector(".r1"), 0.7);
    set(frameSvg.querySelector(".r2"), 7);
  }

  /* ---------- Anneau de progression ---------- */

  const prog = document.querySelector(".ring .prog");
  const spark = document.querySelector(".ring .spark");
  function progress() {
    const p = Math.min(1, Math.max(0, (Date.now() - START) / (TARGET - START)));
    const shown = Math.max(0.035, p);
    prog.style.strokeDashoffset = String(100 - shown * 100);
    const a = (shown * 360 - 90) * (Math.PI / 180);
    spark.setAttribute("cx", (50 + 48 * Math.cos(a)).toFixed(2));
    spark.setAttribute("cy", (50 + 48 * Math.sin(a)).toFixed(2));
  }

  /* ---------- Compte à rebours ---------- */

  const units = ["d", "h", "m", "s"].map((k) => ({ k, el: document.querySelector(`.unit.${k} .num`), cells: [] }));
  const secUnit = document.querySelector(".unit.s");

  function split(ms) {
    const t = Math.max(0, Math.floor(ms / 1000));
    return { d: Math.floor(t / 86400), h: Math.floor((t % 86400) / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 };
  }

  function makeCell(ch) {
    const cell = document.createElement("span");
    cell.className = "digit";
    const s = document.createElement("span");
    s.textContent = ch;
    cell.appendChild(s);
    cell.cur = s;
    cell.val = ch;
    return cell;
  }

  function roll(cell, ch, fast) {
    if (cell.val === ch) return;
    const old = cell.cur;
    const nu = document.createElement("span");
    nu.textContent = ch;
    nu.className = fast ? "in fast" : "in";
    old.className = fast ? "out fast" : "out";
    cell.appendChild(nu);
    cell.cur = nu;
    cell.val = ch;
    setTimeout(() => old.remove(), fast ? 140 : 600);
  }

  function render(fast) {
    const p = split(TARGET - Date.now());
    units.forEach((u) => {
      const str = String(p[u.k]).padStart(2, "0");
      if (u.cells.length !== str.length) {
        u.el.textContent = "";
        u.cells = [...str].map((ch) => {
          const c = makeCell(ch);
          u.el.appendChild(c);
          return c;
        });
      } else {
        [...str].forEach((ch, i) => {
          if (!u.cells[i].locked) roll(u.cells[i], ch, fast);
        });
      }
    });
    return p;
  }

  // Effet machine à sous au démarrage
  function slotIntro(done) {
    const target = split(TARGET - Date.now());
    units.forEach((u) => {
      const str = String(target[u.k]).padStart(2, "0");
      u.el.textContent = "";
      u.cells = [...str].map(() => {
        const c = makeCell("0");
        c.locked = true;
        u.el.appendChild(c);
        return c;
      });
    });
    const all = units.flatMap((u) => u.cells);
    if (reduce) {
      all.forEach((c) => (c.locked = false));
      render(false);
      return done();
    }
    const t0 = performance.now();
    const spin = setInterval(() => {
      const el = performance.now() - t0;
      all.forEach((c, i) => {
        if (!c.spinning && c.locked && el > i * 40) c.spinning = true;
        if (c.spinning && el < 900 + i * 110) roll(c, String(Math.floor(Math.random() * 10)), true);
        else if (c.spinning) {
          c.spinning = false;
          c.locked = false;
        }
      });
      if (all.every((c) => !c.locked)) {
        clearInterval(spin);
        render(false);
        done();
      }
    }, 70);
  }

  let lastS = -1;
  let opened = false;
  function tick() {
    const p = render(false);
    if (p.s !== lastS) {
      lastS = p.s;
      secUnit.classList.add("beat");
      setTimeout(() => secUnit.classList.remove("beat"), 160);
    }
    if (!opened && TARGET - Date.now() <= 0) {
      opened = true;
      body.classList.add("is-open");
      celebrate();
    }
  }

  /* ---------- Ciel étoilé (canvas) ---------- */

  const cv = document.getElementById("sky");
  const ctx = cv.getContext("2d");
  let W = 0, H = 0, DPR = 1;
  let stars = [];
  const parts = [];
  const pointer = { x: 0.5, y: 0.35, tx: 0.5, ty: 0.35, last: 0 };
  const glow = document.querySelector(".glow");

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const n = Math.round(Math.min(110, Math.max(40, (W * H) / 9000)));
    stars = Array.from({ length: n }, () => {
      const big = Math.random() < 0.18;
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        r: big ? 2.6 + Math.random() * 3.2 : 0.5 + Math.random() * 1.1,
        star: big,
        z: 0.3 + Math.random() * 0.9,
        ph: Math.random() * Math.PI * 2,
        sp: 0.6 + Math.random() * 1.6,
        vy: -(0.03 + Math.random() * 0.09),
        gold: Math.random() < 0.65,
      };
    });
    layoutFrame();
  }

  function starPath(x, y, r) {
    const k = r * 0.18;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x + k, y - k, x + r, y);
    ctx.quadraticCurveTo(x + k, y + k, x, y + r);
    ctx.quadraticCurveTo(x - k, y + k, x - r, y);
    ctx.quadraticCurveTo(x - k, y - k, x, y - r);
    ctx.closePath();
  }

  function burst(x, y, n, power) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = (0.8 + Math.random() * 2.6) * power;
      parts.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 0.6 * power,
        r: 2 + Math.random() * 4.5,
        life: 1,
        decay: 0.009 + Math.random() * 0.014,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.2,
        gold: Math.random() < 0.75,
      });
    }
  }

  function frame(t) {
    const time = t / 1000;
    if (performance.now() - pointer.last > 2500) {
      pointer.tx = 0.5 + Math.sin(time * 0.23) * 0.28;
      pointer.ty = 0.38 + Math.cos(time * 0.17) * 0.22;
    }
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    glow.style.setProperty("--x", (pointer.x * 100).toFixed(2) + "%");
    glow.style.setProperty("--y", (pointer.y * 100).toFixed(2) + "%");

    ctx.clearRect(0, 0, W, H);
    const ox = (pointer.x - 0.5) * 26;
    const oy = (pointer.y - 0.5) * 26;

    for (const s of stars) {
      s.y += s.vy * s.z;
      if (s.y < -10) { s.y = H + 10; s.x = Math.random() * W; }
      const a = (0.25 + 0.75 * (0.5 + 0.5 * Math.sin(time * s.sp + s.ph))) * (s.star ? 0.9 : 0.6);
      const x = s.x - ox * s.z;
      const y = s.y - oy * s.z;
      ctx.globalAlpha = a;
      ctx.fillStyle = s.gold ? "#d9bd85" : "#f6ecd6";
      if (s.star) {
        starPath(x, y, s.r * (0.85 + 0.15 * Math.sin(time * s.sp * 1.3 + s.ph)));
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vx *= 0.985;
      p.vy = p.vy * 0.985 + 0.035;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= p.decay;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, p.life * 1.4);
      ctx.fillStyle = p.gold ? "#e2c58b" : "#fff6e2";
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      starPath(0, 0, p.r * (0.6 + p.life * 0.4));
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  function celebrate() {
    if (reduce) return;
    const loop = () => {
      burst(Math.random() * W, H * (0.2 + Math.random() * 0.4), 26, 1.4);
      setTimeout(loop, 900);
    };
    loop();
  }

  /* ---------- Interactions ---------- */

  window.addEventListener("pointermove", (e) => {
    pointer.tx = e.clientX / W;
    pointer.ty = e.clientY / H;
    pointer.last = performance.now();
  }, { passive: true });

  window.addEventListener("pointerdown", (e) => {
    pointer.tx = e.clientX / W;
    pointer.ty = e.clientY / H;
    pointer.last = performance.now();
    if (!reduce) burst(e.clientX, e.clientY, 16, 1);
    if (navigator.vibrate) navigator.vibrate(8);
  }, { passive: true });

  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) render(false); });

  /* ---------- Démarrage ---------- */

  function start() {
    resize();
    body.classList.add("go");
    requestAnimationFrame(frame);
    setTimeout(progress, 60);
    const emblem = document.querySelector(".emblem");
    setTimeout(() => {
      if (reduce) return;
      const r = emblem.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 34, 1.6);
    }, 1350);
    setTimeout(() => slotIntro(() => {
      tick();
      setInterval(tick, 250);
    }), reduce ? 0 : 1500);
  }

  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1800))]).then(start);
})();
