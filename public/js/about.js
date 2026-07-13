// "What breaks peace" page: a lightweight, fully client-side keyword matcher
// that points the user toward the most relevant disruptor + repair.
// This is intentionally simple pattern matching, not an AI call — see the
// on-page disclaimer.

(function () {
  "use strict";

  const input = document.getElementById("problemInput");
  const button = document.getElementById("solveBtn");
  const result = document.getElementById("solverResult");
  if (!input || !button || !result) return;

  const library = [
    {
      title: "Miscommunication & rumor",
      repair: "Go to the source. Ask the person directly before reacting to what you heard secondhand.",
      keywords: ["rumor", "rumour", "heard", "gossip", "misunderstood", "misunderstand", "assume", "assumed", "assumption", "said that", "told me"],
    },
    {
      title: "Broken promises & betrayal",
      repair: "An apology names the harm. Repair changes behavior — a kept commitment matters more than words.",
      keywords: ["promise", "betray", "lied", "lie", "trust", "broke his word", "broke her word", "let me down", "cheated"],
    },
    {
      title: "Unequal treatment & exclusion",
      repair: "Name it plainly, then widen the circle on purpose — invite in, don't wait for people to ask.",
      keywords: ["excluded", "left out", "unfair", "favorit", "ignored", "not invited", "unequal", "discriminat"],
    },
    {
      title: "Scarcity & competition",
      repair: "Make sharing visible and structured — a rotation, a shared list — instead of leaving it to informal secrecy.",
      keywords: ["money", "resources", "scarce", "competition", "rivals", "not enough", "budget", "shortage"],
    },
    {
      title: "Unresolved anger & grudges",
      repair: "Address tension while it's still small. A short, early, honest conversation beats a long, delayed, angry one.",
      keywords: ["angry", "anger", "grudge", "resent", "still mad", "furious", "annoyed"],
    },
    {
      title: "Isolation & disconnection",
      repair: "Small, consistent contact — a regular check-in, a shared routine — rebuilds familiarity faster than a single big gesture.",
      keywords: ["isolat", "lonely", "distant", "don't talk", "haven't spoken", "disconnected", "stranger"],
    },
    {
      title: "Silence after conflict",
      repair: "An uncomfortable conversation, handled with care, closes a wound faster than an indefinite silence ever will.",
      keywords: ["silent", "silence", "haven't spoken", "avoiding", "won't talk", "not talking", "stopped talking"],
    },
  ];

  function score(text) {
    const lower = text.toLowerCase();
    return library
      .map((entry) => ({
        entry,
        hits: entry.keywords.filter((k) => lower.includes(k)).length,
      }))
      .filter((r) => r.hits > 0)
      .sort((a, b) => b.hits - a.hits);
  }

  button.addEventListener("click", () => {
    const text = input.value.trim();
    result.hidden = false;

    if (!text) {
      result.innerHTML = `<p class="solver-empty">Write a sentence or two about what's going on, then try again.</p>`;
      input.focus();
      return;
    }

    const matches = score(text);
    const picks = matches.length ? matches.slice(0, 2) : [library[library.length - 2], library[library.length - 1]];

    const heading = matches.length
      ? "This sounds closest to:"
      : "We couldn't match specific keywords, but these two patterns cover most everyday tension — one may still fit:";

    result.innerHTML =
      `<p class="solver-heading">${heading}</p>` +
      picks
        .map(
          (p) => `
        <div class="solver-match">
          <h4>${p.entry.title}</h4>
          <p><span>The repair</span>${p.repair}</p>
        </div>`
        )
        .join("");
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) button.click();
  });
})();
