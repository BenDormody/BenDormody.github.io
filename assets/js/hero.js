/* ============================================================
   hero.js — Elo convergence animation (home hero).
   Seven rating trajectories start at 1000 and separate as
   simulated duels resolve — a miniature of the dissertation
   model. Draws once (~4.5s), then rests. No libraries.
   ============================================================ */

(function () {
  const canvas = document.getElementById("elo-hero");
  if (!canvas) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const ctx = canvas.getContext("2d");
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const N_LINES = 7;
  const N_STEPS = 90;
  const DRAW_MS = 4500;

  let lines = [];
  let start = null;
  let raf = null;

  // deterministic-ish PRNG so resize doesn't produce jarringly new curves
  let seed = 42;
  function rand() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  function accent() {
    const styles = getComputedStyle(document.documentElement);
    return [
      styles.getPropertyValue("--c-pitch"),
      styles.getPropertyValue("--c-signal"),
      styles.getPropertyValue("--c-graphite"),
      styles.getPropertyValue("--c-oxblood"),
      styles.getPropertyValue("--c-amber"),
      styles.getPropertyValue("--ink-faint"),
      styles.getPropertyValue("--ink-soft"),
    ].map((s) => s.trim());
  }

  function build() {
    seed = 42;
    lines = [];
    // Elo walks: each line converges toward its hidden "true skill"
    for (let i = 0; i < N_LINES; i++) {
      const trueSkill = (rand() - 0.5) * 2; // -1..1
      const trueP = 1 / (1 + Math.pow(10, -trueSkill));
      let r = 0;
      const pts = [0];
      for (let s = 1; s <= N_STEPS; s++) {
        const predicted = 1 / (1 + Math.pow(10, -r * 1.4));
        const win = rand() < trueP ? 1 : 0;
        r += 0.14 * (win - predicted);
        r = Math.max(-1.15, Math.min(1.15, r));
        pts.push(r);
      }
      lines.push(pts);
    }
  }

  function size() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * DPR;
    canvas.height = rect.height * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function draw(progress) {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const colors = accent();
    const midY = h * 0.55;
    const ampl = h * 0.32;
    const upto = Math.max(2, Math.floor(N_STEPS * progress));

    // baseline: rating 1000
    ctx.strokeStyle = "rgba(128,128,128,0.18)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();
    ctx.setLineDash([]);

    lines.forEach((pts, i) => {
      ctx.strokeStyle = colors[i % colors.length];
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let s = 0; s < upto; s++) {
        const x = (s / N_STEPS) * w;
        const y = midY - pts[s] * ampl;
        s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // leading dot
      const lx = ((upto - 1) / N_STEPS) * w;
      const ly = midY - pts[upto - 1] * ampl;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function frame(t) {
    if (start === null) start = t;
    const p = Math.min((t - start) / DRAW_MS, 1);
    // ease-out so the final duels settle gently
    draw(1 - Math.pow(1 - p, 2));
    if (p < 1 && !document.hidden) {
      raf = requestAnimationFrame(frame);
    }
  }

  function run() {
    cancelAnimationFrame(raf);
    size();
    build();
    start = null;
    raf = requestAnimationFrame(frame);
  }

  let resizeT;
  window.addEventListener("resize", () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      size();
      draw(1);
    }, 150);
  });

  // redraw settled state in new palette when theme flips
  new MutationObserver(() => draw(1)).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  run();
})();
