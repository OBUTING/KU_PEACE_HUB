// Messengers of Peace signature map. Talks to /api/signatures on the
// unified backend (see backend/server.js) — no separate server needed.

(function () {
  "use strict";

  const mapContainer = document.getElementById("mapContainer");
  const signForm = document.getElementById("signForm");
  const nameInput = document.getElementById("nameInput");
  const countyInput = document.getElementById("countyInput");
  const signBtn = document.getElementById("signBtn");
  const formError = document.getElementById("formError");
  const signatureCountEl = document.getElementById("signatureCount");
  const signaturesList = document.getElementById("signaturesList");

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

  async function loadAll() {
    try {
      const [allRes, recentRes, countRes] = await Promise.all([
        fetch("/api/signatures"),
        fetch("/api/signatures/recent?limit=8"),
        fetch("/api/signatures/count"),
      ]);
      const allData = await allRes.json();
      const recentData = await recentRes.json();
      const countData = await countRes.json();

      if (allData.ok) allData.signatures.forEach((sig) => addSignatureToMap(sig.name, sig.x, sig.y, false));
      if (recentData.ok) renderRecentList(recentData.signatures);
      if (countData.ok) signatureCountEl.textContent = countData.count;
    } catch (err) {
      setError("Could not reach the server. Is the backend running? (npm start)");
    }
  }

  async function submitSignature(name, county, x, y) {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/signatures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, county, x, y }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      addSignatureToMap(data.signature.name, data.signature.x, data.signature.y, true);
      signatureCountEl.textContent = data.count;

      const recentRes = await fetch("/api/signatures/recent?limit=8");
      const recentData = await recentRes.json();
      if (recentData.ok) renderRecentList(recentData.signatures);

      nameInput.value = "";
      countyInput.value = "";

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
    submitSignature(nameInput.value.trim(), countyInput.value.trim(), x, y);
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
    submitSignature(name, countyInput.value.trim(), x, y);
  });

  loadAll();
})();
