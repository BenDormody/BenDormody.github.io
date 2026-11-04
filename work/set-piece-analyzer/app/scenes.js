/* What is drawn on the pitch at a corner. */

const { clamp, lerp, mk, open, poly, r2 } = window.HairlineCore;

const disc = (q, r) => `M${r2(q[0] - r)} ${r2(q[1])}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const label = (g, cls) => mk("text", { class: cls }, g);
const put = (el, q, text) => {
  el.setAttribute("x", r2(q[0])); el.setAttribute("y", r2(q[1]));
  if (text !== undefined) el.textContent = text;
};

export const roleClass = (role) => "role-" + role.toLowerCase().replace(/[^a-z]+/g, "-");

/** Draws two scenes as one, the first underneath. */
export function together(...scenes) {
  const list = scenes.filter(Boolean);
  return {
    mount(g, ctx) { for (const s of list) s.mount?.(mk("g", {}, g), ctx); },
    draw(ctx) { for (const s of list) s.draw?.(ctx); },
    tick(dt, ctx) { let more = false; for (const s of list) if (s.tick?.(dt, ctx)) more = true; return more; },
  };
}

/** The Impect corner zones from the Middlesbrough work, for a corner coming from y = 0. */
export const ZONES = [
  { id: 1, rects: [[114, 120, 43.33, 50]] }, { id: 2, rects: [[114, 120, 36.67, 43.33]] }, { id: 3, rects: [[114, 120, 30, 36.67]] },
  { id: 4, rects: [[108, 114, 43.33, 50]] }, { id: 5, rects: [[108, 114, 36.67, 43.33]] }, { id: 6, rects: [[108, 114, 30, 36.67]] },
  { id: 7, rects: [[102, 108, 30, 50]] }, { id: 8, rects: [[102, 120, 18, 30]] }, { id: 9, rects: [[102, 120, 50, 62]] },
  { id: 10, rects: [[102, 120, 0, 18]] }, { id: 11, rects: [[90, 102, 0, 80], [102, 120, 62, 80]] },
];

/** The grid around a thrower: back, level or forward, by close, middle or far from the touchline. */
export function throwZones(spot) {
  const along = [[Math.max(0, spot - 22), spot - 5], [spot - 5, spot + 5], [spot + 5, Math.min(120, spot + 22)]];
  const depth = [[0, 12], [12, 25], [25, 45]], out = [];
  depth.forEach(([y0, y1], d) => along.forEach(([x0, x1], a) => out.push({ id: 21 + a + 3 * d, rects: [[x0, x1, y0, y1]] })));
  return out;
}

/** A heat overlay on delivery zones. `cells[id]` is { value, text, faint }. */
export function zonesScene({ cells, tone, zones = ZONES }) {
  const list = [];
  const top = Math.max(0.0001, ...Object.values(cells).map((c) => (c.faint ? 0 : c.value)));
  return {
    mount(g) {
      for (const zone of zones) {
        const c = cells[zone.id] || { value: 0, text: "", empty: true };
        const share = c.empty ? 0 : c.faint ? 8 : Math.round(12 + 68 * (c.value / top));
        list.push({
          zone,
          fills: zone.rects.map(() => {
            const el = mk("path", { class: "pv-zone" }, g);
            el.style.fill = `color-mix(in srgb, var(${tone}) ${share}%, transparent)`;
            return el;
          }),
          text: label(g, "pv-zone-label" + (c.faint ? " faint" : "")),
          value: c.text,
        });
      }
    },
    draw({ P }) {
      for (const { zone, fills, text, value } of list) {
        zone.rects.forEach(([x0, x1, y0, y1], k) => fills[k].setAttribute("d", poly([P(x0, y0, 0.7), P(x1, y0, 0.7), P(x1, y1, 0.7), P(x0, y1, 0.7)])));
        const [x0, x1, y0, y1] = zone.rects[0];
        const q = P((x0 + x1) / 2, (y0 + y1) / 2, 0.7);
        put(text, [q[0], q[1] + 5], value);
      }
    },
  };
}

/** The zoomed-out view: each third's key stats, written on the pitch. */
export function thirdsScene({ columns }) {
  const parts = [];
  let lines;
  return {
    mount(g) {
      lines = mk("path", { class: "pv-third-line" }, g);
      for (const c of columns) {
        parts.push({
          c,
          name: label(g, "pv-third-name"),
          total: label(g, "pv-third-total"),
          noun: label(g, "pv-third-noun"),
          rows: c.rows.map(() => [label(g, "pv-third-label"), label(g, "pv-third-value")]),
        });
      }
    },
    draw({ P }) {
      lines.setAttribute("d", [40, 80].map((x) => open([P(x, 0, 1), P(x, 80, 1)])).join(""));
      for (const { c, name, total, noun, rows } of parts) {
        const q = P(c.x, 36, 1);
        put(name, [q[0], q[1] - 92], c.name);
        put(total, [q[0], q[1] - 44], c.total);
        put(noun, [q[0], q[1] - 22], c.noun);
        rows.forEach(([a, b], k) => {
          const y = q[1] + 10 + k * 25;
          put(a, [q[0] - 76, y], c.rows[k][0]);
          put(b, [q[0] + 76, y], c.rows[k][1]);
        });
      }
    },
  };
}

const diamond = (q, r) => {
  const s = r * 1.25;
  return `M${r2(q[0])} ${r2(q[1] - s)}L${r2(q[0] + s)} ${r2(q[1])}L${r2(q[0])} ${r2(q[1] + s)}L${r2(q[0] - s)} ${r2(q[1])}Z`;
};

function tokenLayer(g) {
  const paths = new Map();
  const stems = mk("path", { class: "pv-stem" }, g);
  return {
    paint(tokens, P, top) {
      const out = new Map();
      let s = "";
      for (const t of tokens) {
        const z = top(t.x, t.y), foot = P(t.x, t.y, z), head = P(t.x, t.y, z + 2.2);
        s += open([foot, head]);
        const shape = t.cls.startsWith("against") ? diamond : disc;
        out.set(t.cls, (out.get(t.cls) || "") + shape(head, t.r));
      }
      stems.setAttribute("d", s);
      for (const [key, d] of out) {
        if (!paths.has(key)) paths.set(key, mk("path", { class: "pv-token " + key }, g));
        paths.get(key).setAttribute("d", d);
      }
      for (const [key, el] of paths) if (!out.has(key)) el.setAttribute("d", "");
    },
  };
}

/** A team's average set-up: one token for each slot filled at most corners. */
export function setupScene({ slots, keeper, origin, note }) {
  let layer, flag;
  const tokens = slots.filter((s) => s[2] >= 0.4).map((s) => ({ x: s[0], y: s[1], cls: roleClass(s[3]), r: 6 + 3 * s[2] }));
  if (keeper) tokens.push({ x: keeper[0], y: keeper[1], cls: "role-keeper", r: 8 });
  if (origin) tokens.push({ x: origin[0], y: origin[1], cls: "role-taker", r: 7 });
  return {
    mount(g) { layer = tokenLayer(g); flag = label(g, "pv-name small"); },
    draw({ P, top }) {
      layer.paint(tokens, P, top);
      const at = origin || [116, 9];
      const q = P(at[0], at[1], 1);
      put(flag, origin ? [q[0], q[1] + 22] : q, note);
    },
  };
}

/** One corner, played through its 360 frames. Dashed tokens are out of shot, at an estimated spot. */
export function cornerScene({ play, stage, focus, goal, speed = 0.6 }) {
  const end = play.t[play.t.length - 1];
  let time = stage.reducedMotion() ? end : 0, done = false, layer, ball, shadow;
  const names = [];

  const at = (track, t) => {
    const p = track.p, f = (frame) => play.t[frame];
    if (t < f(p[0][0]) - 0.05 || t > f(p[p.length - 1][0]) + 0.05) return null;
    for (let k = 0; k < p.length - 1; k++) {
      const a = p[k], b = p[k + 1];
      if (t <= f(b[0])) {
        const u = clamp((t - f(a[0])) / Math.max(0.01, f(b[0]) - f(a[0])), 0, 1);
        return { x: lerp(a[1], b[1], u), y: lerp(a[2], b[2], u), est: a.length > 3 || b.length > 3 };
      }
    }
    const last = p[p.length - 1];
    return { x: last[1], y: last[2], est: last.length > 3 };
  };

  return {
    mount(g) {
      layer = tokenLayer(g);
      shadow = mk("ellipse", { class: "pv-shadow", rx: 5, ry: 2.5 }, g);
      ball = mk("circle", { class: "pv-ball", r: 5 }, g);
      /* only the team you picked is named, so labels don't pile up around the ball */
      for (const track of play.tracks) if (track.n && track.a) names.push({ track, el: label(g, "pv-name" + (track.n === focus ? " focus" : "")) });
    },
    tick(dt) {
      if (done) return false;
      if (time < end) { time = Math.min(end, time + dt * speed); return true; }
      done = true;
      if (goal) stage.celebrate(1);
      return false;
    },
    draw({ P, top }) {
      const tokens = [];
      for (const track of play.tracks) {
        const q = at(track, time);
        if (!q) continue;
        /* the team you picked are circles coloured by role; the opposition, keeper included, are grey diamonds */
        const base = !track.a ? "against" : track.k ? "role-keeper" : track.r ? roleClass(track.r) : "role-unknown";
        tokens.push({ x: q.x, y: q.y, cls: base + (q.est ? " est" : "") + (track.n === focus ? " focus" : ""), r: track.n === focus ? 9 : 7 });
      }
      layer.paint(tokens, P, top);
      for (const { track, el } of names) {
        const q = at(track, time);
        if (!q) { el.textContent = ""; continue; }
        const head = P(q.x, q.y, top(q.x, q.y) + 2.2);
        put(el, [head[0], head[1] - 12], track.n);
      }
      let k = 0;
      while (k < play.t.length - 2 && time > play.t[k + 1]) k++;
      const u = clamp((time - play.t[k]) / Math.max(0.01, play.t[k + 1] - play.t[k]), 0, 1);
      const [ax, ay] = play.ball[k], [bx, by] = play.ball[k + 1];
      const x = lerp(ax, bx, u), y = lerp(ay, by, u), z = top(x, y), lift = (k === 0 ? 10 : 1.5) * 4 * u * (1 - u);
      const q = P(x, y, z + lift + 1), b = P(x, y, z);
      ball.setAttribute("cx", r2(q[0])); ball.setAttribute("cy", r2(q[1]));
      shadow.setAttribute("cx", r2(b[0])); shadow.setAttribute("cy", r2(b[1]));
    },
  };
}

/** A player's named contacts: where each run began and where it met the ball. */
export function runsScene({ runs }) {
  let solid, dashed, heads, shots, goals;
  return {
    mount(g) {
      dashed = mk("path", { class: "pv-run dashed" }, g);
      solid = mk("path", { class: "pv-run" }, g);
      heads = mk("path", { class: "pv-run-start" }, g);
      shots = mk("path", { class: "pv-contact" }, g);
      goals = mk("path", { class: "pv-contact goal" }, g);
    },
    draw({ P, top }) {
      let a = "", b = "", h = "", s = "", g = "";
      for (const r of runs) {
        const end = P(r.x, r.y, top(r.x, r.y) + 0.5);
        if (r.sx !== undefined) {
          const pts = [];
          for (let k = 0; k <= 10; k++) {
            const x = lerp(r.sx, r.x, k / 10), y = lerp(r.sy, r.y, k / 10);
            pts.push(P(x, y, top(x, y) + 0.5));
          }
          if (r.est) b += open(pts); else a += open(pts);
          h += disc(pts[0], 3);
        }
        if (r.goal) g += disc(end, 8); else s += disc(end, r.shot ? 7 : 5.5);
      }
      solid.setAttribute("d", a); dashed.setAttribute("d", b); heads.setAttribute("d", h);
      shots.setAttribute("d", s); goals.setAttribute("d", g);
    },
  };
}
