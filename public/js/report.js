// Report / Get Help page — submits anonymous reports to /api/reports.
// No name or contact field exists anywhere on this form by design.

(function () {
  "use strict";

  const form = document.getElementById("reportForm");
  if (!form) return;

  const categorySelect = document.getElementById("reportCategory");
  const countySelect = document.getElementById("reportCounty");
  const descriptionInput = document.getElementById("reportDescription");
  const submitBtn = document.getElementById("reportSubmitBtn");
  const errorEl = document.getElementById("reportError");
  const successEl = document.getElementById("reportSuccess");

  const KENYA_COUNTIES = [
    "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa", "Homa Bay",
    "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii", "Kisumu",
    "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera", "Marsabit", "Meru",
    "Migori", "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua",
    "Nyeri", "Samburu", "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi", "Trans Nzoia",
    "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot",
  ];
  KENYA_COUNTIES.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    countySelect.appendChild(opt);
  });

  function setError(message) {
    errorEl.textContent = message || "";
    errorEl.hidden = !message;
  }

  function setBusy(busy) {
    submitBtn.disabled = busy;
    submitBtn.textContent = busy ? "Submitting…" : "Submit anonymously";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setError("");
    successEl.hidden = true;

    const description = descriptionInput.value.trim();
    if (!description) {
      setError("Please describe what happened.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: categorySelect.value,
          county: countySelect.value,
          description,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || "Something went wrong. Please try again.");

      form.reset();
      successEl.hidden = false;
      if (window.cgToast) window.cgToast("Report submitted anonymously.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  });
})();

(function () {
  "use strict";

  const messagesEl = document.getElementById("pgMessages");
  const introEl = document.getElementById("pgIntro");
  const form = document.getElementById("pgForm");
  const input = document.getElementById("pgInput");
  const sendBtn = document.getElementById("pgSendBtn");
  const errorEl = document.getElementById("pgError");

  if (!form) return;

  let messages = [];
  let loading = false;

  function setError(message) {
    errorEl.textContent = message || "";
    errorEl.hidden = !message;
  }

  function setLoading(isLoading) {
    loading = isLoading;
    input.disabled = isLoading;
    sendBtn.disabled = isLoading || !input.value.trim();
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderMessage(message) {
    const row = document.createElement("div");
    row.className = `pg-row ${message.role === "user" ? "pg-row-user" : "pg-row-assistant"}`;
    const bubble = document.createElement("div");
    bubble.className = `pg-bubble ${message.role === "user" ? "pg-bubble-user" : "pg-bubble-assistant"}`;
    bubble.textContent = message.content;
    row.appendChild(bubble);
    messagesEl.appendChild(row);
  }

  function renderTypingIndicator() {
    const row = document.createElement("div");
    row.className = "pg-row pg-row-assistant";
    row.id = "pgTypingRow";
    const bubble = document.createElement("div");
    bubble.className = "pg-bubble pg-bubble-typing";
    bubble.textContent = "Thinking…";
    row.appendChild(bubble);
    messagesEl.appendChild(row);
  }

  function removeTypingIndicator() {
    const row = document.getElementById("pgTypingRow");
    if (row) row.remove();
  }

  async function send(text) {
    const trimmed = (text || "").trim();
    if (!trimmed || loading) return;

    if (introEl) introEl.remove();

    messages.push({ role: "user", content: trimmed });
    renderMessage({ role: "user", content: trimmed });
    input.value = "";
    setError("");
    setLoading(true);
    renderTypingIndicator();
    scrollToBottom();

    try {
      const res = await fetch("/api/peace-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      messages.push({ role: "assistant", content: data.reply });
      removeTypingIndicator();
      renderMessage({ role: "assistant", content: data.reply });
    } catch (err) {
      removeTypingIndicator();
      setError(err.message || "Something went wrong reaching the Peace Guide. Please try again.");
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    send(input.value);
  });

  input.addEventListener("input", () => {
    sendBtn.disabled = loading || !input.value.trim();
  });

  document.querySelectorAll(".pg-starter-btn").forEach((btn) => {
    btn.addEventListener("click", () => send(btn.textContent));
  });

  sendBtn.disabled = true;
})();

(function () {
  "use strict";

  const wheel = document.getElementById("ptWheel");
  const btn = document.getElementById("ptWheelBtn");
  const readout = document.getElementById("ptWheelReadout");
  if (!wheel || !btn || !readout) return;

  const stages = ["Conflict", "Talk", "Understand", "Peace"];
  let stageIndex = 0;
  let rotation = 0;

  btn.addEventListener("click", () => {
    stageIndex = (stageIndex + 1) % stages.length;
    rotation -= 90;
    wheel.style.transform = `rotate(${rotation}deg)`;
    readout.textContent = `Stage: ${stages[stageIndex]}`;

    if (stages[stageIndex] === "Peace" && window.cgToast) {
      window.cgToast("From conflict to peace — that's the whole wheel.");
    }
  });
})();
