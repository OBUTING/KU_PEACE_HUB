// Shared behaviour used across every page: scroll reveals, active nav link,
// a tiny toast helper, and the footer year stamp.

(function () {
  "use strict";

  // ---- Reveal-on-scroll ----
  const revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => observer.observe(el));
  }

  // ---- Active nav link (matches current file name) ----
  const here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll(".cg-navbar .nav-link[href]").forEach((link) => {
    const target = link.getAttribute("href").split("#")[0].toLowerCase();
    if (target && target === here) link.classList.add("active");
  });

  // ---- Footer year ----
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  // ---- Toast helper, available globally as window.cgToast ----
  window.cgToast = function cgToast(message, { error = false, duration = 3200 } = {}) {
    let toast = document.querySelector(".cg-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "cg-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.toggle("is-error", error);
    toast.classList.add("is-shown");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove("is-shown"), duration);
  };
})();
