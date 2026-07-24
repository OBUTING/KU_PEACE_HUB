// Peace Guide chat widget — plain JS, talks to /api/peace-guide on the
// shared backend. No framework dependency, consistent with the rest of
// this site's front-end code.

(function () {
  "use strict";

  const messagesEl = document.getElementById("pgMessages");
  const introEl = document.getElementById("pgIntro");
  const form = document.getElementById("pgForm");
  const input = document.getElementById("pgInput");
  const sendBtn = document.getElementById("pgSendBtn");
  const errorEl = document.getElementById("pgError");

  if (!form) return;

  let messages = []; // { role: "user" | "assistant", content: string }
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

    if (introEl) {
      introEl.remove();
    }

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
