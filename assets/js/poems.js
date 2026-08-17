/* ============================================================
   poems.js — renders poems from poems-data.js.

   [data-poems-list]     full collection page: filter chips + poems
   [data-poem-previews]  writing index: featured + recent preview cards
   ============================================================ */

(function () {
  if (typeof POEMS_DATA === "undefined") return;
  const ROOT = document.body.dataset.root || "";

  const byDateDesc = (a, b) => b.dateCreated.localeCompare(a.dateCreated);

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
    })[c]);
  }

  function fmtDate(iso) {
    const [y, m] = iso.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[parseInt(m, 10) - 1] + " " + y;
  }

  /* ---- full list with collection filters ---- */
  const listMount = document.querySelector("[data-poems-list]");
  if (listMount) {
    const poems = [...POEMS_DATA.poems].sort(byDateDesc);
    const collections = POEMS_DATA.collections.map((c) => c.name);
    const hasUncollected = poems.some((p) => !p.collection);

    const chips = ["All", ...collections, ...(hasUncollected ? ["Uncollected"] : [])];
    const bar = document.createElement("div");
    bar.className = "filters";
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Filter poems by collection");
    bar.innerHTML = chips
      .map(
        (c, i) =>
          `<button class="filter-btn" type="button" data-collection="${esc(c)}" aria-pressed="${i === 0}">${esc(c)}</button>`
      )
      .join("");

    const wrap = document.createElement("div");
    wrap.innerHTML = poems
      .map(
        (p) => `
      <article class="poem verse-settle is-visible" data-collection="${esc(p.collection || "Uncollected")}">
        <h2 class="poem__title">${esc(p.title)}</h2>
        <div class="poem__body">${esc(p.content.join("\n\n"))}</div>
        <p class="poem__date">${esc(p.collection || "uncollected")} · ${fmtDate(p.dateCreated)}${
          p.tags.length ? " · " + p.tags.map(esc).join(" · ") : ""
        }</p>
      </article>`
      )
      .join("");

    listMount.appendChild(bar);
    listMount.appendChild(wrap);

    bar.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-btn");
      if (!btn) return;
      bar.querySelectorAll(".filter-btn").forEach((b) =>
        b.setAttribute("aria-pressed", b === btn ? "true" : "false")
      );
      const sel = btn.dataset.collection;
      wrap.querySelectorAll(".poem").forEach((el) => {
        el.style.display = sel === "All" || el.dataset.collection === sel ? "" : "none";
      });
    });
  }

  /* ---- previews on the writing index ---- */
  const prevMount = document.querySelector("[data-poem-previews]");
  if (prevMount) {
    const sorted = [...POEMS_DATA.poems].sort(byDateDesc);
    const featured = sorted.filter((p) => p.featured);
    const rest = sorted.filter((p) => !p.featured);
    const picks = [...featured, ...rest].slice(0, 3);

    prevMount.innerHTML = picks
      .map((p) => {
        const lines = p.content.join("\n").split("\n").filter((l) => l.trim());
        const excerpt = lines.slice(0, 4).join("\n") + (lines.length > 4 ? "\n…" : "");
        return `
        <article class="card card--amber">
          <div class="card__meta">
            <span class="card__category">${esc(p.collection || "Poem")}</span>
            <span class="mono" style="font-size: var(--text-xs); color: var(--ink-faint);">${fmtDate(p.dateCreated)}</span>
          </div>
          <h3 class="card__title"><a href="${ROOT}writing/poems/">${esc(p.title)}</a></h3>
          <p class="card__overview" style="font-family: var(--font-serif); white-space: pre-line; line-height: 1.8;">${esc(excerpt)}</p>
          <div class="card__footer">
            <span class="card__outcome">${p.tags.length ? esc(p.tags[0]) : "poem"}</span>
            <span class="card__links"><a href="${ROOT}writing/poems/">Read</a></span>
          </div>
        </article>`;
      })
      .join("");
  }
})();
