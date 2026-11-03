/* ============================================================
   figures.js — mounts the Hairline line figures (vendor/hairline.min.js).

   <div data-hl="pitch"></div>            any figure name the bundle exports
   data-hl-read="#id"                     write the figure's read-out into #id
   data-hl-rest="text"                    what that read-out says at rest
   data-hl-lap                            walk the figure's tour once on load
   data-hl-intensity="0.6"                0…1, how strongly it answers
   data-hl-input="#id"                    a range input that sets the figure's number

   Figures mount only when they come near the viewport, and share
   one frame loop that sleeps whenever nothing is moving.
   Call window.mountFigures(root) after adding figures to the page.
   ============================================================ */

(function () {
  if (!window.Hairline) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const LAP_MS = 9000;

  function mount(el) {
    const make = Hairline[el.dataset.hl];
    if (!make || el.dataset.hlMounted) return;
    el.dataset.hlMounted = "1";

    const out = el.dataset.hlRead && document.querySelector(el.dataset.hlRead);
    const rest = el.dataset.hlRest;
    const input = el.dataset.hlInput && document.querySelector(el.dataset.hlInput);
    const level = input && (() => (input.value - input.min) / (input.max - input.min));
    const options = {
      intensity: input ? level() : el.dataset.hlIntensity ? Number(el.dataset.hlIntensity) : undefined,
      onRead: out ? (text) => { out.textContent = text === "rest" && rest ? rest : text; } : undefined,
    };
    const fig = make(el, options);
    if (input) input.addEventListener("input", () => fig.update({ intensity: level() }));

    // a hero figure shows what it does once, then waits for a hand
    if ("hlLap" in el.dataset && !reduced) {
      fig.update({ play: true });
      setTimeout(() => fig.update({ play: false }), LAP_MS);
    }
  }

  const io = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { io.unobserve(entry.target); mount(entry.target); }
        });
      }, { rootMargin: "200px 0px" })
    : null;

  window.mountFigures = function (root) {
    (root || document).querySelectorAll("[data-hl]:not([data-hl-mounted])").forEach((el) => {
      if (io) io.observe(el); else mount(el);
    });
  };
  window.mountFigures();
})();
