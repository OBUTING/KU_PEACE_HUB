// Site-wide language switcher (English / Swahili).
//
// How it works: any element tagged with data-i18n="some.key" gets its
// text swapped for the matching string in the active language's
// dictionary below. The chosen language is remembered in localStorage,
// so it persists across page loads and across every page that includes
// this script.
//
// Currently fully translated: shared navbar + footer (every page), and
// the full home page content. Other pages' body content still needs its
// own data-i18n tags + dictionary entries added the same way — the nav
// and footer will already switch correctly everywhere.
//
// To add a new translatable string anywhere on the site:
//   1. Add data-i18n="yourSection.yourKey" to the HTML element
//   2. Add "yourSection.yourKey": "..." to both the en and sw objects below

(function () {
  "use strict";

  const LANG_STORAGE_KEY = "cg_lang";

  const translations = {
    en: {
      "nav.home": "Home",
      "nav.breaks": "What breaks peace",
      "nav.pledge": "Youth pledge",
      "nav.map": "Peace map",
      "nav.tree": "Peace Tree project",
      "nav.guide": "Peace Guide",
      "nav.resources": "Resources",
      "nav.report": "Report / Get help",
      "nav.login": "Log in",

      "banner.title": "Kenyatta University Scouts Peace Hub",

      "hero.title": "Building Peace. Inspiring Communities. Transforming Lives.",
      "hero.subtitle":
        "A digital platform empowering individuals, schools, youth groups, scouts, organizations, and communities to promote peace, unity, leadership, and sustainable development.",
      "hero.btnJoin": "Join the Movement",
      "hero.btnExplore": "Explore Projects",

      "about.eyebrow": "About Peace Hub",
      "about.title": "A community-driven initiative for peace",
      "about.body1":
        "Peace Hub is a community-driven initiative dedicated to promoting peace, conflict resolution, leadership, environmental conservation, and youth empowerment.",
      "about.body2":
        "Through education, innovative games, community service, technology, and collaboration, Peace Hub inspires people to become ambassadors of peace in their schools, workplaces, and communities.",

      "vmt.eyebrow": "Who we are",
      "vmt.title": "Vision, Mission & Theme",
      "vmt.visionTitle": "Vision",
      "vmt.visionBody": "A world where every person becomes a champion of peace.",
      "vmt.missionTitle": "Mission",
      "vmt.missionBody":
        "To empower communities through education, dialogue, innovation, and action for a peaceful and sustainable future.",
      "vmt.themeTitle": "2026 Theme",
      "vmt.themeBody":
        '"Empowering Young People to Promote Dialogue and Peaceful Communities" — the Kenya Scouts National Theme guiding this year\'s peacebuilding projects.',

      "values.eyebrow": "What we stand for",
      "values.title": "Core Values",
      "values.peace": "Peace",
      "values.unity": "Unity",
      "values.diversity": "Diversity",
      "values.compassion": "Compassion",
      "values.justice": "Justice",
      "values.sustainability": "Sustainability",
      "values.leadership": "Leadership",

      "peace3.eyebrow": "Three kinds of peace",
      "peace3.title": "Peace is not one thing. It's three, working together.",
      "peace3.lede": "Most people picture peace as quiet. That's only the first layer.",
      "peace3.innerTag": "Inner",
      "peace3.innerTitle": "Personal peace",
      "peace3.innerBody": "The steadiness to sit with discomfort without striking out or shutting down.",
      "peace3.socialTag": "Social",
      "peace3.socialTitle": "Relational peace",
      "peace3.socialBody": "How people treat each other day to day — whether trust gets rebuilt after it breaks.",
      "peace3.structTag": "Structural",
      "peace3.structTitle": "Fair systems",
      "peace3.structBody": "The rules and access that shape whether basic needs are met without a fight.",

      "essay.eyebrow": "Why it takes work",
      "essay.title": "A quiet street isn't the same as a peaceful one.",
      "essay.body":
        "A town can have no fighting in its streets and still be unequal, isolated, or one bad week from breaking down. Real peace has to be built on purpose — small, repeatable habits: people who check in, disagreements talked through instead of buried, resources that reach who needs them.",
      "essay.quote": "The opposite of peace isn't conflict. It's a community that has no way of handling conflict.",

      "ways.eyebrow": "Everyday practices",
      "ways.title": "What building peace actually looks like",
      "ways.lede": "No title or budget required — just habits you can start this week.",
      "ways.card1Title": "Listen before responding",
      "ways.card1Body": "Most conflict escalates because people feel unheard, not because they disagree.",
      "ways.card2Title": "Step into small conflicts early",
      "ways.card2Body": "Easier to defuse on day one than after months of resentment.",
      "ways.card3Title": "Widen who's included",
      "ways.card3Body": "Notice who's missing from the room or chat — and ask them in.",
      "ways.card4Title": "Repair, don't just apologize",
      "ways.card4Body": "A returned favor or fixed habit is what people actually remember.",
      "ways.card5Title": "Make difference visible, not a threat",
      "ways.card5Body": "Communities that celebrate difference openly fight over it less.",
      "ways.card6Title": "Share what's scarce, openly",
      "ways.card6Body": "Handled openly, scarcity builds trust instead of suspicion.",
      "ways.card7Title": "Show up on the ordinary days",
      "ways.card7Body": "Peace is built by whoever shows up on the unremarkable Tuesdays.",

      "testimonials.eyebrow": "What people say",
      "testimonials.title": "Testimonials",
      "testimonials.quote1": '"Peace Hub inspired our students to become leaders."',
      "testimonials.quote2": '"The Peace Card Game changed how we teach peace education."',
      "testimonials.quote3": '"An amazing initiative for communities."',

      "gamepromo.eyebrow": "Play it out",
      "gamepromo.title": "Peace Bridge — a short game about the choices that build peace.",
      "gamepromo.body": "Play as one of four characters. Cross three places where trust has cracked.",
      "gamepromo.btn": "Play Peace Bridge",

      "ripple.eyebrow": "See it in motion",
      "ripple.title": "One action ripples further than you'd think",
      "ripple.lede": "Click the field below to place a peaceful action — and watch it reach what's nearby.",
      "ripple.hint": "Click to add an action",
      "ripple.reset": "Clear the field",

      "footer.tagline1": "Kenyatta University Peace Hub — a KU Scouts initiative.",
      "footer.tagline2": "Empowering peace through youth leadership.",
      "footer.exploreTitle": "Explore",
      "footer.contactTitle": "Get in touch",
      "footer.copyright": "KU Peace Innovation Hub — Kenyatta University Scouts. All rights reserved.",
      "footer.builtFor": "Built for transparency, sustainability, and lasting impact.",
    },

    sw: {
      "nav.home": "Nyumbani",
      "nav.breaks": "Kinachovunja amani",
      "nav.pledge": "Ahadi ya Vijana",
      "nav.map": "Ramani ya Amani",
      "nav.tree": "Mradi wa Mti wa Amani",
      "nav.guide": "Mwongozo wa Amani",
      "nav.resources": "Rasilimali",
      "nav.report": "Ripoti / Pata Msaada",
      "nav.login": "Ingia",

      "banner.title": "Kituo cha Amani cha Skauti wa Chuo Kikuu cha Kenyatta",

      "hero.title": "Kujenga Amani. Kuhamasisha Jamii. Kubadilisha Maisha.",
      "hero.subtitle":
        "Jukwaa la kidijitali linalowawezesha watu binafsi, shule, vikundi vya vijana, skauti, mashirika, na jamii kukuza amani, umoja, uongozi, na maendeleo endelevu.",
      "hero.btnJoin": "Jiunge na Harakati",
      "hero.btnExplore": "Chunguza Miradi",

      "about.eyebrow": "Kuhusu Peace Hub",
      "about.title": "Mpango unaoongozwa na jamii kwa ajili ya amani",
      "about.body1":
        "Peace Hub ni mpango unaoongozwa na jamii, ulioandaliwa kukuza amani, utatuzi wa migogoro, uongozi, uhifadhi wa mazingira, na uwezeshaji wa vijana.",
      "about.body2":
        "Kupitia elimu, michezo bunifu, huduma za jamii, teknolojia, na ushirikiano, Peace Hub inahamasisha watu kuwa mabalozi wa amani katika shule, mahali pa kazi, na jamii zao.",

      "vmt.eyebrow": "Sisi ni akina nani",
      "vmt.title": "Dira, Dhamira na Mada",
      "vmt.visionTitle": "Dira",
      "vmt.visionBody": "Dunia ambapo kila mtu anakuwa mtetezi wa amani.",
      "vmt.missionTitle": "Dhamira",
      "vmt.missionBody":
        "Kuwezesha jamii kupitia elimu, mazungumzo, ubunifu, na hatua kwa ajili ya baadaye yenye amani na endelevu.",
      "vmt.themeTitle": "Mada ya 2026",
      "vmt.themeBody":
        '"Kuwawezesha Vijana Kukuza Mazungumzo na Jamii zenye Amani" — Mada ya Kitaifa ya Skauti wa Kenya inayoongoza miradi ya kujenga amani mwaka huu.',

      "values.eyebrow": "Tunachosimamia",
      "values.title": "Maadili Msingi",
      "values.peace": "Amani",
      "values.unity": "Umoja",
      "values.diversity": "Utofauti",
      "values.compassion": "Huruma",
      "values.justice": "Haki",
      "values.sustainability": "Uendelevu",
      "values.leadership": "Uongozi",

      "peace3.eyebrow": "Aina tatu za amani",
      "peace3.title": "Amani si kitu kimoja. Ni vitu vitatu, vinavyofanya kazi pamoja.",
      "peace3.lede": "Watu wengi hufikiria amani kama utulivu tu. Hiyo ni safu ya kwanza tu.",
      "peace3.innerTag": "Ndani",
      "peace3.innerTitle": "Amani binafsi",
      "peace3.innerBody": "Uwezo wa kukaa na usumbufu bila kulipuka au kujifunga.",
      "peace3.socialTag": "Kijamii",
      "peace3.socialTitle": "Amani ya uhusiano",
      "peace3.socialBody": "Jinsi watu wanavyoshughulikiana kila siku — iwapo uaminifu hurejeshwa baada ya kuvunjika.",
      "peace3.structTag": "Kimuundo",
      "peace3.structTitle": "Mifumo ya haki",
      "peace3.structBody": "Sheria na fursa zinazoamua iwapo mahitaji ya msingi yanatimizwa bila mapambano.",

      "essay.eyebrow": "Kwa nini inahitaji kazi",
      "essay.title": "Barabara tulivu si sawa na barabara yenye amani.",
      "essay.body":
        "Mji unaweza kutokuwa na mapigano mitaani lakini bado ukawa na ukosefu wa usawa, upweke, au wiki moja mbaya kabla ya kuvunjika. Amani ya kweli lazima ijengwe kwa makusudi — tabia ndogo zinazorudiwa: watu wanaoulizana hali, migogoro inayozungumzwa badala ya kufichwa, rasilimali zinazowafikia wanaozihitaji.",
      "essay.quote": "Kinyume cha amani si mgogoro. Ni jamii isiyo na njia ya kushughulikia mgogoro.",

      "ways.eyebrow": "Mazoea ya kila siku",
      "ways.title": "Ujenzi wa amani unavyoonekana kwa vitendo",
      "ways.lede": "Hakuna cheo au bajeti inayohitajika — tabia tu unazoweza kuanza wiki hii.",
      "ways.card1Title": "Sikiliza kabla ya kujibu",
      "ways.card1Body": "Migogoro mingi huongezeka kwa sababu watu wanahisi hawasikilizwi, si kwa sababu hawakubaliani.",
      "ways.card2Title": "Ingilia migogoro midogo mapema",
      "ways.card2Body": "Ni rahisi kutatua siku ya kwanza kuliko baada ya miezi ya uchungu.",
      "ways.card3Title": "Panua wanaohusika",
      "ways.card3Body": "Angalia nani hayupo chumbani au katika mazungumzo — na umkaribishe.",
      "ways.card4Title": "Rekebisha, si kuomba msamaha tu",
      "ways.card4Body": "Fadhila iliyorejeshwa au tabia iliyorekebishwa ndiyo watu hukumbuka kweli.",
      "ways.card5Title": "Fanya tofauti ionekane, si tishio",
      "ways.card5Body": "Jamii zinazosherehekea tofauti waziwazi hupigana kidogo kuhusu hilo.",
      "ways.card6Title": "Shiriki kinachopungua, waziwazi",
      "ways.card6Body": "Ikishughulikiwa waziwazi, uhaba hujenga uaminifu badala ya shaka.",
      "ways.card7Title": "Jitokeze siku za kawaida",
      "ways.card7Body": "Amani hujengwa na yeyote anayeendelea kujitokeza siku za kawaida za Jumanne.",

      "testimonials.eyebrow": "Watu wanasema nini",
      "testimonials.title": "Ushuhuda",
      "testimonials.quote1": '"Peace Hub iliwahamasisha wanafunzi wetu kuwa viongozi."',
      "testimonials.quote2": '"Mchezo wa Kadi za Amani ulibadilisha jinsi tunavyofundisha elimu ya amani."',
      "testimonials.quote3": '"Mpango wa ajabu kwa jamii."',

      "gamepromo.eyebrow": "Ionje mwenyewe",
      "gamepromo.title": "Peace Bridge — mchezo mfupi kuhusu maamuzi yanayojenga amani.",
      "gamepromo.body": "Cheza kama mmoja wa wahusika wanne. Vuka maeneo matatu ambapo uaminifu umevunjika.",
      "gamepromo.btn": "Cheza Peace Bridge",

      "ripple.eyebrow": "Ione ikitendeka",
      "ripple.title": "Kitendo kimoja huenea mbali zaidi ya unavyofikiri",
      "ripple.lede": "Bofya kwenye uwanja hapa chini kuweka kitendo cha amani — na uone jinsi kinavyofikia walio karibu.",
      "ripple.hint": "Bofya kuongeza kitendo",
      "ripple.reset": "Safisha uwanja",

      "footer.tagline1": "Kituo cha Amani cha Chuo Kikuu cha Kenyatta — mpango wa Skauti wa KU.",
      "footer.tagline2": "Kukuza amani kupitia uongozi wa vijana.",
      "footer.exploreTitle": "Chunguza",
      "footer.contactTitle": "Wasiliana Nasi",
      "footer.copyright": "KU Peace Innovation Hub — Skauti wa Chuo Kikuu cha Kenyatta. Haki zote zimehifadhiwa.",
      "footer.builtFor": "Imejengwa kwa uwazi, uendelevu, na matokeo ya kudumu.",
    },
  };

  function getLang() {
    return localStorage.getItem(LANG_STORAGE_KEY) || "en";
  }

  function applyTranslations(lang) {
    const dict = translations[lang] || translations.en;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const value = dict[key] || translations.en[key];
      if (value !== undefined) el.textContent = value;
    });
    document.documentElement.lang = lang === "sw" ? "sw" : "en";
    updateToggleUI(lang);
  }

  function setLanguage(lang) {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    applyTranslations(lang);
  }
  window.setLanguage = setLanguage; // exposed in case a page wants a custom trigger too

  function updateToggleUI(lang) {
    document.querySelectorAll(".lang-toggle-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lang === lang);
    });
  }

  function buildToggle() {
    const wrap = document.createElement("div");
    wrap.className = "lang-toggle";
    wrap.innerHTML = `
      <button type="button" class="lang-toggle-btn" data-lang="en">EN</button>
      <button type="button" class="lang-toggle-btn" data-lang="sw">SW</button>
    `;
    wrap.querySelectorAll(".lang-toggle-btn").forEach((btn) => {
      btn.addEventListener("click", () => setLanguage(btn.dataset.lang));
    });
    return wrap;
  }

  function mountToggle() {
    // Prefer a dedicated slot if the page provides one (index.html does);
    // otherwise append straight into the navbar's link list so every page
    // gets the switcher even without editing each page's markup.
    const slot = document.getElementById("langSwitcherSlot");
    if (slot) {
      slot.appendChild(buildToggle());
      return;
    }
    const navList = document.querySelector(".cg-navbar .navbar-nav");
    if (navList) {
      const li = document.createElement("li");
      li.className = "nav-item";
      li.appendChild(buildToggle());
      navList.appendChild(li);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    mountToggle();
    applyTranslations(getLang());
  });
})();
