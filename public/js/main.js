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

  function setAdminNavLinkVisible(isVisible) {
    const navbar = document.querySelector(".cg-navbar");
    if (!navbar) return;

    let adminLi = navbar.querySelector(".nav-admin-link-item");
    if (!adminLi) {
      adminLi = document.createElement("li");
      adminLi.className = "nav-item nav-admin-link-item";
      adminLi.hidden = true;
      const adminLink = document.createElement("a");
      adminLink.className = "nav-link";
      adminLink.href = "admin.html";
      adminLink.textContent = "Admin";
      adminLi.appendChild(adminLink);
      const loginItem = navbar.querySelector(".nav-item:last-child");
      if (loginItem) {
        loginItem.after(adminLi);
      } else {
        navbar.querySelector(".navbar-nav").appendChild(adminLi);
      }
    }

    adminLi.hidden = !isVisible;
  }

  async function refreshAuthUI() {
    let user = null;
    try {
      const raw = localStorage.getItem("cg_user");
      if (raw) user = JSON.parse(raw);
    } catch (err) {
      /* corrupted/unavailable storage — treat as logged out */
    }

    const token = localStorage.getItem("cg_token");
    if (!token) {
      setAdminNavLinkVisible(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/me", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && data.user) {
        localStorage.setItem("cg_user", JSON.stringify(data.user));
        user = data.user;
      } else {
        localStorage.removeItem("cg_token");
        localStorage.removeItem("cg_user");
        setAdminNavLinkVisible(false);
        user = null;
      }
    } catch (err) {
      /* leave the current local session intact for the page load */
    }

    if (!user) return;

    const navCta = document.querySelector(".cg-navbar .nav-cta");
    if (!navCta) return;
    const listItem = navCta.closest("li");
    if (!listItem || listItem.dataset.authRendered) return;
    listItem.dataset.authRendered = "true";

    const displayName = user.name || user.email || "there";

    const nameSpan = document.createElement("span");
    nameSpan.className = "nav-link nav-user";
    if (user.email) nameSpan.title = user.email;
    nameSpan.textContent = `Hi, ${displayName}`;
    listItem.innerHTML = "";
    listItem.appendChild(nameSpan);

    const logoutLi = document.createElement("li");
    logoutLi.className = "nav-item";
    const logoutBtn = document.createElement("button");
    logoutBtn.type = "button";
    logoutBtn.className = "nav-link nav-cta nav-logout-btn";
    logoutBtn.textContent = "Log out";
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("cg_token");
      localStorage.removeItem("cg_user");
      window.location.href = "index.html";
    });
    logoutLi.appendChild(logoutBtn);
    listItem.after(logoutLi);

    setAdminNavLinkVisible(user.role === "admin");
  }

  if (document.body.classList.contains("admin-body")) {
    const adminToken = localStorage.getItem("cg_token");
    if (!adminToken) {
      window.location.href = "index.html";
    } else {
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
        .then((res) => res.json().catch(() => ({})))
        .then((data) => {
          if (!data.ok || data.user?.role !== "admin") {
            window.location.href = "index.html";
          }
        })
        .catch(() => {
          window.location.href = "index.html";
        });
    }
  }

  refreshAuthUI();

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
