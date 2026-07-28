// Messengers of Peace signature map. Talks to /api/signatures on the
// unified backend (see backend/server.js) — no separate server needed.

(function () {
  "use strict";

  const mapContainer = document.getElementById("mapContainer");
  const signForm = document.getElementById("signForm");
  const nameInput = document.getElementById("nameInput");
  const countyInput = document.getElementById("countyInput");
  const ageInput = document.getElementById("ageInput");
  const scoutInput = document.getElementById("scoutInput");
  const signBtn = document.getElementById("signBtn");
  const formError = document.getElementById("formError");
  const signatureCountEl = document.getElementById("signatureCount");
  const signaturesList = document.getElementById("signaturesList");

  // If someone arrives via a link to #tab-game (e.g. from the home page's
  // game promo), switch straight to the Game tab instead of defaulting to Map.
  if (window.location.hash === "#tab-game") {
    const gameTabBtn = document.getElementById("tab-game-btn");
    if (gameTabBtn && window.bootstrap) {
      new window.bootstrap.Tab(gameTabBtn).show();
    }
  }

  // ---- Admin-only "Recent Messengers of Peace" ----
  const ADMIN_KEY_STORAGE = "cg_admin_key";
  let adminKey = localStorage.getItem(ADMIN_KEY_STORAGE) || "";

  function renderLockedRecent() {
    signaturesList.innerHTML =
      '<div class="empty-note">🔒 Visible to the site admin only. ' +
      '<button type="button" id="adminUnlockBtn" class="admin-unlock-link">Unlock</button></div>';
    const btn = document.getElementById("adminUnlockBtn");
    if (btn) btn.addEventListener("click", handleUnlockClick);
  }

  async function verifyAdminKey(key) {
    try {
      const res = await fetch("/api/admin/verify", { headers: { "x-admin-key": key } });
      return res.ok;
    } catch (err) {
      return false;
    }
  }

  async function handleUnlockClick() {
    const entered = prompt("Enter the admin key:");
    if (!entered) return;
    const valid = await verifyAdminKey(entered);
    if (valid) {
      adminKey = entered;
      localStorage.setItem(ADMIN_KEY_STORAGE, entered);
      loadRecentAdminAware();
    } else {
      alert("Incorrect admin key.");
    }
  }

  async function loadRecentAdminAware() {
    if (!adminKey) {
      renderLockedRecent();
      return;
    }
    try {
      const res = await fetch("/api/signatures/recent?limit=8", {
        headers: { "x-admin-key": adminKey },
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        renderRecentList(data.signatures);
      } else {
        // Stored key is wrong/stale — forget it and show the locked state again.
        adminKey = "";
        localStorage.removeItem(ADMIN_KEY_STORAGE);
        renderLockedRecent();
      }
    } catch (err) {
      renderLockedRecent();
    }
  }

  // Statistics panel elements
  const statAvgAge = document.getElementById("statAvgAge");
  const statAgeGroup = document.getElementById("statAgeGroup");
  const statTopCounty = document.getElementById("statTopCounty");
  const statCountyCount = document.getElementById("statCountyCount");
  const statScoutPercent = document.getElementById("statScoutPercent");
  const statNonScoutPercent = document.getElementById("statNonScoutPercent");

  if (!mapContainer) return;

  function setError(message) {
    formError.textContent = message || "";
  }

  function setBusy(busy) {
    signBtn.disabled = busy;
    signBtn.textContent = busy ? "SIGNING…" : "SIGN THE COMMITMENT";
  }

  function addSignatureToMap(name, x, y, animate) {
    const dot = document.createElement("div");
    dot.className = animate ? "signature-dot is-new" : "signature-dot";
    dot.style.left = `${x}%`;
    dot.style.top = `${y}%`;
    mapContainer.appendChild(dot);

    if (animate && name && name.length < 15) {
      const label = document.createElement("div");
      label.className = "signature-label";
      label.textContent = name.split(" ")[0];
      label.style.left = `${x}%`;
      label.style.top = `${y}%`;
      mapContainer.appendChild(label);
      setTimeout(() => label.remove(), 8000);
    }
  }

  function renderRecentList(signatures) {
    signaturesList.innerHTML = "";
    if (!signatures.length) {
      signaturesList.innerHTML = '<div class="empty-note">Be the first to sign.</div>';
      return;
    }
    signatures.forEach((sig) => {
      const div = document.createElement("div");
      div.className = "signature-item";
      div.innerHTML = `
        <strong></strong>
        <span class="county"></span>
        <div class="date"></div>
      `;
      div.querySelector("strong").textContent = sig.name;
      div.querySelector(".county").textContent = sig.county ? ` • ${sig.county}` : "";
      div.querySelector(".date").textContent = new Date(sig.createdAt).toLocaleDateString();
      signaturesList.appendChild(div);
    });
  }

  function renderStats(stats) {
    if (!stats || !statAvgAge) return;

    statAvgAge.textContent = stats.age.average !== null ? stats.age.average : "—";
    statAgeGroup.textContent = stats.age.mostCommonGroup || "—";

    statTopCounty.textContent = stats.county.top || "—";
    statCountyCount.textContent = stats.county.distinctCount || "0";

    statScoutPercent.textContent = stats.scout.scoutPercent !== null ? `${stats.scout.scoutPercent}%` : "—";
    statNonScoutPercent.textContent =
      stats.scout.nonScoutPercent !== null ? `${stats.scout.nonScoutPercent}%` : "—";
  }

  async function loadStats() {
    try {
      const res = await fetch("/api/signatures/stats");
      const data = await res.json();
      if (data.ok) renderStats(data.stats);
    } catch (err) {
      // Stats are a nice-to-have; fail silently rather than blocking the page.
    }
  }

  // ---- Initiatives layer (peace clubs, dialogue circles, projects) ----
  // Plotted from admin-entered latitude/longitude using Kenya's approximate
  // geographic bounding box. The base map image isn't a calibrated GIS
  // projection, so placement is an approximation, not pixel-exact.
  const KENYA_BOUNDS = { minLat: -4.72, maxLat: 5.05, minLon: 33.9, maxLon: 41.9 };

  function latLonToPercent(lat, lon) {
    const x = ((lon - KENYA_BOUNDS.minLon) / (KENYA_BOUNDS.maxLon - KENYA_BOUNDS.minLon)) * 100;
    const y = ((KENYA_BOUNDS.maxLat - lat) / (KENYA_BOUNDS.maxLat - KENYA_BOUNDS.minLat)) * 100;
    return { x: Math.min(98, Math.max(2, x)), y: Math.min(98, Math.max(2, y)) };
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[ch]);
  }

  function addInitiativePin(item) {
    if (item.latitude === null || item.longitude === null) return;
    const { x, y } = latLonToPercent(Number(item.latitude), Number(item.longitude));

    const pin = document.createElement("div");
    pin.className = "initiative-pin";
    pin.style.left = `${x}%`;
    pin.style.top = `${y}%`;
    pin.setAttribute("tabindex", "0");
    pin.setAttribute("role", "button");
    pin.setAttribute("aria-label", item.title);

    const tooltip = document.createElement("div");
    tooltip.className = "initiative-tooltip";
    tooltip.style.left = `${x}%`;
    tooltip.style.top = `${y}%`;
    tooltip.innerHTML = `<strong>${escapeHtml(item.title)}</strong>` +
      `<span class="initiative-tooltip-meta">${escapeHtml(item.category || "Initiative")}${item.county ? " · " + escapeHtml(item.county) : ""}</span>`;

    pin.addEventListener("focus", () => tooltip.classList.add("is-visible"));
    pin.addEventListener("blur", () => tooltip.classList.remove("is-visible"));
    pin.addEventListener("click", () => tooltip.classList.toggle("is-visible"));

    mapContainer.appendChild(pin);
    mapContainer.appendChild(tooltip);
  }

  async function loadInitiatives() {
    try {
      const res = await fetch("/api/initiatives");
      const data = await res.json();
      if (data.ok) data.initiatives.forEach(addInitiativePin);
    } catch (err) {
      // Initiative pins are a nice-to-have; fail silently rather than blocking the map.
    }
  }

  async function loadAll() {
    try {
      const [allRes, countRes] = await Promise.all([
        fetch("/api/signatures"),
        fetch("/api/signatures/count"),
      ]);
      const allData = await allRes.json();
      const countData = await countRes.json();

      if (allData.ok) allData.signatures.forEach((sig) => addSignatureToMap(null, sig.x, sig.y, false));
      if (countData.ok) signatureCountEl.textContent = countData.count.toLocaleString();

      loadRecentAdminAware();
      loadStats();
      loadInitiatives();
    } catch (err) {
      setError("Could not reach the server. Is the backend running? (npm start)");
    }
  }

  async function submitSignature(name, county, x, y, age, isScout) {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/signatures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, county, x, y, age, isScout }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      addSignatureToMap(data.signature.name, data.signature.x, data.signature.y, true);
      signatureCountEl.textContent = data.count.toLocaleString();

      loadRecentAdminAware();
      loadStats();

      nameInput.value = "";
      countyInput.value = "";
      if (ageInput) ageInput.value = "";
      if (scoutInput) scoutInput.value = "";

      const originalText = "SIGN THE COMMITMENT";
      signBtn.textContent = "✅ THANK YOU FOR COMMITTING!";
      signBtn.style.background = "#228B22";
      setTimeout(() => {
        signBtn.textContent = originalText;
        signBtn.style.background = "";
      }, 3000);

      if (window.cgToast) window.cgToast("Your commitment to peace has been recorded.");
    } catch (err) {
      setError(err.message);
      if (window.cgToast) window.cgToast(err.message, { error: true });
    } finally {
      setBusy(false);
    }
  }

  function currentAgeAndScout() {
    const ageValue = ageInput && ageInput.value.trim() ? Number(ageInput.value) : null;
    const scoutValue = scoutInput && scoutInput.value ? scoutInput.value : null;
    return { age: ageValue, isScout: scoutValue };
  }

  // Click on map to sign at that exact spot
  mapContainer.addEventListener("click", function (e) {
    if (e.target.closest(".signature-dot, .signature-label")) return;
    if (nameInput.value.trim() === "") {
      setError("Enter your name in the form before signing on the map.");
      nameInput.focus();
      return;
    }
    const rect = mapContainer.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const { age, isScout } = currentAgeAndScout();
    submitSignature(nameInput.value.trim(), countyInput.value.trim(), x, y, age, isScout);
  });

  // Form submission signs at a semi-random spot on the map
  signForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) {
      setError("Enter your name to sign.");
      return;
    }
    const x = 25 + Math.random() * 55;
    const y = 20 + Math.random() * 55;
    const { age, isScout } = currentAgeAndScout();
    submitSignature(name, countyInput.value.trim(), x, y, age, isScout);
  });

  loadAll();
})();
