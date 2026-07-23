// FAQ library for the auto-reply bot. Each entry has a topic label,
// keywords to match against an incoming message (lowercase, substring
// match), and the answer to send back. The bot picks the first entry
// whose keywords appear in the message; if nothing matches, it sends
// the fallback menu instead.
//
// Edit freely — add, remove, or reword entries, or add new topics.

const faqs = [
  {
    topic: "What is peace",
    keywords: ["what is peace", "define peace", "meaning of peace"],
    answer:
      "Peace isn't just the absence of conflict — it's a community that knows how to *handle* conflict. " +
      "It has three layers: personal peace (staying steady under pressure), relational peace (how people " +
      "treat each other day to day), and structural peace (fair systems everyone can rely on).",
  },
  {
    topic: "What breaks peace",
    keywords: ["breaks peace", "causes conflict", "what breaks", "disruptors"],
    answer:
      "Common patterns that break peace: miscommunication & rumor, broken promises, unequal treatment, " +
      "scarcity & competition, unresolved anger, isolation, and silence after conflict. Catch any of these " +
      "early and they're usually simple to repair. Ask me about \"repair\" for how.",
  },
  {
    topic: "How to repair / resolve conflict",
    keywords: ["repair", "resolve conflict", "fix a conflict", "how do i resolve"],
    answer:
      "A few things that actually work: go to the source instead of reacting to rumor, address tension " +
      "while it's still small, and repair (a returned favor, a changed habit) instead of just apologizing. " +
      "An uncomfortable conversation, handled with care, closes a wound faster than silence ever will.",
  },
  {
    topic: "Report incitement or violence",
    keywords: ["report", "incitement", "violence", "threat", "unsafe"],
    answer:
      "If you're witnessing or hearing about incitement or planned violence, report it through the right " +
      "channels — local chiefs, elders, school administration, or the police. If you or someone else is in " +
      "immediate danger, contact emergency services directly first. This bot can't dispatch help itself.",
  },
  {
    topic: "Election date",
    keywords: ["election", "vote", "2027", "iebc"],
    answer:
      "Kenya's next General Election is set for Tuesday, 10 August 2027. Whatever side you're on, the goal " +
      "is the same: disagree without violence, and take grievances through legal channels, not the street.",
  },
  {
    topic: "Take the pledge",
    keywords: ["pledge", "promise", "commit"],
    answer:
      "You can take the full Youth Peace Pledge here: https://ku-peace-hub.onrender.com/pledge.html — " +
      "choose the commitments that matter to you, no politics required.",
  },
  {
    topic: "Sign the peace map",
    keywords: ["map", "sign", "messengers of peace"],
    answer:
      "Add your name to the Messengers of Peace map: https://ku-peace-hub.onrender.com/map.html",
  },
  {
    topic: "Play the game",
    keywords: ["game", "peace bridge", "play"],
    answer:
      "Try Peace Bridge, a short game about the choices that build peace: " +
      "https://ku-peace-hub.onrender.com/game.html",
  },
  {
    topic: "Peace Tree project",
    keywords: ["peace tree", "dialogue tree", "kiwi patrol"],
    answer:
      "The Portable Peace Dialogue Tree is a foldable, recycled-materials tool built by Kenyatta " +
      "University's Kiwi Patrol for the 2026 Kenya Scouts National Theme. Read more: " +
      "https://ku-peace-hub.onrender.com/peace-tree.html",
  },
  {
    topic: "Join Scouts / Panthera Rover Crew",
    keywords: ["scouts", "panthera", "rover crew", "join"],
    answer:
      "Kenyatta University Scouts — Panthera Rover Crew meets every Wednesday, 5:00–7:00 PM at KU " +
      "Bishop's Square. Reach them at kupantherascouts@gmail.com.",
  },
  {
    topic: "Contact",
    keywords: ["contact", "email", "phone number", "reach you"],
    answer: "You can reach the KU Peace Hub team at kupeacehub@gmail.com.",
  },
];

const MENU_TEXT =
  "🕊️ *KU Peace Hub — FAQ bot*\n\n" +
  "Reply with a number, or type a word or two from the topic:\n\n" +
  faqs.map((f, i) => `${i + 1}. ${f.topic}`).join("\n") +
  "\n\nExample: reply \"6\" for the pledge, or just type \"pledge\".";

function findAnswer(rawText) {
  const text = (rawText || "").toLowerCase().trim();
  if (!text) return null;

  if (["menu", "help", "topics", "hi", "hello", "hey"].includes(text)) {
    return MENU_TEXT;
  }

  // Numbered reply, e.g. "6" or "6." picks that topic directly from the menu.
  const numberMatch = text.match(/^(\d+)\.?$/);
  if (numberMatch) {
    const index = parseInt(numberMatch[1], 10) - 1;
    if (index >= 0 && index < faqs.length) {
      return faqs[index].answer;
    }
    return `That's not a topic number on the menu. ${MENU_TEXT}`;
  }

  const match = faqs.find((f) => f.keywords.some((k) => text.includes(k)));
  if (match) return match.answer;

  return `I didn't quite catch that. ${MENU_TEXT}`;
}

module.exports = { faqs, findAnswer, MENU_TEXT };
