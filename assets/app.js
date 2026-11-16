(() => {
  "use strict";

  const CFG = window.LAHOUSE || {};
  const TARGET = new Date(CFG.target || "2027-03-20T00:00:00+01:00").getTime();
  const START = new Date(CFG.start || "2026-11-17T00:00:00+01:00").getTime();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const body = document.body;
  const STAR = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 0Q11.2 8.8 20 10Q11.2 11.2 10 20Q8.8 11.2 0 10Q8.8 8.8 10 0Z" fill="currentColor"/></svg>';
  const now = () => Date.now();

  document.querySelectorAll(".corner, .sep, .motto i").forEach((c) => (c.innerHTML = STAR));

  /* ---------- Vibrations (iPhone + Android) ---------- */
  // iPhone : Safari n'a pas navigator.vibrate, mais basculer un interrupteur <input switch>
  // déclenche le retour haptique du système (iOS 18+). On le fait sur un interrupteur invisible.
  const haptic = (() => {
    const label = document.createElement("label");
    label.className = "hap";
    label.setAttribute("aria-hidden", "true");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.tabIndex = -1;
    label.appendChild(input);
    body.appendChild(label);
    let last = 0;
    return (strong) => {
      const t = performance.now();
      if (t - last < 60) return;
      last = t;
      if (typeof navigator.vibrate === "function") {
        navigator.vibrate(strong ? [12, 40, 18] : 10);
        return;
      }
      label.click();
      if (strong) setTimeout(() => label.click(), 90);
      input.blur();
    };
  })();

  /* ---------- Cadre doré ---------- */

  const frameSvg = document.querySelector(".frame svg");
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
    const p = Math.min(1, Math.max(0, (now() - START) / (TARGET - START)));
    const shown = Math.max(0.035, p);
    prog.style.strokeDashoffset = String(100 - shown * 100);
    const a = (shown * 360 - 90) * (Math.PI / 180);
    spark.setAttribute("cx", (50 + 48 * Math.cos(a)).toFixed(2));
    spark.setAttribute("cy", (50 + 48 * Math.sin(a)).toFixed(2));
  }

  /* ---------- Compte à rebours ---------- */

  const units = ["d", "h", "m", "s"].map((k) => ({ k, el: document.querySelector(`.unit.${k} .num`), cells: [] }));
  const secUnit = document.querySelector(".unit.s");
  let introRunning = false;

  function split(ms) {
    const t = Math.max(0, Math.floor(ms / 1000));
    return { d: Math.floor(t / 86400), h: Math.floor((t % 86400) / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 };
  }

  const strOf = (p, k) => String(p[k]).padStart(2, "0");

  function staticCell(ch) {
    const cell = document.createElement("span");
    cell.className = "digit";
    const s = document.createElement("span");
    s.textContent = ch;
    cell.appendChild(s);
    cell.cur = s;
    cell.val = ch;
    return cell;
  }

  function roll(cell, ch) {
    if (cell.val === ch) return;
    const old = cell.cur;
    const nu = document.createElement("span");
    nu.textContent = ch;
    nu.className = "in";
    old.className = "out";
    cell.appendChild(nu);
    cell.cur = nu;
    cell.val = ch;
    setTimeout(() => old.remove(), 600);
  }

  function render() {
    if (introRunning) return null;
    const p = split(TARGET - now());
    units.forEach((u) => {
      const str = strOf(p, u.k);
      if (u.cells.length !== str.length) {
        u.el.textContent = "";
        u.cells = [...str].map((ch) => u.el.appendChild(staticCell(ch)));
      } else {
        [...str].forEach((ch, i) => roll(u.cells[i], ch));
      }
    });
    return p;
  }

  // Ouverture façon compteur mécanique : chaque chiffre défile vers le bas et se pose
  // exactement sur la bonne valeur, quelle que soit la date (123 jours, 50 jours, 3 jours…).
  function odometer(done) {
    const DUR = 1500;
    const STAG = 140;
    const cellsCount = units.reduce((n, u) => n + strOf(split(TARGET - now()), u.k).length, 0);
    const total = DUR + STAG * (cellsCount - 1);
    const landing = split(TARGET - (now() + total));
    if (reduce) { render(); return done(); }
    introRunning = true;
    let idx = 0;
    units.forEach((u) => {
      const str = strOf(landing, u.k);
      u.el.textContent = "";
      u.cells = [...str].map((ch) => {
        const i = idx++;
        const cell = document.createElement("span");
        cell.className = "digit";
        const strip = document.createElement("div");
        strip.className = "strip";
        const t = +ch;
        const steps = 10 + i * 3 + 4;
        for (let k = steps; k >= 0; k--) {
          const s = document.createElement("span");
          s.textContent = String((t + k) % 10);
          strip.appendChild(s);
        }
        cell.appendChild(strip);
        u.el.appendChild(cell);
        const dur = DUR + i * STAG;
        strip.animate(
          [
            { transform: "translateY(0)", filter: "blur(2.5px)" },
            { filter: "blur(1.5px)", offset: 0.6 },
            { transform: `translateY(-${(steps * 1.08).toFixed(2)}em)`, filter: "blur(0)" },
          ],
          { duration: dur, easing: "cubic-bezier(.16,.72,.12,1)", fill: "forwards" }
        );
        cell.val = ch;
        return cell;
      });
    });
    setTimeout(() => {
      units.forEach((u) => {
        u.cells = u.cells.map((c) => {
          const s = staticCell(c.val);
          c.replaceWith(s);
          return s;
        });
      });
      introRunning = false;
      done();
    }, total + 40);
  }

  let lastS = -1;
  let opened = false;
  function tick() {
    const p = render();
    if (!p) return;
    if (p.s !== lastS) {
      lastS = p.s;
      secUnit.classList.add("beat");
      setTimeout(() => secUnit.classList.remove("beat"), 160);
    }
    if (!opened && TARGET - now() <= 0) {
      opened = true;
      body.classList.add("is-open");
      celebrate();
    }
  }

  /* ---------- Médaille 3D en métal ---------- */

  const medal = document.querySelector(".medal");
  const coin = document.querySelector(".coin");
  const THICK = 5;
  (function buildRims() {
    const n = 14;
    for (let i = 0; i < n; i++) {
      const r = document.createElement("div");
      r.className = "rim";
      const z = -THICK + (2 * THICK * i) / (n - 1);
      r.style.transform = `translateZ(${z.toFixed(2)}px)`;
      coin.insertBefore(r, coin.firstChild);
    }
    coin.style.setProperty("--t", THICK + 0.3 + "px");
  })();

  const M = {
    rx: 0, ry: reduce ? 0 : -720, vy: 0,
    drag: false, settleTo: 0, mode: "intro", hap: null,
    px: 0, py: 0, sx: 0, sy: 0, st: 0, moved: 0,
    introStart: 0,
  };

  medal.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    medal.setPointerCapture(e.pointerId);
    M.drag = true;
    M.mode = "drag";
    M.px = M.sx = e.clientX;
    M.py = M.sy = e.clientY;
    M.st = performance.now();
    M.moved = 0;
    M.vy = 0;
  });

  medal.addEventListener("pointermove", (e) => {
    if (!M.drag) return;
    const dx = e.clientX - M.px;
    const dy = e.clientY - M.py;
    M.px = e.clientX;
    M.py = e.clientY;
    M.moved += Math.abs(dx) + Math.abs(dy);
    M.ry += dx * 0.6;
    M.rx = Math.max(-38, Math.min(38, M.rx - dy * 0.45));
    M.vy = M.vy * 0.4 + dx * 0.6 * 0.6;
  });

  function release(e) {
    if (!M.drag) return;
    M.drag = false;
    const tap = M.moved < 10 && performance.now() - M.st < 350;
    if (tap) {
      M.vy = 26 * (Math.random() < 0.5 ? -1 : 1);
      M.hap = "strong";
      const r = medal.getBoundingClientRect();
      if (!reduce) burst(r.left + r.width / 2, r.top + r.height / 2, 22, 1.3);
    } else if (Math.abs(M.vy) > 2) {
      M.hap = Math.abs(M.vy) > 12 ? "strong" : "light";
    }
    if (e.pointerType !== "touch" && M.hap) { haptic(M.hap === "strong"); M.hap = null; }
    M.mode = "free";
  }

  medal.addEventListener("pointerup", release);
  medal.addEventListener("pointercancel", release);

  function stepMedal(time) {
    if (M.mode === "intro") {
      const k = Math.min(1, Math.max(0, (performance.now() - M.introStart) / 2000));
      const e = 1 - Math.pow(1 - k, 4);
      M.ry = -720 * (1 - e);
      if (k >= 1) { M.ry = 0; M.mode = "rest"; }
    } else if (M.mode === "free") {
      M.ry += M.vy;
      M.vy *= 0.965;
      if (Math.abs(M.vy) < 3.2) {
        M.mode = "settle";
        M.settleTo = Math.round(M.ry / 180) * 180;
      }
    } else if (M.mode === "settle") {
      const f = (M.settleTo - M.ry) * 0.05;
      M.vy = (M.vy + f) * 0.84;
      M.ry += M.vy;
      if (Math.abs(M.settleTo - M.ry) < 0.05 && Math.abs(M.vy) < 0.05) {
        M.ry = M.settleTo;
        M.vy = 0;
        M.mode = "rest";
        if (typeof navigator.vibrate === "function") navigator.vibrate(6);
      }
    }
    if (!M.drag) M.rx += (0 - M.rx) * 0.07;

    const idle = M.mode === "rest" && !reduce;
    const wy = idle ? Math.sin(time * 0.0008) * 14 : 0;
    const wx = idle ? Math.sin(time * 0.0006 + 1) * 7 : 0;
    const ry = M.ry + wy;
    const rx = M.rx + wx;
    coin.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;

    const ryr = (ry * Math.PI) / 180;
    const rxr = (rx * Math.PI) / 180;
    coin.style.setProperty("--a", (ry * 1.6 + rx * 2).toFixed(1) + "deg");
    coin.style.setProperty("--gx", (50 - Math.sin(ryr) * 42).toFixed(1) + "%");
    coin.style.setProperty("--gy", (34 + Math.sin(rxr) * 40).toFixed(1) + "%");
    coin.style.setProperty("--ga", (115 + ry * 0.35).toFixed(1) + "deg");
    coin.style.setProperty("--sx", (50 + Math.sin(ryr) * 45 + Math.sin(rxr) * 20).toFixed(1) + "%");
  }

  /* ---------- Ciel étoilé (canvas) ---------- */

  const cv = document.getElementById("sky");
  const ctx = cv.getContext("2d");
  let W = 0, H = 0, DPR = 1;
  let stars = [];
  const parts = [];
  const pointer = { x: 0.5, y: 0.35, tx: 0.5, ty: 0.35, last: -1e9 };
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
    if (parts.length > 400) parts.splice(0, parts.length - 400);
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
      if (!reduce) s.y += s.vy * s.z;
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

    stepMedal(t);
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

  /* ---------- Interactions globales ---------- */

  const onMedal = (e) => e.target && e.target.closest && e.target.closest(".medal");

  window.addEventListener("pointermove", (e) => {
    pointer.tx = e.clientX / W;
    pointer.ty = e.clientY / H;
    pointer.last = performance.now();
  }, { passive: true });

  window.addEventListener("pointerdown", (e) => {
    pointer.tx = e.clientX / W;
    pointer.ty = e.clientY / H;
    pointer.last = performance.now();
    if (onMedal(e)) return;
    if (!reduce) burst(e.clientX, e.clientY, 16, 1);
  }, { passive: true });

  // Sur iPhone, le retour haptique doit partir d'un vrai geste : on le déclenche à la fin du toucher.
  window.addEventListener("touchend", (e) => {
    if (onMedal(e)) {
      if (M.hap) haptic(M.hap === "strong");
      M.hap = null;
      return;
    }
    haptic(false);
  }, { passive: true });

  window.addEventListener("pointerup", (e) => {
    if (e.pointerType === "touch" || onMedal(e)) return;
    haptic(false);
  }, { passive: true });

  let rz = 0;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(rz);
    rz = requestAnimationFrame(resize);
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });

  /* ---------- Démarrage ---------- */

  function start() {
    resize();
    body.classList.add("go");
    M.introStart = performance.now() + 300;
    if (reduce) M.mode = "rest";
    requestAnimationFrame(frame);
    setTimeout(progress, 60);
    setTimeout(() => {
      if (reduce) return;
      const r = medal.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 34, 1.6);
    }, 1500);
    // Chaque mise à jour est calée pile sur le changement de seconde
    const loop = () => {
      tick();
      const r = TARGET - now();
      setTimeout(loop, r > 0 ? (r % 1000) + 15 : 1000);
    };
    setTimeout(() => odometer(loop), reduce ? 0 : 1300);
  }

  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1800))]).then(start);
})();
