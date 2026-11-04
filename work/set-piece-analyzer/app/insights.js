/* The labels each view shows. */

const pct = (v) => `${Math.round(v * 100)}%`;

/** Below this many frames an average isn't a set-up, so the page offers the moments instead. */
export const MIN_AVERAGE = 5;

export const THIRDS = ["Defending third", "Middle third", "Attacking third"];

/** A third's stats, in the rows the Impect set piece site plots. */
export function thirdRows(rows, side) {
  const n = Math.max(rows.length, 1), share = (f) => pct(rows.filter(f).length / n);
  const contact = rows.filter((r) => r.first === 1);
  const first = pct(contact.length / n);
  return side === "att"
    ? [["Retained Poss.", share((r) => r.kept)], ["1st Contact", first], ["Progressed", share((r) => r.prog)], ["Thrown Fwd", share((r) => r.dir === 0)]]
    : [["Regained Poss.", share((r) => !r.kept)], ["1st Contact", first], ["Not Progressed", share((r) => !r.prog)]];
}

export const roleRows = (set, side) => Object.entries(set.roles[side]).filter(([, v]) => v >= 0.3).sort((a, b) => b[1] - a[1]);

/** The zone values for an overlay: the share of deliveries, xG per delivery, or first contacts won. */
export function zoneCells(rows, mode) {
  const cells = {}, n = Math.max(rows.length, 1);
  for (const r of rows) {
    const c = cells[r.zone] || (cells[r.zone] = { n: 0, xg: 0, won: 0, asked: 0 });
    c.n++; c.xg += r.xg;
    if (r.first !== null && r.first !== undefined) { c.asked++; c.won += r.first; }
  }
  for (const c of Object.values(cells)) {
    c.value = mode === "delivery" ? c.n / n : mode === "first" ? c.won / Math.max(c.asked, 1) : c.xg / c.n;
    c.text = mode === "xg" ? c.value.toFixed(2).replace(/^0/, "") : pct(c.value);
    c.faint = mode !== "delivery" && (mode === "first" ? c.asked : c.n) < 3;
  }
  /* short corners have no first contact, so a zone of only those stays blank */
  if (mode === "first") for (const id in cells) if (!cells[id].asked) delete cells[id];
  return cells;
}

export function players(rows) {
  const tally = new Map();
  for (const row of rows) for (const c of row.contacts) tally.set(c.pl, (tally.get(c.pl) || 0) + 1);
  return [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function playerView(data, rows, name) {
  const runs = [];
  rows.forEach((row, index) => { for (const c of row.contacts) if (c.pl === name) runs.push({ ...c, index, row }); });
  const roles = new Map();
  for (const r of runs) if (r.role) roles.set(r.role, (roles.get(r.role) || 0) + 1);
  return {
    runs, name, cm: data.players[name]?.cm,
    tallies: [["First contacts", runs.filter((r) => r.first).length], ["Shots", runs.filter((r) => r.shot).length], ["Goals", runs.filter((r) => r.goal).length]].filter(([, n]) => n),
    roles: [...roles.entries()].sort((a, b) => b[1] - a[1]),
  };
}
