/* The pitch: the home page's Hairline figure, at a size of its own and able to zoom.

   Hairline figures live in a 400 x 320 box, so this mounts on the package's core
   (iso, motion, stage) directly. A view hands the stage three things: which part of the
   pitch to frame, what the tiles show, and a scene to draw on top. */

const {
  Cam, clamp, fit, hull, lerp, mk, open, poly, proj, rad, register, reducedMotion, ringAt, rrect,
  spring, stepS, tdone, tset, tval, tween, unproj,
} = window.HairlineCore;

export const L = 120, W = 80, NX = 18, NY = 12, CW = L / NX, RH = W / NY, HMAX = 13;
const GAP = 0.42, FLOOR = 0.6, PB = 2.2, M = 4.5, PAD = 20, MIN_DRAWN = 780, HEADROOM = 9;
const GH = 5.3, GD = 3.2, BILLOW = 2.6, RIP = 5;

/* `goal` and `goalFlat` look at the goal from the pitch, with the attackers going up the screen */
const CAMERAS = { angled: { az: 22, k: 0.62 }, flat: { az: 0, k: 1 }, goal: { az: -80, k: 0.58 }, goalFlat: { az: -90, k: 1 }, corner: { az: -84, k: 0.78 } };

export function markings() {
  const cy = W / 2;
  const arc = (x, y, r, a0, a1, n) =>
    Array.from({ length: n + 1 }, (_, k) => [x + r * Math.cos(a0 + ((a1 - a0) * k) / n), y + r * Math.sin(a0 + ((a1 - a0) * k) / n)]);
  const out = [arc(L / 2, cy, 10, 0, 2 * Math.PI, 56), [[L / 2 - 0.5, 0], [L / 2 - 0.5, W]]];
  for (const end of [0, 1]) {
    const gx = end ? L : 0, d = end ? -1 : 1, spot = gx + d * 12, a = Math.acos(6 / 10);
    out.push([[gx, cy - 22], [gx + d * 18, cy - 22], [gx + d * 18, cy + 22], [gx, cy + 22]]);
    out.push([[gx, cy - 10], [gx + d * 6, cy - 10], [gx + d * 6, cy + 10], [gx, cy + 10]]);
    out.push(end ? arc(spot, cy, 10, Math.PI - a, Math.PI + a, 14) : arc(spot, cy, 10, -a, a, 14));
    out.push(arc(spot, cy, 0.45, 0, 2 * Math.PI, 8));
  }
  return out;
}

function split(lines, tileAt) {
  const runs = new Map();
  for (const line of lines) {
    let cur = null, key = null;
    for (let s = 0; s < line.length - 1; s++) {
      const [ax, ay] = line[s], [bx, by] = line[s + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * 2));
      for (let k = 0; k <= n; k++) {
        const x = ax + ((bx - ax) * k) / n, y = ay + ((by - ay) * k) / n, t = tileAt(x, y);
        if (t !== key) { cur = null; key = t; }
        if (t === null) continue;
        if (!cur) { cur = []; if (!runs.has(t)) runs.set(t, []); runs.get(t).push(cur); }
        cur.push([x, y]);
      }
    }
  }
  return runs;
}

export function createStage(host, hooks = {}) {
  let VW = 1000, VH = 640;
  const svg = mk("svg", { viewBox: `0 0 ${VW} ${VH}`, class: "pv-svg", "aria-hidden": "true" }, host);
  const root = mk("g", {}, svg);

  const C = Cam(CAMERAS.angled.az, CAMERAS.angled.k, 1);
  const az = spring(CAMERAS.angled.az, { k: 60, c: 14, eps: 0.02 });
  const elev = spring(CAMERAS.angled.k, { k: 60, c: 14, eps: 0.0005 });
  const framing = () => spring(0, { k: 46, c: 13, eps: 0.02 });
  const fx0 = framing(), fx1 = framing(), fy0 = framing(), fy1 = framing(), roof = framing();
  fx1.x = fx1.t = L; fy1.x = fy1.t = W; roof.x = roof.t = HMAX + HEADROOM;
  let P = proj(C), geometry = true, overlays = true;

  function aim() {
    C.az = rad(clamp(az.x, -90, 90)); C.k = clamp(elev.x, 0.2, 1); C.S = 1; C.ox = 0; C.oy = 0;
    const pts = [];
    for (const [x, y] of [[fx0.x - M, fy0.x - M], [fx1.x + M, fy0.x - M], [fx1.x + M, fy1.x + M], [fx0.x - M, fy1.x + M]]) pts.push([x, y, -PB], [x, y, roof.x]);
    const Q = proj(C);
    let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
    for (const p of pts) { const q = Q(p[0], p[1], p[2]); a = Math.min(a, q[0]); b = Math.max(b, q[0]); c = Math.min(c, q[1]); d = Math.max(d, q[1]); }
    C.S = Math.min((VW - PAD * 2) / (b - a), (VH - PAD * 2) / (d - c));
    fit(C, pts, VW / 2, VH / 2);
    P = proj(C);
  }

  const plinthRing = rrect(-M, -M, L + M, W + M, 2, 3);
  const plinth = mk("path", { class: "pv-plinth" }, root);
  const tileAt = (x, y) => {
    const i = Math.floor(x / CW), j = Math.floor(y / RH), lx = x - i * CW, ly = y - j * RH, e = GAP / 2 + 0.05;
    return i < 0 || i >= NX || j < 0 || j >= NY || lx < e || lx > CW - e || ly < e || ly > RH - e ? null : i + "," + j;
  };
  const runs = split(markings(), tileAt);

  function goal(end) {
    const gl = end ? L : 0, out = end ? 1 : -1, grp = mk("g", {}, root);
    const net = mk("path", { class: "pv-net" }, grp), mesh = mk("path", { class: "pv-net lo" }, grp), frame = mk("path", { class: "pv-goal" }, grp);
    const o = { gl, out, frame, g: grp, bil: tween(0), up: false };
    o.draw = (b) => {
      const back = gl + out * (GD + b), a = 36, z = 44;
      frame.setAttribute("d", open([P(gl, a, 0), P(gl, a, GH), P(gl, z, GH), P(gl, z, 0)]));
      net.setAttribute("d", open([P(gl, a, GH), P(back, a, 0), P(back, z, 0), P(gl, z, GH)]));
      mesh.setAttribute("d", [37.6, 39.2, 40.8, 42.4].map((y, k) => open([P(gl, y, GH), P(back + out * b * 0.5 * Math.sin((Math.PI * (k + 1)) / 5), y, 0)])).join(""));
    };
    return o;
  }

  const goals = [goal(0)], tiles = [];
  /* in x, then y: a tile is painted after the two behind it at every azimuth from 0 to 90 */
  for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) {
    const x0 = i * CW + GAP / 2, y0 = j * RH + GAP / 2, g = mk("g", {}, root);
    tiles.push({
      i, j, g,
      ring: rrect(x0, y0, x0 + CW - GAP, y0 + RH - GAP, 0.7, 2),
      side: mk("path", { class: "pv-side" }, g),
      lid: mk("path", { class: "pv-lid" }, g),
      lines: mk("path", { class: "pv-mark" }, g),
      runs: runs.get(i + "," + j) || [],
      sp: spring(FLOOR, { k: 34 + (i + j) * 2.6, c: 11, eps: 0.03 }),
      base: FLOOR, rip: tween(0, 520), up: false, key: "", drawn: NaN,
    });
  }
  goals.push(goal(1));
  const heights = new Float32Array(NX * NY).fill(FLOOR);
  const sceneGroup = mk("g", { class: "pv-scene" }, root);
  let scene = null, behind = false;

  /* painted back to front: past azimuth 0 the far end of the pitch swaps */
  function paintOrder(flip) {
    if (flip === behind) return;
    behind = flip;
    const byX = tiles.slice().sort((a, b) => (flip ? b.i - a.i : a.i - b.i) || a.j - b.j);
    const order = flip ? [goals[1].g, ...byX.map((t) => t.g), goals[0].g] : [goals[0].g, ...byX.map((t) => t.g), goals[1].g];
    for (const el of order) root.insertBefore(el, sceneGroup);
  }

  function topAt(x, y) {
    const u = clamp(x / CW - 0.5, 0, NX - 1.001), v = clamp(y / RH - 0.5, 0, NY - 1.001);
    const i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j;
    const h = (ii, jj) => heights[ii + NX * jj];
    return lerp(lerp(h(i, j), h(i + 1, j), a), lerp(h(i, j + 1), h(i + 1, j + 1), a), b) + 0.3;
  }

  const ctx = { get P() { return P; }, top: topAt, get k() { return C.k; } };

  const pulse = (o, key, now) => {
    if (o.up && tdone(o[key], now)) { o.up = false; tset(o[key], 0, now, 0); }
    return !tdone(o[key], now);
  };

  const loop = register(host, (dt, now) => {
    let moving = false;
    if (stepS(az, dt) | stepS(elev, dt) | stepS(fx0, dt) | stepS(fx1, dt) | stepS(fy0, dt) | stepS(fy1, dt) | stepS(roof, dt)) { geometry = true; moving = true; }
    if (geometry) { aim(); paintOrder(az.x < 0); }
    if (scene?.tick) { if (scene.tick(dt, ctx)) moving = true; overlays = true; }
    for (const t of tiles) {
      t.sp.t = t.base;
      if (stepS(t.sp, dt)) moving = true;
      if (pulse(t, "rip", now)) moving = true;
      const h = Math.max(FLOOR * 0.5, t.sp.x + RIP * tval(t.rip, now));
      heights[t.i + NX * t.j] = h;
      if (h === t.drawn && !geometry) continue;
      t.drawn = h; overlays = true;
      t.side.setAttribute("d", poly(hull(ringAt(P, t.ring, h).concat(ringAt(P, t.ring, 0)))));
      t.lid.setAttribute("d", poly(ringAt(P, t.ring, h)));
      if (t.runs.length) t.lines.setAttribute("d", t.runs.map((r) => open(r.map(([x, y]) => P(x, y, h)))).join(""));
    }
    for (const o of goals) { if (pulse(o, "bil", now)) moving = true; o.draw(tval(o.bil, now)); }
    if (geometry) plinth.setAttribute("d", poly(hull(ringAt(P, plinthRing, 0).concat(ringAt(P, plinthRing, -PB)))));
    if ((geometry || overlays) && scene?.draw) scene.draw(ctx);
    geometry = false; overlays = false;
    return moving;
  });

  /* drag turns the camera; a press that doesn't move is a click on the pitch */
  let drag = null;
  const groundAt = (e) => {
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    const [x, y] = unproj(C, q.x, q.y, 0);
    return x >= 0 && x <= L && y >= 0 && y <= W ? [x, y] : null;
  };
  svg.addEventListener("pointerdown", (e) => {
    drag = { x: e.clientX, y: e.clientY, az: az.t, k: elev.t, moved: false };
    svg.setPointerCapture?.(e.pointerId);
  });
  svg.addEventListener("pointermove", (e) => {
    if (!drag) { hooks.onPoint?.(groundAt(e)); return; }
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 6) { drag.moved = true; svg.classList.add("turning"); hooks.onCamera?.(null); }
    if (drag.moved) {
      az.t = clamp(drag.az + dx * 0.22, -90, 90);
      elev.t = clamp(drag.k - dy * 0.0016, 0.36, 1);
      loop.wake();
    }
  });
  const release = () => { drag = null; svg.classList.remove("turning"); };
  svg.addEventListener("pointerup", (e) => {
    const click = drag && !drag.moved;
    release();
    if (click) hooks.onClick?.(groundAt(e));
  });
  svg.addEventListener("pointerleave", () => { if (!drag) hooks.onPoint?.(null); });
  svg.addEventListener("pointercancel", release);

  new ResizeObserver((entries) => {
    const { width, height } = entries[0].contentRect;
    if (!width || !height) return;
    const zoom = Math.max(1, MIN_DRAWN / width); /* below this width the drawing scales down, marks with it */
    VW = width * zoom; VH = height * zoom;
    svg.setAttribute("viewBox", `0 0 ${VW} ${VH}`);
    geometry = true; loop.wake();
  }).observe(host);

  return {
    /** Frames part of the pitch. `low` says nothing stands tall here, so the frame can sit tighter. */
    focus(x0, x1, { y0 = 0, y1 = W, low = false } = {}) {
      fx0.t = x0; fx1.t = x1; fy0.t = y0; fy1.t = y1; roof.t = low ? 3 : HMAX + HEADROOM;
      loop.wake();
    },
    camera(name) { az.t = CAMERAS[name].az; elev.t = CAMERAS[name].k; loop.wake(); },
    /** What the tiles show: `cells[i + NX * j] = { h: 0…1, key, lid, side }`. */
    tiles(cells) {
      for (const t of tiles) {
        const c = cells[t.i + NX * t.j];
        t.base = FLOOR + c.h * (HMAX - FLOOR);
        if (c.key !== t.key) { t.key = c.key; t.lid.style.fill = c.lid; t.side.style.fill = c.side; }
      }
      loop.wake();
    },
    /** Replaces what is drawn on the pitch: { mount(g, ctx), draw(ctx), tick?(dt, ctx) → still moving }. */
    scene(next) {
      sceneGroup.replaceChildren();
      scene = next;
      next?.mount?.(sceneGroup, ctx);
      overlays = true; loop.wake();
    },
    wake() { overlays = true; loop.wake(); },
    celebrate(end) {
      const now = performance.now(), o = goals[end];
      o.up = true; tset(o.bil, BILLOW, now, 0);
      o.frame.classList.add("hi");
      setTimeout(() => o.frame.classList.remove("hi"), 1500);
      for (const t of tiles) { t.up = true; tset(t.rip, 1, now, (end ? NX - 1 - t.i : t.i) * 34); }
      loop.wake();
    },
    reducedMotion,
  };
}
