/* ============================================================
   cards.js — renders cards from data.js into any element with
   [data-cards], and wires up the work-page filters.

   <div data-cards="sports-analytics,software"></div>
   <div data-cards="featured"></div>

   Work-page filters (all combine with AND):
   - [data-filters]        category radio: all / sports-analytics / software / ml
   - [data-source-filters] source radio: any / open-source / career
   - [data-skill-filters]  skill chips, multi-select (project must have ALL)

   Internal link prefix comes from <body data-root="../">.
   ============================================================ */

(function () {
  const ROOT = document.body.dataset.root || "";

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
    })[c]);
  }

  const isExternal = (href) => /^https?:/.test(href);
  const liveHref = (p) => (isExternal(p.links.live) ? p.links.live : ROOT + p.links.live);

  function primaryHref(p) {
    if (p.links.live) return liveHref(p);
    if (p.links.page) return ROOT + p.links.page;
    if (p.links.repo) return p.links.repo;
    return null;
  }

  function renderCard(p) {
    const meta = CATEGORY_META[p.category];
    const href = primaryHref(p);
    const external = href && isExternal(href);
    const title = href
      ? `<a href="${href}"${external ? ' target="_blank" rel="noopener"' : ""}>${esc(p.title)}</a>`
      : esc(p.title);

    const links = [];
    if (p.links.page) links.push(`<a href="${ROOT + p.links.page}">Read more</a>`);
    if (p.links.live) {
      const ext = isExternal(p.links.live);
      links.push(
        `<a href="${liveHref(p)}"${ext ? ' target="_blank" rel="noopener"' : ""}>${ext ? "Live site" : "Try it"}</a>`
      );
    }
    if (p.links.repo) links.push(`<a href="${p.links.repo}" target="_blank" rel="noopener">GitHub</a>`);

    const footerRight = links.length
      ? `<span class="card__links">${links.join("")}</span>`
      : `<span class="card__outcome">Proprietary — details on request</span>`;

    return `
      <article class="card card--${meta.tone}" data-category="${p.category}" data-ml="${p.ml ? 1 : 0}"
        data-open="${p.links.repo ? 1 : 0}" data-career="${p.career ? 1 : 0}"
        data-skills="${(p.skills || []).map((s) => esc(s.toLowerCase())).join("|")}">
        <div class="card__meta">
          <span class="card__category">${meta.label}</span>
        </div>
        <h3 class="card__title">${title}</h3>
        <p class="card__overview">${esc(p.overview)}</p>
        <div class="card__chips">${p.tags.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>
        <div class="card__footer">
          <span class="card__outcome">${esc(p.outcome)}</span>
          ${footerRight}
        </div>
      </article>`;
  }

  function selectProjects(spec) {
    if (spec === "featured") {
      return FEATURED_IDS.map((id) => PROJECTS.find((p) => p.id === id)).filter(Boolean);
    }
    const cats = spec.split(",").map((s) => s.trim());
    return PROJECTS.filter((p) => cats.includes(p.category));
  }

  const mounts = document.querySelectorAll("[data-cards]");
  mounts.forEach((mount) => {
    const projects = selectProjects(mount.dataset.cards);
    mount.innerHTML = projects.map(renderCard).join("");
  });

  /* ---- work-page filters ---- */
  const catBar = document.querySelector("[data-filters]");
  if (!catBar) return;

  const grid = document.querySelector("[data-cards]");
  const sourceBar = document.querySelector("[data-source-filters]");
  const skillBar = document.querySelector("[data-skill-filters]");

  const state = { cat: "all", source: "any", skills: new Set() };

  /* build skill chips from the data actually on this page */
  if (skillBar) {
    const skills = [...new Set(
      selectProjects(grid.dataset.cards).flatMap((p) => p.skills || [])
    )].sort((a, b) => a.localeCompare(b));
    skillBar.innerHTML = skills
      .map(
        (s) =>
          `<button class="filter-btn filter-btn--skill" type="button" data-skill="${esc(s.toLowerCase())}" aria-pressed="false">${esc(s)}</button>`
      )
      .join("") +
      `<button class="filter-btn filter-btn--clear" type="button" data-clear-skills hidden>Clear skills ✕</button>`;
  }

  function apply() {
    let shown = 0;
    grid.querySelectorAll(".card").forEach((card) => {
      const catOk =
        state.cat === "all" ||
        (state.cat === "ml" ? card.dataset.ml === "1" : card.dataset.category === state.cat);
      const srcOk =
        state.source === "any" ||
        (state.source === "open-source" ? card.dataset.open === "1" : card.dataset.career === "1");
      const cardSkills = card.dataset.skills ? card.dataset.skills.split("|") : [];
      const skillOk = [...state.skills].every((s) => cardSkills.includes(s));
      const show = catOk && srcOk && skillOk;
      card.style.display = show ? "" : "none";
      if (show) shown++;
    });
    const empty = document.querySelector("[data-empty-note]");
    if (empty) empty.hidden = shown > 0;
    const clear = skillBar && skillBar.querySelector("[data-clear-skills]");
    if (clear) clear.hidden = state.skills.size === 0;
  }

  function radio(bar, attr, onPick) {
    bar.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-btn");
      if (!btn) return;
      bar.querySelectorAll(".filter-btn").forEach((b) =>
        b.setAttribute("aria-pressed", b === btn ? "true" : "false")
      );
      onPick(btn.dataset[attr]);
      apply();
    });
  }

  radio(catBar, "filter", (v) => (state.cat = v));
  if (sourceBar) radio(sourceBar, "source", (v) => (state.source = v));

  if (skillBar) {
    skillBar.addEventListener("click", (e) => {
      const clear = e.target.closest("[data-clear-skills]");
      if (clear) {
        state.skills.clear();
        skillBar.querySelectorAll(".filter-btn--skill").forEach((b) => b.setAttribute("aria-pressed", "false"));
        apply();
        return;
      }
      const btn = e.target.closest(".filter-btn--skill");
      if (!btn) return;
      const s = btn.dataset.skill;
      const on = !state.skills.has(s);
      if (on) state.skills.add(s);
      else state.skills.delete(s);
      btn.setAttribute("aria-pressed", String(on));
      apply();
    });
  }
})();
