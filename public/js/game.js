/* ===================================================================
   Peace Bridge — game logic
   Vanilla JS, no build step. Talks to the zero-dependency Node
   backend at /api/pledge and /api/pledges.
=================================================================== */
(function () {
  "use strict";

  // ---------------- content data ----------------

  const CHARACTERS = [
    { id: "amani", name: "Amani", region: "Central Highlands", emoji: "🧑🏾‍🌾",
      blurb: "Grew up terracing hillsides with her grandmother." },
    { id: "kiptoo", name: "Kiptoo", region: "Northern Plains", emoji: "🧑🏿‍🦱",
      blurb: "Moves cattle along the dry-season migration routes." },
    { id: "zawadi", name: "Zawadi", region: "Lakeside Towns", emoji: "🧑🏾", 
      blurb: "Fishes with her uncles before the school bell." },
    { id: "noor", name: "Noor", region: "Coastal Towns", emoji: "🧑🏽",
      blurb: "Helps run her family's dhow repair workshop." }
  ];

  const LEVELS = [
    {
      title: "The Divided Classroom",
      desc: "A school in the highlands, split into cliques along old lines. Empathy is the only tool that works here.",
      npcs: [
        {
          name: "Mwangi — sitting alone",
          prompt: "Mwangi is eating lunch by himself again. He was left out of the lunchtime game because he 'talks funny' — his family just moved from the coast.",
          choices: [
            { text: "Sit with him and ask what happened.", correct: true,
              reflection: "What did you learn about listening?",
              answer: "Sitting down first, before asking questions, tells someone their feelings matter more than an explanation does." },
            { text: "Walk past — it's not your problem.", correct: false,
              consequence: "Mwangi eats alone again. Tomorrow the group that excluded him grows by one, because no one showed it wasn't normal." },
            { text: "Tell him to just get over it.", correct: false,
              consequence: "Mwangi nods and says nothing else. Telling someone to 'get over' exclusion usually just teaches them to hide it." }
          ]
        },
        {
          name: "The lunchtime group",
          prompt: "A few classmates are mimicking Mwangi's accent, laughing. One of them, Faith, looks unsure but keeps laughing along.",
          choices: [
            { text: "Say plainly: 'That's not funny, that's his accent.'", correct: true,
              reflection: "What did you learn about speaking up?",
              answer: "Naming the harm out loud — calmly, without shaming anyone — gives people like Faith permission to stop too." },
            { text: "Laugh along so you don't stand out.", correct: false,
              consequence: "Faith keeps laughing. Going along with a joke at someone's expense is still a choice, and it was the wrong one." },
            { text: "Report it to a teacher without saying anything to the group.", correct: false,
              consequence: "The teasing pauses when the teacher is near and returns the moment she leaves." }
          ]
        },
        {
          name: "Mrs. Achieng — class teacher",
          prompt: "The teacher pulls a few students aside: 'I want to fix this before it becomes a bigger fight. What should we do?'",
          choices: [
            { text: "Suggest a class circle where everyone can speak and listen.", correct: true,
              reflection: "What did you learn about repair?",
              answer: "A structured space to speak and be heard rebuilds trust faster than punishment does — it treats the class as a community, not a courtroom." },
            { text: "Suggest the teacher just punish the loudest teaser.", correct: false,
              consequence: "One student is punished. The attitude that caused the teasing is untouched, and resentment quietly grows." },
            { text: "Say it will sort itself out.", correct: false,
              consequence: "It doesn't sort itself out. By the next term, two more students have stopped sitting with the group." }
          ]
        }
      ]
    },
    {
      title: "The Water Line",
      desc: "Where the highlands meet the plains, a single borehole serves both herders and farmers — and the dry season just started.",
      npcs: [
        {
          name: "Zeituni — herder elder",
          prompt: "\"Our cattle die if they can't reach the water line by Thursday. The farmers changed the schedule without asking us.\"",
          choices: [
            { text: "Ask her to show you the old schedule and what changed.", correct: true,
              reflection: "What did you learn about facts before blame?",
              answer: "Understanding exactly what changed — and when — turns a shouting match into a solvable problem." },
            { text: "Promise the herders can use the borehole whenever they want.", correct: false,
              consequence: "The farmers hear about the promise before you've spoken to them, and now feel like they weren't consulted either." },
            { text: "Tell her the herders will just have to adjust.", correct: false,
              consequence: "Zeituni walks away. Dismissing a real need doesn't make the need disappear." }
          ]
        },
        {
          name: "Farmer committee",
          prompt: "\"We irrigate at dawn or the crops fail in this heat. If the herders come through at dawn too, the water table drops for everyone.\"",
          choices: [
            { text: "Propose a shared, published schedule — herders at dusk, farmers at dawn.", correct: true,
              reflection: "What did you learn about shared resources?",
              answer: "Scarcity doesn't have to mean one side loses — a schedule both groups helped write is far more likely to be respected." },
            { text: "Side with the farmers because they were here first.", correct: false,
              consequence: "The herders feel unheard, and cattle start showing up at the borehole at dawn anyway, in protest." },
            { text: "Suggest digging a second borehole immediately, no discussion needed.", correct: false,
              consequence: "It's a good long-term idea, but it doesn't solve Thursday, and both groups feel like the real conflict was avoided." }
          ]
        },
        {
          name: "Youth water committee",
          prompt: "A group of young people from both communities has been watching. \"We could actually keep the schedule fair — if the elders will let us monitor it.\"",
          choices: [
            { text: "Back the youth committee and ask the elders to formally support it.", correct: true,
              reflection: "What did you learn about who keeps the peace?",
              answer: "Agreements last when the people enforcing them are trusted by both sides — often that's a new, mixed group, not the old dividing line." },
            { text: "Say the elders should keep control; young people aren't ready.", correct: false,
              consequence: "The youth committee disbands. Within two weeks, the schedule quietly breaks down again." },
            { text: "Ignore the offer and move on.", correct: false,
              consequence: "A chance to build lasting local trust passes by unused." }
          ]
        }
      ]
    },
    {
      title: "The Forest Factory",
      desc: "A proposed textile factory could bring hundreds of jobs — and it sits at the edge of a forest the coastal town depends on.",
      npcs: [
        {
          name: "Hamisi — factory worker",
          prompt: "\"My family has been out of steady work for two years. This factory means my kids eat well. Why is that less important than trees?\"",
          choices: [
            { text: "Acknowledge his need is real, and ask what would make the factory acceptable to him.", correct: true,
              reflection: "What did you learn about competing needs?",
              answer: "Treating someone's livelihood as 'the other side' of an environmental argument makes them defensive — treating it as a real need to solve for makes them a partner." },
            { text: "Tell him jobs shouldn't come before the environment.", correct: false,
              consequence: "Hamisi stops listening. He hears 'your family's needs don't matter,' which was never the point you meant to make." },
            { text: "Agree with him completely and dismiss the forest concerns.", correct: false,
              consequence: "The forest, and the fishing it protects, starts the conversation already half-lost." }
          ]
        },
        {
          name: "Amara — youth environmental activist",
          prompt: "\"That forest holds the coastline together. If it goes, the fish nurseries go, and then everyone's jobs go, including the factory's.\"",
          choices: [
            { text: "Ask her to help design a factory site that spares the nursery zones.", correct: true,
              reflection: "What did you learn about long-term thinking?",
              answer: "The best peace deals plan for ten years out, not just the next harvest — Amara's warning is a design constraint, not a veto." },
            { text: "Tell her the factory is more important; nature will adapt.", correct: false,
              consequence: "Amara organizes a protest. The conversation that could have shaped the factory's design is now a standoff." },
            { text: "Avoid the topic and hope it resolves itself.", correct: false,
              consequence: "Construction starts on the original site plan, nursery zones included." }
          ]
        },
        {
          name: "Council elder — final decision",
          prompt: "\"The council meets tomorrow. Everyone wants a different answer. What do we bring to the table?\"",
          choices: [
            { text: "Propose the factory moves 400 meters back, with a jobs guarantee for local families.", correct: true,
              reflection: "What did you learn about win-win solutions?",
              answer: "The strongest peace agreements aren't compromises where everyone loses a little — they're redesigns where the real needs on both sides both get met." },
            { text: "Recommend picking whichever side is loudest at the meeting.", correct: false,
              consequence: "The decision satisfies whoever showed up angriest, and the other side starts planning to be louder next time." },
            { text: "Recommend delaying the decision indefinitely.", correct: false,
              consequence: "Nothing is decided. Both the jobs and the forest keep waiting, and trust in the council erodes." }
          ]
        }
      ]
    }
  ];

  const PEACE_FACTS = [
    "Kenya's 2027 general election will be the first in which many first-time voters were still in primary school during the 2007–08 post-election violence — most know that history only second-hand.",
    "Peace agreements that include young people and women in the drafting process are, on average, associated with longer-lasting peace than those negotiated by a narrow group alone.",
    "Most community conflicts over resources — water, land, grazing routes — are resolved locally, long before they ever reach a court or a headline.",
    "Empathy is trainable: studies on perspective-taking exercises, like imagining a conflict from the other side's daily life, show measurable drops in hostility between groups."
  ];

  // ---------------- state ----------------

  const state = {
    character: null,
    levelIndex: 0,
    npcIndex: 0,
    empathy: 0,
    conflict: 0,
    planksBuilt: [0, 0, 0], // per-level built planks
    pendingChoice: null
  };

  // ---------------- element refs ----------------

  const el = (id) => document.getElementById(id);
  const screens = {
    intro: el("screen-intro"),
    select: el("screen-select"),
    level: el("screen-level"),
    end: el("screen-end")
  };

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.removeAttribute("data-active"));
    screens[name].setAttribute("data-active", "true");
  }

  function updateHud() {
    el("empathyScore").textContent = state.empathy;
    el("conflictLevel").textContent = state.conflict;
    el("levelIndicator").textContent =
      screens.level.hasAttribute("data-active") ? `${state.levelIndex + 1} / ${LEVELS.length}` : "—";
  }

  // ---------------- character select ----------------

  function renderCharacterGrid() {
    const grid = el("charGrid");
    grid.innerHTML = "";
    CHARACTERS.forEach((c) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "char-card";
      card.dataset.id = c.id;
      card.innerHTML = `
        <span class="char-emoji">${c.emoji}</span>
        <p class="char-name">${c.name}</p>
        <p class="char-region">${c.region}</p>
        <p class="char-blurb">${c.blurb}</p>
      `;
      card.addEventListener("click", () => {
        state.character = c;
        [...grid.children].forEach((el2) => el2.removeAttribute("data-selected"));
        card.setAttribute("data-selected", "true");
        el("btnConfirmChar").disabled = false;
      });
      grid.appendChild(card);
    });
  }

  // ---------------- level rendering ----------------

  function renderBridgeTrack() {
    const track = el("bridgeTrack");
    track.innerHTML = "";
    const level = LEVELS[state.levelIndex];
    level.npcs.forEach((_, i) => {
      const plank = document.createElement("div");
      plank.className = "plank";
      if (i < state.planksBuilt[state.levelIndex]) plank.dataset.built = "true";
      track.appendChild(plank);
    });
  }

  function renderLevel() {
    const level = LEVELS[state.levelIndex];
    el("levelEyebrow").textContent = `Level ${state.levelIndex + 1} of ${LEVELS.length}`;
    el("levelTitle").textContent = level.title;
    el("levelDesc").textContent = level.desc;
    el("stageFigure").textContent = state.character.emoji;
    renderBridgeTrack();
    renderNpc();
    updateHud();
  }

  function renderNpc() {
    const level = LEVELS[state.levelIndex];
    const npc = level.npcs[state.npcIndex];
    el("npcName").textContent = npc.name;
    el("npcPrompt").textContent = npc.prompt;

    const choicesWrap = el("choices");
    choicesWrap.innerHTML = "";
    npc.choices.forEach((choice) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice-btn";
      btn.textContent = choice.text;
      btn.addEventListener("click", () => handleChoice(choice));
      choicesWrap.appendChild(btn);
    });
  }

  function handleChoice(choice) {
    if (choice.correct) {
      state.empathy += 1;
      state.planksBuilt[state.levelIndex] += 1;
      renderBridgeTrack();
      openReflection(choice.reflection, choice.answer);
    } else {
      state.conflict += 1;
      openConflict(choice.consequence);
    }
    updateHud();
  }

  function openReflection(question, answer) {
    el("reflectQuestion").textContent = question;
    el("reflectAnswer").textContent = answer;
    el("overlayReflection").setAttribute("data-open", "true");
  }

  function closeReflectionAndAdvance() {
    el("overlayReflection").removeAttribute("data-open");
    advanceNpc();
  }

  function openConflict(text) {
    const track = el("bridgeTrack");
    const cracked = track.children[state.npcIndex];
    if (cracked) cracked.dataset.cracked = "true";
    el("conflictText").textContent = text;
    el("overlayConflict").setAttribute("data-open", "true");
  }

  function retryAfterConflict() {
    const track = el("bridgeTrack");
    const cracked = track.children[state.npcIndex];
    if (cracked) delete cracked.dataset.cracked;
    el("overlayConflict").removeAttribute("data-open");
    // stay on the same NPC for another attempt
    renderNpc();
  }

  function advanceNpc() {
    const level = LEVELS[state.levelIndex];
    state.npcIndex += 1;
    if (state.npcIndex >= level.npcs.length) {
      // level complete
      state.npcIndex = 0;
      state.levelIndex += 1;
      if (state.levelIndex >= LEVELS.length) {
        renderEndScreen();
        showScreen("end");
        return;
      }
      renderLevel();
      showScreen("level");
    } else {
      renderNpc();
    }
    updateHud();
  }

  // ---------------- end screen ----------------

  function renderEndScreen() {
    const totalPlanks = state.planksBuilt.reduce((a, b) => a + b, 0);
    const totalNpcs = LEVELS.reduce((a, l) => a + l.npcs.length, 0);
    el("endSummary").textContent =
      `Playing as ${state.character.name} from the ${state.character.region}, you built ${totalPlanks} of ${totalNpcs} planks ` +
      `with an empathy score of ${state.empathy} and ${state.conflict} moments of friction along the way. ` +
      (state.conflict === 0
        ? "Every crossing you found was the empathetic one."
        : "Every crack you caused, you also found a way back from.");

    const factsWrap = el("facts");
    factsWrap.innerHTML = "";
    PEACE_FACTS.forEach((f) => {
      const p = document.createElement("p");
      p.className = "fact";
      p.textContent = f;
      factsWrap.appendChild(p);
    });

    loadPeaceWall();
  }

  // ---------------- backend integration ----------------

  async function submitPledge(evt) {
    evt.preventDefault();
    const name = el("pledgeName").value.trim();
    const text = el("pledgeText").value.trim();
    const note = el("pledgeNote");
    if (!name || !text) return;

    note.textContent = "Sharing your promise…";
    try {
      const res = await fetch("/api/game-pledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, text, character: state.character.id, empathy: state.empathy })
      });
      if (!res.ok) throw new Error("Request failed");
      note.textContent = "Thank you — your promise is on the Peace Wall.";
      el("pledgeForm").reset();
      loadPeaceWall();
    } catch (err) {
      note.textContent = "Couldn't reach the server. You can still keep your promise offline.";
    }
  }

  async function loadPeaceWall() {
    const list = el("wallList");
    list.innerHTML = "<li>Loading the wall…</li>";
    try {
      const res = await fetch("/api/game-pledges");
      if (!res.ok) throw new Error("Request failed");
      const pledges = await res.json();
      list.innerHTML = "";
      if (!pledges.length) {
        list.innerHTML = "<li>Be the first to add your promise.</li>";
        return;
      }
      pledges.slice(0, 8).forEach((p) => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${escapeHtml(p.name)}:</strong> ${escapeHtml(p.text)}`;
        list.appendChild(li);
      });
    } catch (err) {
      list.innerHTML = "<li>The Peace Wall isn't reachable right now — the game backend may not be running.</li>";
    }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------------- reset ----------------

  function resetGame() {
    state.character = null;
    state.levelIndex = 0;
    state.npcIndex = 0;
    state.empathy = 0;
    state.conflict = 0;
    state.planksBuilt = [0, 0, 0];
    el("btnConfirmChar").disabled = true;
    renderCharacterGrid();
    updateHud();
    showScreen("intro");
  }

  // ---------------- wire up ----------------

  el("btnStart").addEventListener("click", () => {
    renderCharacterGrid();
    showScreen("select");
  });

  el("btnConfirmChar").addEventListener("click", () => {
    if (!state.character) return;
    renderLevel();
    showScreen("level");
  });

  el("btnReflectContinue").addEventListener("click", closeReflectionAndAdvance);
  el("btnConflictRetry").addEventListener("click", retryAfterConflict);
  el("pledgeForm").addEventListener("submit", submitPledge);
  el("btnReplay").addEventListener("click", resetGame);

  // initial paint
  updateHud();
})();
