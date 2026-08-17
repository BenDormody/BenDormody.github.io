/* ============================================================
   main.js — theme toggle, scroll reveals, ticking numbers,
   lazy PDF embed toggle.
   (Initial theme is applied by an inline <head> script.)
   ============================================================ */

(function () {
  /* ---- theme toggle ---- */
  const toggle = document.querySelector(".theme-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const next =
        document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem("theme", next);
      } catch (e) {}
    });
  }

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- scroll reveals (.reveal, .verse-settle, .setpiece) ---- */
  const revealables = document.querySelectorAll(".reveal, .verse-settle, .setpiece");
  if (reduced || !("IntersectionObserver" in window)) {
    revealables.forEach((el) => el.classList.add("is-visible"));
  } else if (revealables.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealables.forEach((el) => io.observe(el));
  }

  /* ---- ticking numbers: <span data-count="37759">0</span> ---- */
  const counters = document.querySelectorAll("[data-count]");
  const fmt = (n) => n.toLocaleString("en-US");

  function tick(el) {
    const target = parseInt(el.dataset.count, 10);
    const dur = 1400;
    const t0 = performance.now();
    function frame(t) {
      const p = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  if (counters.length) {
    if (reduced || !("IntersectionObserver" in window)) {
      counters.forEach((el) => (el.textContent = fmt(parseInt(el.dataset.count, 10))));
    } else {
      const cio = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              tick(entry.target);
              cio.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.6 }
      );
      counters.forEach((el) => cio.observe(el));
    }
  }

  /* ---- lazy PDF embed: button[data-embed-toggle] + iframe[data-src] ---- */
  const embedBtn = document.querySelector("[data-embed-toggle]");
  if (embedBtn) {
    const wrap = document.querySelector(".pdf-embed");
    const iframe = wrap && wrap.querySelector("iframe[data-src]");
    embedBtn.addEventListener("click", () => {
      const open = wrap.hidden;
      if (open && iframe && !iframe.src) iframe.src = iframe.dataset.src;
      wrap.hidden = !open;
      embedBtn.setAttribute("aria-expanded", String(open));
      embedBtn.textContent = open ? "Hide preview" : "Preview inline";
    });
  }
})();
