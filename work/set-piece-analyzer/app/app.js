/* The page: a team's set plays, an optional heat overlay, and one player's contact runs.
   Throw-ins open zoomed out on all three thirds; clicking one opens that third's set-up. */

import { createStage } from "./stage.js";
import { cornerScene, roleClass, runsScene, setupScene, thirdsScene, throwZones, together, zonesScene } from "./scenes.js";
import { MIN_AVERAGE, THIRDS, playerView, players, roleRows, thirdRows, zoneCells } from "./insights.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const FOCUS = { corner: [90, 122, { y0: 6, y1: 74, low: true }], freekick: [76, 122, { low: true }] };
const THROW_FOCUS = [[0, 46], [34, 86], [74, 122]];
const THROW_SPOTS = [20, 60, 100]; /* the build slides each third's shapes to these spots */
const CENTRES = [20, 60, 100];
const TONE = { delivery: "--c-pitch", xg: "--c-amber", first: "--c-signal" };

/* `third` is a column as the team sees it: 0 their defending third, 2 their attacking third */
const state = { kind: "corner", side: "att", overlay: "standard", third: null, player: "", corner: null };
let data = null, flat = false, cameraShown = "", hovered = null, playable = [];
const cache = new Map();

const stage = createStage($("pv-stage"), {
  onCamera() { document.querySelectorAll("[data-camera]").forEach((b) => b.setAttribute("aria-pressed", "false")); },
  onClick(w) { if (overview() && w) openThird(columnAt(w[0])); },
  onPoint(w) {
    if (!overview()) return;
    const next = w ? columnAt(w[0]) : null;
    if (next !== hovered) { hovered = next; paintThirds(); }
  },
});

const BLANK = { h: 0, key: "0", lid: "var(--pv-lid)", side: "var(--pv-side)" };
const FLAT = new Array(18 * 12).fill(BLANK);
const overview = () => state.kind === "throw" && state.third === null;
const columnAt = (x) => (x < 40 ? 0 : x < 80 ? 1 : 2);
/* a defending team's columns read from their own goal, so the taking team's third is reversed */
const takerThird = (column) => (state.side === "att" ? column : 2 - column);
const throwRows = (column) => data.sets.throw[state.side].filter((r) => r.third === takerThird(column));

function paintThirds() {
  const lit = { h: 0, key: "lit", lid: "color-mix(in srgb, var(--c-pitch) 18%, var(--pv-lid))", side: "var(--pv-side)" };
  const cells = [];
  for (let i = 0; i < 18; i++) for (let j = 0; j < 12; j++) cells[i + 18 * j] = Math.floor(i / 6) === hovered ? lit : BLANK;
  stage.tiles(cells);
}

const rowsOf = (items, dot) => items.map(([label, n]) => `
  <div class="pv-role">${dot ? `<i class="dot ${roleClass(label)}"></i>` : ""}<span>${esc(label)}</span><em>${Number.isInteger(n) ? n : n.toFixed(1)}</em></div>`).join("");
const block = (title, body) => (body ? `<section class="pv-block"><h3>${esc(title)}</h3>${body}</section>` : "");

function overlayScene(rows) {
  if (state.overlay === "standard") return null;
  const zones = state.kind === "throw" ? throwZones(THROW_SPOTS[takerThird(state.third)]) : undefined;
  return zonesScene({ cells: zoneCells(rows, state.overlay), tone: TONE[state.overlay], zones });
}

/** The set pieces to play, by match. One control however many a team has. */
function chooser(rows, list, blank) {
  const select = $("pv-corners");
  select.replaceChildren(new Option(blank, ""));
  const sorted = list.slice().sort((a, b) => a.m - b.m || a.min - b.min);
  playable = sorted.map((r) => rows.indexOf(r));
  let group = null, match = null;
  for (const r of sorted) {
    if (r.m !== match) {
      match = r.m;
      group = document.createElement("optgroup");
      group.label = `v ${data.matches[r.m].opp}`;
      select.appendChild(group);
    }
    const mark = r.out === 2 ? " · Goal" : r.out === 1 ? " · Shot" : "";
    group.appendChild(new Option(`${r.min}'${mark}`, rows.indexOf(r)));
  }
  select.value = state.corner === null ? "" : String(state.corner);
  $("pv-play").hidden = !list.length;
}

function step(by) {
  if (!playable.length) return;
  const at = playable.indexOf(state.corner), n = playable.length;
  state.corner = playable[at < 0 ? (by > 0 ? 0 : n - 1) : (at + by + n) % n];
  render();
}

function playback(chosen) {
  const play = state.side === "att" ? chosen.play : { ...chosen.play, tracks: chosen.play.tracks.map((t) => ({ ...t, a: t.a ? 0 : 1 })) };
  return cornerScene({ play, stage, focus: state.player, goal: chosen.out === 2 });
}

const mean = (rows, key) => rows.reduce((v, r) => v + r[key], 0) / Math.max(rows.length, 1);

function showTeam(set, rows) {
  const enough = set.framed[state.side] >= MIN_AVERAGE, throwIn = state.kind === "throw", corner = state.kind === "corner";
  const heading = throwIn ? `<p class="pv-player">${esc(THIRDS[state.third])}<small>${rows.length} throws</small></p>` : "";
  $("pv-detail").innerHTML = heading + (enough ? block(`${data.team} roles (guessed)`, rowsOf(roleRows(set, state.side), true)) : `<p class="pv-few">Too few to average</p>`);
  chooser(rows, rows.filter((r) => r.play && r.play.t.length >= 3), enough ? "Average set-up" : "Choose one to play");
  return enough ? setupScene({
    slots: set.slots[state.side], keeper: state.side === "def" ? set.keeper : null,
    origin: corner ? null : [throwIn ? THROW_SPOTS[takerThird(state.third)] : mean(rows, "ox"), mean(rows, "oy")],
    note: corner ? "Taken from this side" : throwIn ? "Thrower" : "Average taker location",
  }) : null;
}

function feet(cm) {
  const inches = Math.round(cm / 2.54);
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

function showPlayer(rows) {
  const view = playerView(data, rows, state.player);
  $("pv-detail").innerHTML = `<p class="pv-player">${esc(view.name)}${view.cm ? `<small>${view.cm} cm · ${feet(view.cm)}</small>` : ""}</p>`
    + block("Contacts", rowsOf(view.tallies))
    + block("Starting role", rowsOf(view.roles, true));
  chooser(rows, view.runs.map((r) => r.row).filter((r, k, all) => r.play && all.indexOf(r) === k), "All runs");
  return runsScene({ runs: view.runs });
}

function currentRows() {
  return state.kind === "throw" ? (state.third === null ? [] : throwRows(state.third)) : data.sets[state.kind][state.side];
}

function fillPlayers() {
  const select = $("pv-player");
  select.replaceChildren(new Option("Whole team", ""));
  for (const [name, n] of players(currentRows())) select.add(new Option(`${name} (${n})`, name));
  select.value = state.player;
  if (select.value !== state.player) { state.player = ""; select.value = ""; }
}

function aimCamera() {
  const name = overview() ? (flat ? "flat" : "angled") : flat ? "goalFlat" : "corner";
  if (name !== cameraShown) { cameraShown = name; stage.camera(name); }
}

function drawOverview() {
  $("pv-detail").innerHTML = `<div class="pv-thirds">${THIRDS.map((name, c) => `<button type="button" data-third="${c}"><span>${esc(name)}</span><em>${throwRows(c).length}</em><small>${thirdRows(throwRows(c), state.side).map(([k, v]) => `${esc(k)} ${v}`).join(" · ")}</small></button>`).join("")}</div>`;
  document.querySelectorAll("[data-third]").forEach((b) => b.addEventListener("click", () => openThird(Number(b.dataset.third))));
  stage.focus(0, 120, { low: true });
  stage.scene(thirdsScene({
    columns: THIRDS.map((name, c) => {
      const rows = throwRows(c);
      return { x: CENTRES[c], name, total: String(rows.length), noun: state.side === "att" ? "throws" : "throws faced", rows: thirdRows(rows, state.side) };
    }),
  }));
}

function openThird(column) {
  state.third = column; state.corner = null; state.player = ""; hovered = null;
  stage.tiles(FLAT);
  fillPlayers(); render();
}

function render() {
  document.querySelectorAll("[data-side]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.side === state.side)));
  document.querySelectorAll("[data-kind]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.kind === state.kind)));
  const throwIn = state.kind === "throw", wide = overview();

  /* throw-ins rarely lead to a shot, so they have no xG option */
  $("pv-xg-option").hidden = throwIn;
  if (throwIn && state.overlay === "xg") {
    state.overlay = "standard";
    document.querySelector('input[value="standard"]').checked = true;
  }

  document.querySelector(".pv-overlay").hidden = wide;
  document.querySelector(".pv-grid").classList.toggle("overview", wide);
  $("pv-player").closest("label").hidden = wide;
  $("pv-all-thirds").hidden = !throwIn || wide;
  $("pv-stage").querySelector("svg").classList.toggle("clickable", wide);
  aimCamera();

  if (wide) {
    $("pv-play").hidden = true; $("pv-who").hidden = true;
    return drawOverview();
  }
  const rows = currentRows();
  if (throwIn) {
    const [a, b] = THROW_FOCUS[takerThird(state.third)];
    stage.focus(a, b, { y0: 0, y1: 50, low: true });
  } else stage.focus(...FOCUS[state.kind]);
  const set = throwIn ? data.sets.throw.thirds[takerThird(state.third)] : data.sets[state.kind];
  const base = state.player ? showPlayer(rows) : showTeam(set, rows);
  const chosen = state.corner === null ? null : rows[state.corner];
  $("pv-replay").hidden = !chosen;
  $("pv-who").hidden = !chosen;
  if (chosen) {
    $("pv-who-own").textContent = data.team;
    $("pv-who-opp").textContent = data.matches[chosen.m].opp;
  }
  stage.scene(chosen?.play ? playback(chosen) : together(overlayScene(rows), base));
}

async function loadTeam(entry) {
  if (!cache.has(entry.slug)) cache.set(entry.slug, await (await fetch(`data/${entry.slug}.json`)).json());
  data = cache.get(entry.slug);
  state.player = ""; state.corner = null;
  fillPlayers();
  try { history.replaceState(null, "", `#${entry.slug}`); } catch (e) {}
  render();
}

document.querySelectorAll("[data-camera]").forEach((b) => b.addEventListener("click", () => {
  flat = b.dataset.camera === "flat";
  cameraShown = "";
  aimCamera();
  document.querySelectorAll("[data-camera]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
}));
document.querySelectorAll("[data-side]").forEach((b) => b.addEventListener("click", () => { state.side = b.dataset.side; state.corner = null; fillPlayers(); render(); }));
document.querySelectorAll("[data-kind]").forEach((b) => b.addEventListener("click", () => {
  state.kind = b.dataset.kind; state.corner = null; state.player = ""; state.third = null; hovered = null;
  stage.tiles(FLAT); fillPlayers(); render();
}));
document.querySelectorAll('input[name="pv-overlay"]').forEach((r) => r.addEventListener("change", () => { state.overlay = r.value; state.corner = null; render(); }));
$("pv-player").addEventListener("change", (e) => { state.player = e.target.value; state.corner = null; render(); });
$("pv-corners").addEventListener("change", (e) => { state.corner = e.target.value === "" ? null : Number(e.target.value); render(); });
$("pv-prev").addEventListener("click", () => step(-1));
$("pv-next").addEventListener("click", () => step(1));
$("pv-replay").addEventListener("click", render);
$("pv-all-thirds").addEventListener("click", () => { state.third = null; state.corner = null; state.player = ""; fillPlayers(); render(); });

(async function start() {
  const { teams } = await (await fetch("data/tournament.json")).json();
  const select = $("pv-team");
  for (const t of teams) select.add(new Option(t.team, t.slug));
  const wanted = location.hash.slice(1), first = teams.find((t) => t.slug === wanted) || teams.find((t) => t.team === "England");
  select.value = first.slug;
  select.addEventListener("change", () => loadTeam(teams.find((t) => t.slug === select.value)));
  stage.tiles(FLAT);
  await loadTeam(first);
})();
