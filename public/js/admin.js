/* --------------------------------------------------------------------------
   PEACE HUB Admin Dashboard
   A local-first admin workspace. It keeps drafts and management actions in
   localStorage, and transparently reads protected server data when an
   ADMIN_KEY has been configured for the current browser.
   -------------------------------------------------------------------------- */

(function () {
  "use strict";

  const STORAGE_KEY = "cg_admin_dashboard_v1";
  const ADMIN_KEY_STORAGE = "cg_admin_key";
  const viewNames = {
    overview: "Overview",
    users: "People",
    applications: "Applications",
    content: "News & events",
    registrations: "Events & registration",
    quizzes: "Quizzes",
    learning: "Learning hub",
    resources: "Resources",
    games: "Peace games",
    projects: "Projects",
    initiatives: "Initiatives map",
    analytics: "Analytics",
  };

  const entityNames = {
    users: "person",
    applications: "application",
    content: "update",
    registrations: "registration",
    materials: "learning material",
    quizzes: "quiz",
    resources: "resource",
    games: "peace game",
    projects: "project",
    initiatives: "initiative",
  };

  const endpointByEntity = {
    applications: "volunteers",
    content: "content",
    registrations: "registrations",
    materials: "materials",
    quizzes: "quizzes",
    resources: "resources",
    games: "games",
    projects: "projects",
    initiatives: "initiatives",
  };

  const defaultState = {
    metrics: {
      community: 248,
      visitors: 12249,
      registrations: 1864,
      completions: 371,
    },
    users: [
      { id: "u-1", fullName: "Jamal Otieno", email: "jamal.otieno@ku.ac.ke", role: "Volunteer", status: "Active", joined: "2026-07-22", activity: "12 contributions" },
      { id: "u-2", fullName: "Wanjiku Njeri", email: "wanjiku.njeri@ku.ac.ke", role: "Learner", status: "Active", joined: "2026-07-19", activity: "4 courses" },
      { id: "u-3", fullName: "Brian Mwangi", email: "brian.mwangi@ku.ac.ke", role: "Facilitator", status: "Active", joined: "2026-07-17", activity: "3 workshops" },
      { id: "u-4", fullName: "Aisha Noor", email: "aisha.noor@ku.ac.ke", role: "Volunteer", status: "Pending", joined: "2026-07-13", activity: "Application started" },
      { id: "u-5", fullName: "Kirui Terer", email: "kirui.terer@ku.ac.ke", role: "Learner", status: "Inactive", joined: "2026-06-29", activity: "Last active 18d ago" },
      { id: "u-6", fullName: "Faith Muthoni", email: "faith.muthoni@ku.ac.ke", role: "Administrator", status: "Active", joined: "2026-06-11", activity: "Platform admin" },
    ],
    applications: [
      { id: "a-1", fullName: "Achieng Kariuki", email: "achieng.kariuki@gmail.com", county: "Nairobi", interests: "Dialogue facilitation", availability: "Weekends", status: "New", submittedAt: "2026-07-26" },
      { id: "a-2", fullName: "David Kilonzo", email: "david.kilonzo@gmail.com", county: "Machakos", interests: "Media & storytelling", availability: "Afternoons", status: "Reviewing", submittedAt: "2026-07-25" },
      { id: "a-3", fullName: "Trevor Omondi", email: "trevor.omondi@gmail.com", county: "Kisumu", interests: "Peace games", availability: "Evenings", status: "New", submittedAt: "2026-07-24" },
      { id: "a-4", fullName: "Mercy Wambui", email: "mercy.wambui@gmail.com", county: "Kiambu", interests: "Community outreach", availability: "Weekends", status: "Approved", submittedAt: "2026-07-20" },
      { id: "a-5", fullName: "Said Mohamed", email: "said.mohamed@gmail.com", county: "Mombasa", interests: "Peer education", availability: "Flexible", status: "New", submittedAt: "2026-07-20" },
    ],
    content: [
      { id: "c-1", title: "Students Speak Up: A dialogue on campus", type: "Event", date: "2026-08-08", excerpt: "An open circle for listening across lived experiences and ideas.", status: "Published", author: "Amina M." },
      { id: "c-2", title: "Three habits for safer online conversations", type: "News", date: "2026-07-24", excerpt: "A practical guide for responding without escalating a difficult moment.", status: "Published", author: "Brian M." },
      { id: "c-3", title: "Peace Tree planting day", type: "Event", date: "2026-08-17", excerpt: "Join the crew to turn a shared space into a lasting promise.", status: "Draft", author: "Amina M." },
      { id: "c-4", title: "Meet the new peer mediators", type: "News", date: "2026-07-18", excerpt: "Six young leaders are beginning their facilitation journey this term.", status: "Published", author: "Faith M." },
    ],
    materials: [
      { id: "m-1", title: "Peacebuilding foundations", category: "Core course", type: "Course", duration: "45 min", instructor: "KU Peace Hub", status: "Published", learners: 184 },
      { id: "m-2", title: "Facilitating difficult conversations", category: "Facilitation", type: "Video lesson", duration: "28 min", instructor: "Brian Mwangi", status: "Published", learners: 126 },
      { id: "m-3", title: "Civic participation without fear", category: "Civic learning", type: "Course", duration: "60 min", instructor: "Amina M.", status: "Draft", learners: 0 },
      { id: "m-4", title: "Listening practice: the pause", category: "Wellbeing", type: "Audio lesson", duration: "12 min", instructor: "Faith Muthoni", status: "Published", learners: 95 },
    ],
    resources: [
      { id: "r-1", title: "Community dialogue toolkit", category: "Facilitation", format: "PDF", size: "3.2 MB", description: "Printable guides for setting up a respectful dialogue circle.", status: "Published", downloads: 438 },
      { id: "r-2", title: "Peace club starter pack", category: "Community", format: "ZIP", size: "8.6 MB", description: "Templates, timelines and activity cards for new peace clubs.", status: "Published", downloads: 291 },
      { id: "r-3", title: "Conflict de-escalation worksheet", category: "Learning", format: "PDF", size: "1.1 MB", description: "A quick self-guided worksheet for slowing down a conflict.", status: "Draft", downloads: 0 },
      { id: "r-4", title: "Event planning checklist", category: "Operations", format: "DOCX", size: "720 KB", description: "A simple checklist for safe, welcoming community events.", status: "Published", downloads: 163 },
    ],
    games: [
      { id: "g-1", title: "Peace Bridge", description: "A choice-led story about rebuilding trust across three shared spaces.", audience: "13–25 years", status: "Published", plays: 1268, updated: "2026-07-22" },
      { id: "g-2", title: "PEACE HUB Cards", description: "Short scenario cards that help groups practise empathy and listening.", audience: "Facilitator groups", status: "Published", plays: 684, updated: "2026-07-18" },
      { id: "g-3", title: "The Ripple Challenge", description: "A cooperative micro-game about how small choices travel through a community.", audience: "13–18 years", status: "Draft", plays: 0, updated: "2026-07-12" },
    ],
    projects: [
      { id: "p-1", title: "Peace Tree project", description: "A living campus landmark that gathers commitments and local care around peace.", owner: "Amina M.", dueDate: "2026-08-30", progress: 74, status: "On track", updated: "2 hours ago" },
      { id: "p-2", title: "Peer mediator cohort", description: "Training and mentoring a new cohort of student peer mediators.", owner: "Brian M.", dueDate: "2026-09-15", progress: 48, status: "On track", updated: "Yesterday" },
      { id: "p-3", title: "County dialogue series", description: "A travelling dialogue series designed with youth organisers in five counties.", owner: "Faith M.", dueDate: "2026-10-10", progress: 29, status: "Planning", updated: "3 days ago" },
      { id: "p-4", title: "Digital peace library", description: "A plain-language library of ready-to-use learning resources and activity guides.", owner: "Jamal O.", dueDate: "2026-08-12", progress: 86, status: "On track", updated: "Today" },
    ],
    registrations: [
      { id: "r-1", fullName: "Njoki Kamau", email: "njoki.kamau@gmail.com", phone: "0712 345 678", eventTitle: "Students Speak Up: A dialogue on campus", notes: "Bringing two friends", status: "Confirmed", submittedAt: "2026-07-24" },
      { id: "r-2", fullName: "Peter Odhiambo", email: "peter.odhiambo@gmail.com", phone: "0722 111 222", eventTitle: "Peace Tree planting day", notes: "", status: "Pending", submittedAt: "2026-07-23" },
      { id: "r-3", fullName: "Grace Wanjiru", email: "grace.wanjiru@gmail.com", phone: "0733 444 555", eventTitle: "Students Speak Up: A dialogue on campus", notes: "Needs a wheelchair-accessible seat", status: "Pending", submittedAt: "2026-07-22" },
    ],
    quizzes: [
      { id: "q-1", title: "Peacebuilding foundations check", category: "Core course", description: "A short check-in after the foundations course.", status: "Published", questionsText: "What is the first step in de-escalating a conflict? | Listen first;Raise your voice;Walk away;Assign blame | 1\nWhich of these describes structural peace? | Fair systems and access;Quiet streets;Winning an argument;Avoiding people | 1" },
      { id: "q-2", title: "Facilitation basics", category: "Facilitation", description: "Checks understanding of running a respectful dialogue circle.", status: "Draft", questionsText: "" },
    ],
    initiatives: [
      { id: "i-1", title: "KU Peace Club — Main Campus", description: "Weekly peer dialogue circle open to all students.", category: "Peace club", county: "Nairobi", latitude: -1.1815, longitude: 36.9284, status: "Published" },
      { id: "i-2", title: "Peace Tree planting site", description: "Shared campus landmark that gathers community commitments.", category: "Peace Tree project", county: "Nairobi", latitude: -1.1804, longitude: 36.9273, status: "Published" },
      { id: "i-3", title: "County dialogue series — Kisumu leg", description: "Travelling dialogue series stop for youth organisers.", category: "Dialogue series", county: "Kisumu", latitude: -0.0917, longitude: 34.7679, status: "Draft" },
    ],
    activity: [
      { initials: "AK", name: "Achieng Kariuki", action: "submitted a volunteer application", time: "8m" },
      { initials: "BM", name: "Brian Mwangi", action: "published a learning activity", time: "42m" },
      { initials: "WN", name: "Wanjiku Njeri", action: "completed Peacebuilding foundations", time: "1h" },
      { initials: "FM", name: "Faith Muthoni", action: "updated Peer mediator cohort", time: "3h" },
    ],
    notifications: [
      { icon: "fa-regular fa-folder-open", text: "3 new volunteer applications need a first review.", time: "8 minutes ago" },
      { icon: "fa-solid fa-circle-check", text: "Peacebuilding foundations reached 180 completions.", time: "2 hours ago" },
      { icon: "fa-regular fa-calendar", text: "Students Speak Up begins in 12 days.", time: "Today" },
    ],
  };

  let state = loadState();
  let activeView = "overview";
  let activeModalContext = null;
  let filters = {};
  let modalInstance = null;
  let toastTimer = null;

  const shell = document.getElementById("adminShell");
  const sections = Object.fromEntries([...document.querySelectorAll(".admin-view")].map((section) => [section.dataset.view, section]));
  const modalEl = document.getElementById("adminModal");
  const modalForm = document.getElementById("adminModalForm");

  if (window.bootstrap && modalEl) modalInstance = new window.bootstrap.Modal(modalEl);

  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || typeof saved !== "object") return copy(defaultState);
      const fallback = copy(defaultState);
      Object.keys(fallback).forEach((key) => {
        if (saved[key] !== undefined) fallback[key] = saved[key];
      });
      return fallback;
    } catch (err) {
      return copy(defaultState);
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      showToast("Your changes could not be saved in this browser.", true);
    }
    updateNavCounts();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function initials(name) {
    return String(name || "PEACE HUB")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  function newId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function formatDate(value, options = { month: "short", day: "numeric", year: "numeric" }) {
    if (!value) return "—";
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("en", options).format(date);
  }

  function isoToday() {
    return new Date().toISOString().slice(0, 10);
  }

  function statusClass(status) {
    const normalised = String(status || "").trim().toLowerCase().replace(/\s+/g, "-");
    return `status-${normalised || "pending"}`;
  }

  function statusPill(status) {
    return `<span class="status-pill ${statusClass(status)}">${escapeHtml(status || "Pending")}</span>`;
  }

  function typePill(type) {
    return `<span class="type-pill">${escapeHtml(type || "Item")}</span>`;
  }

  function setHtml(view, markup) {
    if (sections[view]) sections[view].innerHTML = markup;
  }

  function showToast(message, isError = false) {
    const toast = document.getElementById("adminToast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.toggle("is-error", Boolean(isError));
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 3200);
  }

  function metricNumber(number) {
    return new Intl.NumberFormat("en", { notation: number > 9999 ? "compact" : "standard", maximumFractionDigits: 1 }).format(Number(number || 0));
  }

  function headerMarkup(eyebrow, title, description, actions = "") {
    return `<div class="view-heading">
      <div class="view-heading-copy">
        ${eyebrow ? `<p class="view-eyebrow">${escapeHtml(eyebrow)}</p>` : ""}
        <h1 id="${activeView}Heading">${escapeHtml(title)}</h1>
        ${description ? `<p>${escapeHtml(description)}</p>` : ""}
      </div>
      ${actions ? `<div class="view-heading-actions">${actions}</div>` : ""}
    </div>`;
  }

  function adminButton(label, action, entity, extra = "") {
    return `<button class="btn-admin-primary" type="button" data-action="${action}" data-entity="${entity || ""}" ${extra}><i class="fa-solid fa-plus"></i>${escapeHtml(label)}</button>`;
  }

  function chartMarkup(label = "Community engagement", simple = false) {
    return `<div class="chart-key"><span><i></i>${escapeHtml(label)}</span>${simple ? "" : "<span><i></i>Registrations</span>"}</div>
      <div class="impact-chart">
        <svg viewBox="0 0 640 205" role="img" aria-label="${escapeAttr(label)} trend over the past six months">
          <defs><linearGradient id="adminChartArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#a9cba8" stop-opacity=".72"/><stop offset="1" stop-color="#e9f3e8" stop-opacity=".12"/></linearGradient></defs>
          <line class="chart-grid-line" x1="32" y1="23" x2="622" y2="23"/><line class="chart-grid-line" x1="32" y1="71" x2="622" y2="71"/><line class="chart-grid-line" x1="32" y1="119" x2="622" y2="119"/><line class="chart-grid-line" x1="32" y1="167" x2="622" y2="167"/>
          <text class="chart-axis" x="0" y="27">2.0k</text><text class="chart-axis" x="0" y="75">1.5k</text><text class="chart-axis" x="0" y="123">1.0k</text><text class="chart-axis" x="7" y="171">500</text>
          <path class="chart-area" d="M38,145 C71,139 102,135 135,127 S199,115 233,121 S292,102 330,101 S390,87 430,92 S487,70 524,64 S575,47 614,40 L614,167 L38,167 Z"/>
          ${simple ? "" : '<path class="chart-line-alt" d="M38,158 C76,152 100,147 135,143 S190,138 233,132 S289,127 330,118 S394,111 430,105 S487,98 524,85 S579,75 614,70"/>'}
          <path class="chart-line" d="M38,145 C71,139 102,135 135,127 S199,115 233,121 S292,102 330,101 S390,87 430,92 S487,70 524,64 S575,47 614,40"/>
          <circle class="chart-dot" cx="614" cy="40" r="4.5"/>
          <rect class="chart-callout" x="563" y="9" width="62" height="23" rx="5"/><text class="chart-callout-text" x="574" y="24">2,112</text>
          <text class="chart-axis" x="33" y="192">Feb</text><text class="chart-axis" x="145" y="192">Mar</text><text class="chart-axis" x="257" y="192">Apr</text><text class="chart-axis" x="369" y="192">May</text><text class="chart-axis" x="481" y="192">Jun</text><text class="chart-axis" x="592" y="192">Jul</text>
        </svg>
      </div>`;
  }

  function renderOverview() {
    const upcoming = state.content.filter((item) => String(item.type).toLowerCase() === "event").sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(0, 3);
    const projectRows = state.projects.slice(0, 3);
    const pending = state.applications.filter((item) => ["New", "Reviewing"].includes(item.status)).length;
    const userName = getAdminName().split(" ")[0] || "there";
    const actions = `${adminButton("Create update", "new", "content")}`;
    setHtml("overview", `${headerMarkup("July 27, 2026", `Good morning, ${userName}.`, "Here is what is moving across the Peace Hub today.", actions)}
      <div class="metric-grid">
        ${metricCard("Community members", metricNumber(state.metrics.community), "fa-solid fa-users", "green", "+12%", "from last month")}
        ${metricCard("New registrations", metricNumber(state.metrics.registrations), "fa-regular fa-user", "blue", "+18%", "this term")}
        ${metricCard("Course completions", metricNumber(state.metrics.completions), "fa-solid fa-graduation-cap", "purple", "+9.4%", "this month")}
        ${metricCard("Pending reviews", pending, "fa-regular fa-folder-open", "orange", pending ? "Action needed" : "All caught up", pending ? "volunteer applications" : "no applications waiting", true)}
      </div>
      <div class="dashboard-grid">
        <div class="dashboard-stack">
          <article class="admin-card">
            <div class="card-head"><div><h2>Growing participation</h2><p>Visitors and registrations over the last six months</p></div><button class="text-button" type="button" data-view-target="analytics">See analytics <i class="fa-solid fa-arrow-right"></i></button></div>
            ${chartMarkup("Visitors")}
          </article>
          <article class="admin-card">
            <div class="card-head"><div><h2>Recent activity</h2><p>What the community is doing right now</p></div><button class="text-button" type="button" data-view-target="users">View people</button></div>
            <div class="activity-list">${state.activity.map((item, index) => `<div class="activity-row"><span class="activity-avatar" style="background:${["#759f85", "#7791b4", "#bd886b", "#927db0"][index % 4]}">${escapeHtml(item.initials)}</span><div class="activity-copy"><b>${escapeHtml(item.name)}</b> ${escapeHtml(item.action)}</div><span class="activity-time">${escapeHtml(item.time)}</span></div>`).join("")}</div>
          </article>
        </div>
        <div class="dashboard-stack">
          <article class="admin-card">
            <div class="card-head"><div><h2>Quick actions</h2><p>Keep important work moving</p></div></div>
            <div class="quick-actions">
              ${quickAction("Add person", "Invite a community member", "fa-solid fa-user-plus", "new", "users")}
              ${quickAction("Review applications", `${pending} waiting for a reply`, "fa-regular fa-folder-open", "go", "applications")}
              ${quickAction("Upload resource", "Share a downloadable guide", "fa-solid fa-arrow-up-from-bracket", "new", "resources")}
              ${quickAction("New project update", "Track a team milestone", "fa-solid fa-seedling", "new", "projects")}
            </div>
          </article>
          <article class="admin-card">
            <div class="card-head"><div><h2>Coming up</h2><p>Events on the calendar</p></div><button class="text-button" type="button" data-view-target="content">Manage</button></div>
            <div class="event-list">${upcoming.length ? upcoming.map(eventRow).join("") : '<div class="empty-state"><i class="fa-regular fa-calendar"></i><p>No upcoming events yet.</p></div>'}</div>
          </article>
          <article class="admin-card">
            <div class="card-head"><div><h2>Project pulse</h2><p>Progress on active work</p></div><button class="text-button" type="button" data-view-target="projects">View all</button></div>
            <div class="progress-summary">${projectRows.map(projectSummaryRow).join("")}</div>
          </article>
        </div>
      </div>`);
  }

  function metricCard(label, value, icon, color, trend, foot, warm = false) {
    return `<article class="metric-card"><div class="metric-card-top"><span class="metric-label">${escapeHtml(label)}</span><span class="metric-icon ${color}"><i class="${icon}"></i></span></div><div class="metric-value">${escapeHtml(value)}</div><div class="metric-foot"><span class="${warm ? "" : "trend-up"}">${warm ? "" : '<i class="fa-solid fa-arrow-trend-up"></i> '}${escapeHtml(trend)}</span><span>${escapeHtml(foot)}</span></div></article>`;
  }

  function quickAction(title, sub, icon, action, entity) {
    return `<button class="quick-action" type="button" data-action="${action}" data-entity="${entity}"><span><i class="${icon}"></i></span><span><b>${escapeHtml(title)}</b><small>${escapeHtml(sub)}</small></span></button>`;
  }

  function eventRow(item) {
    const date = new Date(`${item.date}T12:00:00`);
    const month = new Intl.DateTimeFormat("en", { month: "short" }).format(date);
    return `<button class="event-row" type="button" data-action="edit" data-entity="content" data-id="${escapeAttr(item.id)}"><span class="event-date"><small>${month}</small><strong>${date.getDate()}</strong></span><span class="event-copy"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.author || "Peace Hub")} · ${formatDate(item.date, { month: "short", day: "numeric" })}</span></span><i class="fa-solid fa-chevron-right"></i></button>`;
  }

  function projectSummaryRow(project) {
    return `<button class="project-summary-row" type="button" data-action="edit" data-entity="projects" data-id="${escapeAttr(project.id)}"><span class="project-summary-icon"><i class="fa-solid fa-seedling"></i></span><span class="project-summary-copy"><strong>${escapeHtml(project.title)}</strong><small><span class="mini-progress"><span style="width:${Math.max(0, Math.min(100, Number(project.progress) || 0))}%"></span></span></small></span><span class="project-summary-percent">${Number(project.progress) || 0}%</span></button>`;
  }

  function queryFor(view) {
    return String(filters[`${view}-query`] || "").trim().toLowerCase();
  }

  function filtered(view, rows, searchable) {
    const query = queryFor(view);
    const status = filters[`${view}-status`] || "All";
    return rows.filter((row) => {
      const matchesQuery = !query || searchable(row).toLowerCase().includes(query);
      const matchesStatus = status === "All" || String(row.status || "").toLowerCase() === status.toLowerCase();
      return matchesQuery && matchesStatus;
    });
  }

  function tableToolbar(view, totalLabel, hasStatus = true) {
    const query = escapeAttr(filters[`${view}-query`] || "");
    const status = filters[`${view}-status`] || "All";
    const statuses = ["All", "Active", "Pending", "Inactive", "New", "Reviewing", "Approved", "Declined", "Confirmed", "Attended", "Cancelled", "Published", "Draft", "On track", "Planning"];
    return `<div class="management-toolbar"><div class="toolbar-left"><span class="toolbar-meta" data-total="${view}">${escapeHtml(totalLabel)}</span></div><div class="toolbar-right"><label class="table-search"><i class="fa-solid fa-magnifying-glass"></i><input type="search" data-filter-query="${view}" value="${query}" placeholder="Search"></label>${hasStatus ? `<select class="filter-select" data-filter-status="${view}">${statuses.map((option) => `<option ${option === status ? "selected" : ""}>${option}</option>`).join("")}</select>` : ""}</div></div>`;
  }

  function renderUsers() {
    const rows = filtered("users", state.users, (item) => `${item.fullName} ${item.email} ${item.role} ${item.status}`);
    const actions = `${adminButton("Add person", "new", "users")}`;
    setHtml("users", `${headerMarkup("Community", "People", "Manage community members, volunteers, facilitators, and access roles.", actions)}
      <article class="management-card">${tableToolbar("users", `${state.metrics.community} community members`)}<div class="table-wrap"><table class="admin-table"><thead><tr><th>Person</th><th>Role</th><th>Status</th><th>Joined</th><th>Activity</th><th aria-label="Actions"></th></tr></thead><tbody>${rows.length ? rows.map((item, index) => `<tr><td><div class="row-primary"><span class="table-avatar ${index % 3 === 1 ? "alt" : index % 3 === 2 ? "gold" : ""}">${initials(item.fullName)}</span><span>${escapeHtml(item.fullName)}<small class="table-sub">${escapeHtml(item.email)}</small></span></div></td><td>${typePill(item.role)}</td><td>${statusPill(item.status)}</td><td><span class="mono-date">${formatDate(item.joined, { month: "short", day: "numeric", year: "numeric" })}</span></td><td>${escapeHtml(item.activity || "—")}</td><td><button class="table-action" type="button" data-action="edit" data-entity="users" data-id="${escapeAttr(item.id)}" aria-label="Edit ${escapeAttr(item.fullName)}"><i class="fa-solid fa-ellipsis"></i></button></td></tr>`).join("") : tableEmpty("No people match the filters.")}</tbody></table></div></article>`);
  }

  function renderApplications() {
    const rows = filtered("applications", state.applications, (item) => `${item.fullName} ${item.email} ${item.county} ${item.interests} ${item.status}`);
    const actions = `<button class="btn-admin-outline" type="button" data-action="export" data-entity="applications"><i class="fa-solid fa-arrow-down"></i>Export</button>${adminButton("Add application", "new", "applications")}`;
    setHtml("applications", `${headerMarkup("Volunteers", "Application review", "Read, discuss, and respond to the people who want to build peace with you.", actions)}
      <article class="management-card">${tableToolbar("applications", `${state.applications.length} applications`)}<div class="table-wrap"><table class="admin-table"><thead><tr><th>Applicant</th><th>County</th><th>Focus area</th><th>Submitted</th><th>Status</th><th aria-label="Actions"></th></tr></thead><tbody>${rows.length ? rows.map((item, index) => `<tr><td><div class="row-primary"><span class="table-avatar ${index % 2 ? "alt" : ""}">${initials(item.fullName)}</span><span>${escapeHtml(item.fullName)}<small class="table-sub">${escapeHtml(item.email)}</small></span></div></td><td>${escapeHtml(item.county || "—")}</td><td>${escapeHtml(item.interests || "—")}<small class="table-sub">${escapeHtml(item.availability || "Flexible")}</small></td><td><span class="mono-date">${formatDate(item.submittedAt, { month: "short", day: "numeric", year: "numeric" })}</span></td><td>${statusPill(item.status)}</td><td><div class="d-flex gap-1">${["New", "Reviewing"].includes(item.status) ? `<button class="table-action" type="button" data-action="approve" data-entity="applications" data-id="${escapeAttr(item.id)}" aria-label="Approve ${escapeAttr(item.fullName)}"><i class="fa-solid fa-check"></i></button><button class="table-action" type="button" data-action="decline" data-entity="applications" data-id="${escapeAttr(item.id)}" aria-label="Decline ${escapeAttr(item.fullName)}"><i class="fa-solid fa-xmark"></i></button>` : ""}<button class="table-action" type="button" data-action="edit" data-entity="applications" data-id="${escapeAttr(item.id)}" aria-label="Review ${escapeAttr(item.fullName)}"><i class="fa-solid fa-ellipsis"></i></button></div></td></tr>`).join("") : tableEmpty("No applications match the filters.")}</tbody></table></div></article>`);
  }

  function tableEmpty(message) {
    return `<tr><td colspan="10"><div class="empty-state"><i class="fa-regular fa-folder-open"></i><p>${escapeHtml(message)}</p></div></td></tr>`;
  }

  function renderContent() {
    const rows = filtered("content", state.content, (item) => `${item.title} ${item.type} ${item.excerpt} ${item.status}`);
    const actions = `${adminButton("Create update", "new", "content")}`;
    setHtml("content", `${headerMarkup("Publish", "News & events", "Plan what the community needs to know and publish it when it is ready.", actions)}
      <article class="management-card">${tableToolbar("content", `${state.content.length} published and draft updates`)}<div class="content-grid p-3">${rows.length ? rows.map((item) => contentCard(item, "content")).join("") : '<div class="empty-state"><i class="fa-regular fa-newspaper"></i><p>No updates match the filters.</p></div>'}</div></article>`);
  }

  function contentCard(item, entity) {
    const isEvent = String(item.type).toLowerCase() === "event";
    return `<article class="content-card"><button class="table-action content-card-menu" type="button" data-action="edit" data-entity="${entity}" data-id="${escapeAttr(item.id)}" aria-label="Edit ${escapeAttr(item.title)}"><i class="fa-solid fa-ellipsis"></i></button><span class="content-card-icon ${isEvent ? "event" : ""}"><i class="${isEvent ? "fa-regular fa-calendar" : "fa-regular fa-newspaper"}"></i></span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.excerpt || item.description || "No description yet.")}</p><div class="content-card-meta"><span>${typePill(item.type)}</span><span>${formatDate(item.date || item.updated, { month: "short", day: "numeric" })}</span></div><div class="d-flex align-items-center justify-content-between mt-3">${statusPill(item.status)}${item.status === "Draft" ? `<button class="text-button" type="button" data-action="publish" data-entity="${entity}" data-id="${escapeAttr(item.id)}">Publish</button>` : ""}</div></article>`;
  }

  function renderLearning() {
    const rows = filtered("learning", state.materials, (item) => `${item.title} ${item.category} ${item.type} ${item.status}`);
    const actions = `${adminButton("Add material", "new", "materials")}`;
    setHtml("learning", `${headerMarkup("Learning", "Learning hub", "Create and organise the practical learning that helps people build peace.", actions)}
      <article class="management-card">${tableToolbar("learning", `${state.materials.length} learning materials`)}<div class="content-grid p-3">${rows.length ? rows.map((item) => `<article class="content-card"><button class="table-action content-card-menu" type="button" data-action="edit" data-entity="materials" data-id="${escapeAttr(item.id)}" aria-label="Edit ${escapeAttr(item.title)}"><i class="fa-solid fa-ellipsis"></i></button><span class="content-card-icon"><i class="fa-solid fa-graduation-cap"></i></span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.category)} · ${escapeHtml(item.type)} · ${escapeHtml(item.duration || "Self-paced")}</p><div class="content-card-meta"><span>${Number(item.learners || 0)} learners</span><span>${escapeHtml(item.instructor || "Peace Hub")}</span></div><div class="d-flex align-items-center justify-content-between mt-3">${statusPill(item.status)}${item.status === "Draft" ? `<button class="text-button" type="button" data-action="publish" data-entity="materials" data-id="${escapeAttr(item.id)}">Publish</button>` : ""}</div></article>`).join("") : '<div class="empty-state"><i class="fa-solid fa-graduation-cap"></i><p>No materials match the filters.</p></div>'}</div></article>`);
  }

  function renderResources() {
    const rows = filtered("resources", state.resources, (item) => `${item.title} ${item.category} ${item.format} ${item.description} ${item.status}`);
    const actions = `${adminButton("Upload resource", "new", "resources")}`;
    setHtml("resources", `${headerMarkup("Library", "Downloadable resources", "Keep trusted, useful materials ready for every peacebuilding team.", actions)}
      <article class="management-card">${tableToolbar("resources", `${state.resources.length} downloadable resources`)}<div class="table-wrap"><table class="admin-table"><thead><tr><th>Resource</th><th>Category</th><th>File</th><th>Downloads</th><th>Status</th><th aria-label="Actions"></th></tr></thead><tbody>${rows.length ? rows.map((item, index) => `<tr><td><div class="row-primary"><span class="table-avatar ${index % 3 === 1 ? "alt" : index % 3 === 2 ? "gold" : ""}"><i class="fa-regular fa-file-lines"></i></span><span>${escapeHtml(item.title)}<small class="table-sub">${escapeHtml(item.description || "No description")}</small></span></div></td><td>${typePill(item.category)}</td><td><span class="mono-date">${escapeHtml(item.format || "FILE")} · ${escapeHtml(item.size || "—")}</span></td><td>${metricNumber(item.downloads || 0)}</td><td>${statusPill(item.status)}</td><td><button class="table-action" type="button" data-action="edit" data-entity="resources" data-id="${escapeAttr(item.id)}" aria-label="Edit ${escapeAttr(item.title)}"><i class="fa-solid fa-ellipsis"></i></button></td></tr>`).join("") : tableEmpty("No resources match the filters.")}</tbody></table></div></article>`);
  }

  function renderGames() {
    const rows = filtered("games", state.games, (item) => `${item.title} ${item.description} ${item.audience} ${item.status}`);
    const actions = `${adminButton("Create game", "new", "games")}`;
    setHtml("games", `${headerMarkup("Play", "Peace games", "Create playful ways for people to practise choices that build trust.", actions)}
      <article class="management-card">${tableToolbar("games", `${state.games.length} peace games`)}<div class="content-grid p-3">${rows.length ? rows.map((item) => `<article class="content-card"><button class="table-action content-card-menu" type="button" data-action="edit" data-entity="games" data-id="${escapeAttr(item.id)}" aria-label="Edit ${escapeAttr(item.title)}"><i class="fa-solid fa-ellipsis"></i></button><span class="content-card-icon resource"><i class="fa-solid fa-gamepad"></i></span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p><div class="content-card-meta"><span>${escapeHtml(item.audience || "All audiences")}</span><span>${metricNumber(item.plays || 0)} plays</span></div><div class="d-flex align-items-center justify-content-between mt-3">${statusPill(item.status)}${item.status === "Draft" ? `<button class="text-button" type="button" data-action="publish" data-entity="games" data-id="${escapeAttr(item.id)}">Publish</button>` : ""}</div></article>`).join("") : '<div class="empty-state"><i class="fa-solid fa-gamepad"></i><p>No games match the filters.</p></div>'}</div></article>`);
  }

  function renderProjects() {
    const rows = filtered("projects", state.projects, (item) => `${item.title} ${item.description} ${item.owner} ${item.status}`);
    const actions = `${adminButton("New project", "new", "projects")}`;
    setHtml("projects", `${headerMarkup("Impact", "Project progress", "Keep teams aligned around what they are building and the next visible milestone.", actions)}
      <div class="projects-grid">${rows.length ? rows.map((item) => `<article class="project-card"><div class="project-card-top"><div class="project-card-heading"><span class="project-card-icon"><i class="fa-solid fa-seedling"></i></span><h2>${escapeHtml(item.title)}<small>Led by ${escapeHtml(item.owner || "Peace Hub")}</small></h2></div><button class="table-action" type="button" data-action="edit" data-entity="projects" data-id="${escapeAttr(item.id)}" aria-label="Edit ${escapeAttr(item.title)}"><i class="fa-solid fa-ellipsis"></i></button></div><p>${escapeHtml(item.description)}</p><div class="project-detail-row"><span>Overall progress</span><strong>${Math.max(0, Math.min(100, Number(item.progress) || 0))}%</strong></div><div class="project-progress"><span style="width:${Math.max(0, Math.min(100, Number(item.progress) || 0))}%"></span></div><div class="project-foot">${statusPill(item.status)}<span>Due ${formatDate(item.dueDate, { month: "short", day: "numeric" })}</span></div></article>`).join("") : '<div class="empty-state"><i class="fa-solid fa-seedling"></i><p>No projects match the filters.</p></div>'}</div>`);
  }

  function renderRegistrations() {
    const rows = filtered("registrations", state.registrations, (item) => `${item.fullName} ${item.email} ${item.eventTitle} ${item.status}`);
    const actions = `${adminButton("Add registration", "new", "registrations")}`;
    setHtml("registrations", `${headerMarkup("Events", "Events & registration", "See who has signed up for each event and confirm or follow up.", actions)}
      <article class="management-card">${tableToolbar("registrations", `${state.registrations.length} registrations`)}<div class="table-wrap"><table class="admin-table"><thead><tr><th>Attendee</th><th>Event</th><th>Contact</th><th>Registered</th><th>Status</th><th aria-label="Actions"></th></tr></thead><tbody>${rows.length ? rows.map((item, index) => `<tr><td><div class="row-primary"><span class="table-avatar ${index % 3 === 1 ? "alt" : index % 3 === 2 ? "gold" : ""}">${initials(item.fullName)}</span><span>${escapeHtml(item.fullName)}</span></div></td><td>${escapeHtml(item.eventTitle || "—")}</td><td>${escapeHtml(item.email || "—")}<small class="table-sub">${escapeHtml(item.phone || "")}</small></td><td><span class="mono-date">${formatDate(item.submittedAt, { month: "short", day: "numeric", year: "numeric" })}</span></td><td>${statusPill(item.status)}</td><td><button class="table-action" type="button" data-action="edit" data-entity="registrations" data-id="${escapeAttr(item.id)}" aria-label="Edit ${escapeAttr(item.fullName)}"><i class="fa-solid fa-ellipsis"></i></button></td></tr>`).join("") : tableEmpty("No registrations match the filters.")}</tbody></table></div></article>`);
  }

  function parseQuestionsText(text) {
    return String(text || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [question = "", optionsPart = "", indexPart = ""] = line.split("|").map((part) => part.trim());
        const options = optionsPart.split(";").map((option) => option.trim()).filter(Boolean);
        const correctIndex = Math.max(0, (Number.parseInt(indexPart, 10) || 1) - 1);
        return { question, options, correctIndex };
      })
      .filter((item) => item.question && item.options.length >= 2);
  }

  function questionsToText(questions) {
    if (!Array.isArray(questions) || !questions.length) return "";
    return questions.map((item) => `${item.question} | ${(item.options || []).join(";")} | ${Number(item.correctIndex || 0) + 1}`).join("\n");
  }

  function renderQuizzes() {
    const rows = filtered("quizzes", state.quizzes, (item) => `${item.title} ${item.category} ${item.description} ${item.status}`);
    const actions = `${adminButton("Create quiz", "new", "quizzes")}`;
    setHtml("quizzes", `${headerMarkup("Learning", "Quizzes", "Check understanding after a course, workshop, or event.", actions)}
      <article class="management-card">${tableToolbar("quizzes", `${state.quizzes.length} quizzes`)}<div class="content-grid p-3">${rows.length ? rows.map((item) => {
        const count = (item.questions && item.questions.length) || parseQuestionsText(item.questionsText).length;
        return `<article class="content-card"><button class="table-action content-card-menu" type="button" data-action="edit" data-entity="quizzes" data-id="${escapeAttr(item.id)}" aria-label="Edit ${escapeAttr(item.title)}"><i class="fa-solid fa-ellipsis"></i></button><span class="content-card-icon"><i class="fa-solid fa-circle-question"></i></span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description || "No description yet.")}</p><div class="content-card-meta"><span>${escapeHtml(item.category || "General")}</span><span>${count} question${count === 1 ? "" : "s"}</span></div><div class="d-flex align-items-center justify-content-between mt-3">${statusPill(item.status)}${item.status === "Draft" ? `<button class="text-button" type="button" data-action="publish" data-entity="quizzes" data-id="${escapeAttr(item.id)}">Publish</button>` : ""}</div></article>`;
      }).join("") : '<div class="empty-state"><i class="fa-solid fa-circle-question"></i><p>No quizzes match the filters.</p></div>'}</div></article>`);
  }

  function renderInitiatives() {
    const rows = filtered("initiatives", state.initiatives, (item) => `${item.title} ${item.category} ${item.county} ${item.status}`);
    const actions = `${adminButton("Add initiative", "new", "initiatives")}`;
    setHtml("initiatives", `${headerMarkup("Impact", "Initiatives map", "Plot peace clubs, projects, and events so the community can find them nearby.", actions)}
      <article class="management-card">${tableToolbar("initiatives", `${state.initiatives.length} initiatives`)}<div class="table-wrap"><table class="admin-table"><thead><tr><th>Initiative</th><th>Category</th><th>County</th><th>Coordinates</th><th>Status</th><th aria-label="Actions"></th></tr></thead><tbody>${rows.length ? rows.map((item, index) => `<tr><td><div class="row-primary"><span class="table-avatar ${index % 3 === 1 ? "alt" : index % 3 === 2 ? "gold" : ""}"><i class="fa-solid fa-map-pin"></i></span><span>${escapeHtml(item.title)}<small class="table-sub">${escapeHtml(item.description || "No description")}</small></span></div></td><td>${typePill(item.category || "Initiative")}</td><td>${escapeHtml(item.county || "—")}</td><td><span class="mono-date">${item.latitude != null && item.latitude !== "" ? `${Number(item.latitude).toFixed(4)}, ${Number(item.longitude).toFixed(4)}` : "Not set"}</span></td><td>${statusPill(item.status)}</td><td><button class="table-action" type="button" data-action="edit" data-entity="initiatives" data-id="${escapeAttr(item.id)}" aria-label="Edit ${escapeAttr(item.title)}"><i class="fa-solid fa-ellipsis"></i></button></td></tr>`).join("") : tableEmpty("No initiatives match the filters.")}</tbody></table></div></article>`);
  }

  function renderAnalytics() {
    const completionRate = Math.round((Number(state.metrics.completions || 0) / Math.max(1, Number(state.metrics.registrations || 1))) * 100);
    setHtml("analytics", `${headerMarkup("Impact", "Analytics", "See where people are arriving, learning, and taking part in the work.", '<button class="btn-admin-outline" type="button" data-action="export" data-entity="analytics"><i class="fa-solid fa-arrow-down"></i>Export report</button>')}
      <div class="metric-grid">
        ${metricCard("Site visitors", metricNumber(state.metrics.visitors), "fa-solid fa-chart-line", "green", "+22.8%", "over the previous 30 days")}
        ${metricCard("Registrations", metricNumber(state.metrics.registrations), "fa-solid fa-user-plus", "blue", "+18%", "this term")}
        ${metricCard("Course completions", metricNumber(state.metrics.completions), "fa-solid fa-certificate", "purple", "+9.4%", "this month")}
        ${metricCard("Completion rate", `${completionRate}%`, "fa-solid fa-bullseye", "orange", "+3.1 pts", "compared with last term")}
      </div>
      <div class="analytics-feature"><article class="admin-card"><div class="card-head"><div><h2>Audience growth</h2><p>Visitors and registrations from February to July</p></div><button class="text-button" type="button" data-action="export" data-entity="analytics">Download CSV</button></div>${chartMarkup("Visitors")}</article><div class="analytics-kpis"><div class="analytics-kpi"><span class="analytics-kpi-icon"><i class="fa-solid fa-mobile-screen-button"></i></span><span><b>68% mobile visitors</b><small>Most people arrive on a phone</small></span></div><div class="analytics-kpi"><span class="analytics-kpi-icon"><i class="fa-solid fa-clock"></i></span><span><b>3m 42s average visit</b><small>42 seconds longer than June</small></span></div><div class="analytics-kpi"><span class="analytics-kpi-icon"><i class="fa-solid fa-location-dot"></i></span><span><b>18 counties reached</b><small>Nairobi remains the most active</small></span></div><div class="analytics-kpi"><span class="analytics-kpi-icon"><i class="fa-solid fa-arrow-right-arrow-left"></i></span><span><b>41% return visitors</b><small>A healthy core is coming back</small></span></div></div></div>
      <div class="analytics-bottom"><article class="admin-card"><div class="card-head"><div><h2>Top learning materials</h2><p>Completions and starts this month</p></div></div><div class="bar-chart">${[["Foundations", 88, "164"], ["Difficult conversations", 68, "126"], ["Listening practice", 52, "95"], ["Civic participation", 36, "67"]].map(([label, width, count]) => `<div class="bar-row"><span>${label}</span><span class="bar-track"><span style="width:${width}%"></span></span><b>${count}</b></div>`).join("")}</div></article><article class="admin-card"><div class="card-head"><div><h2>How people participate</h2><p>Across activities in the last 30 days</p></div></div><div class="donut-wrap"><div class="donut"><span class="donut-center">2.6k<small>actions</small></span></div><div class="donut-legend"><span><span><i></i>Learning</span><b>44%</b></span><span><span><i></i>Games</span><b>25%</b></span><span><span><i></i>Events</span><b>17%</b></span><span><span><i></i>Resources</span><b>14%</b></span></div></div></article></div>`);
  }

  function renderActiveView() {
    const renderers = { overview: renderOverview, users: renderUsers, applications: renderApplications, content: renderContent, registrations: renderRegistrations, learning: renderLearning, quizzes: renderQuizzes, resources: renderResources, games: renderGames, projects: renderProjects, initiatives: renderInitiatives, analytics: renderAnalytics };
    renderers[activeView]();
    document.getElementById("headerTitle").textContent = viewNames[activeView] || "Overview";
  }

  function setView(view) {
    if (!sections[view]) return;
    activeView = view;
    Object.entries(sections).forEach(([name, section]) => section.classList.toggle("is-active", name === view));
    document.querySelectorAll(".admin-nav-link").forEach((button) => button.classList.toggle("is-active", button.dataset.viewTarget === view));
    renderActiveView();
    closeSidebar();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateNavCounts() {
    const users = document.querySelector('[data-count="users"]');
    const applications = document.querySelector('[data-count="applications"]');
    const registrations = document.querySelector('[data-count="registrations"]');
    if (users) users.textContent = metricNumber(state.metrics.community || state.users.length);
    if (applications) applications.textContent = state.applications.filter((item) => ["New", "Reviewing"].includes(item.status)).length;
    if (registrations) registrations.textContent = state.registrations.filter((item) => item.status === "Pending").length;
  }

  function getAdminName() {
    try {
      const user = JSON.parse(localStorage.getItem("cg_user"));
      return user?.name || user?.email?.split("@")[0] || "Amina M.";
    } catch (err) {
      return "Amina M.";
    }
  }

  function refreshProfile() {
    const name = getAdminName();
    const shortName = initials(name);
    document.getElementById("profileName").textContent = name;
    document.getElementById("profileInitials").textContent = shortName;
    document.getElementById("headerProfile").textContent = shortName;
  }

  function entityItems(entity) {
    if (entity === "materials") return state.materials;
    return state[entity];
  }

  function findEntity(entity, id) {
    return (entityItems(entity) || []).find((item) => String(item.id) === String(id));
  }

  function fieldsFor(entity, item = {}) {
    const input = (name, label, type = "text", extra = "") => `<div class="col-md-6"><label class="form-label" for="field-${name}">${label}</label><input class="form-control" id="field-${name}" name="${name}" type="${type}" value="${escapeAttr(item[name] ?? "")}" ${extra}></div>`;
    const select = (name, label, options) => `<div class="col-md-6"><label class="form-label" for="field-${name}">${label}</label><select class="form-select" id="field-${name}" name="${name}">${options.map((option) => `<option value="${escapeAttr(option)}" ${String(item[name] ?? "") === String(option) ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select></div>`;
    const textarea = (name, label, placeholder = "") => `<div class="col-12"><label class="form-label" for="field-${name}">${label}</label><textarea class="form-control" id="field-${name}" name="${name}" placeholder="${escapeAttr(placeholder)}">${escapeHtml(item[name] ?? "")}</textarea></div>`;

    if (entity === "users") return `<div class="row g-3">${input("fullName", "Full name", "text", "required")}${input("email", "Email address", "email", "required")}${select("role", "Role", ["Learner", "Volunteer", "Facilitator", "Administrator"])}${select("status", "Access status", ["Active", "Pending", "Inactive"])}${input("joined", "Joined date", "date")}${input("activity", "Activity summary", "text", "placeholder=\"e.g. 4 courses\"")}</div>`;
    if (entity === "applications") return `<div class="row g-3">${input("fullName", "Applicant name", "text", "required")}${input("email", "Email address", "email", "required")}${input("county", "County")}${select("availability", "Availability", ["Flexible", "Weekends", "Weekdays", "Mornings", "Afternoons", "Evenings"])}${textarea("interests", "Peacebuilding interests", "What do they hope to contribute?")}${select("status", "Review status", ["New", "Reviewing", "Approved", "Declined"])}${input("submittedAt", "Submission date", "date")}</div>`;
    if (entity === "content") return `<div class="row g-3">${input("title", "Headline", "text", "required")}${select("type", "Content type", ["News", "Event"])}${input("date", "Publish or event date", "date", "required")}${select("status", "Publication status", ["Draft", "Published"])}${textarea("excerpt", "Short summary", "What should the community know?")}${input("author", "Author", "text", `placeholder="${escapeAttr(getAdminName())}"`)}</div>`;
    if (entity === "materials") return `<div class="row g-3">${input("title", "Material title", "text", "required")}${select("type", "Material type", ["Course", "Video lesson", "Audio lesson", "Guide"])}${input("category", "Learning category", "text", "required")}${input("duration", "Estimated duration", "text", "placeholder=\"e.g. 45 min\"")}${input("instructor", "Facilitator / author")}${select("status", "Publication status", ["Draft", "Published"])}${input("learners", "Current learners", "number", "min=0")}<div class="col-12"><label class="form-label">Upload learning file <span class="text-muted fw-normal">(optional)</span></label><label class="file-drop" for="materialFile"><span><i class="fa-solid fa-cloud-arrow-up"></i><b>Choose a course file or learning asset</b><small>Attach a PDF, slide deck, audio or video file to this material</small></span><input id="materialFile" name="materialFile" type="file"></label><p class="form-note">The dashboard records the selected file details. Connect managed file storage before publishing uploaded files publicly.</p></div></div>`;
    if (entity === "resources") return `<div class="row g-3">${input("title", "Resource title", "text", "required")}${input("category", "Category", "text", "required")}${select("status", "Publication status", ["Draft", "Published"])}${input("downloads", "Current downloads", "number", "min=0")}${textarea("description", "What is this resource for?", "Briefly explain how people can use it.")}<div class="col-12"><label class="form-label">Attach a file <span class="text-muted fw-normal">(optional)</span></label><label class="file-drop" for="resourceFile"><span><i class="fa-solid fa-cloud-arrow-up"></i><b>Choose a new file to attach</b><small>PDF, DOCX, ZIP, PPTX and similar files are supported</small></span><input id="resourceFile" name="resourceFile" type="file"></label><p class="form-note">Requires a connected admin key (see the profile menu) — the file uploads for real and becomes downloadable on the public site once published.</p></div></div>`;
    if (entity === "games") return `<div class="row g-3">${input("title", "Game title", "text", "required")}${input("audience", "Audience", "text", "placeholder=\"e.g. 13–25 years\"")}${select("status", "Publication status", ["Draft", "Published"])}${input("plays", "Current plays", "number", "min=0")}${textarea("description", "Game description", "How does this game help people practise peacebuilding?")}</div>`;
    if (entity === "projects") return `<div class="row g-3">${input("title", "Project name", "text", "required")}${input("owner", "Project lead", "text", "required")}${input("dueDate", "Target date", "date")}${select("status", "Project status", ["Planning", "On track", "Paused", "Complete"])}<div class="col-md-6"><label class="form-label" for="field-progress">Overall progress <span id="progressValue">${Number(item.progress || 0)}%</span></label><input class="form-range" id="field-progress" name="progress" type="range" min="0" max="100" value="${Number(item.progress || 0)}"></div>${textarea("description", "Project description", "What is the project moving toward?")}</div>`;
    if (entity === "registrations") return `<div class="row g-3">${input("fullName", "Attendee name", "text", "required")}${input("email", "Email address", "email")}${input("phone", "Phone number", "tel")}${input("eventTitle", "Event", "text", "required placeholder=\"Which event is this for?\"")}${select("status", "Registration status", ["Pending", "Confirmed", "Attended", "Cancelled"])}${input("submittedAt", "Registered on", "date")}${textarea("notes", "Notes", "Accessibility needs, guests, or anything else to flag")}</div>`;
    if (entity === "quizzes") return `<div class="row g-3">${input("title", "Quiz title", "text", "required")}${input("category", "Learning category", "text")}${select("status", "Publication status", ["Draft", "Published"])}${textarea("description", "Quiz description", "What does this quiz check understanding of?")}<div class="col-12"><label class="form-label" for="field-questionsText">Questions</label><textarea class="form-control" id="field-questionsText" name="questionsText" rows="6" placeholder="One question per line, in this format:&#10;Question text | option one;option two;option three | correct option number (starting at 1)">${escapeHtml(item.questionsText ?? "")}</textarea><p class="form-note">Example: What builds trust fastest? | Listening;Interrupting;Ignoring | 1</p></div></div>`;
    if (entity === "initiatives") return `<div class="row g-3">${input("title", "Initiative name", "text", "required")}${input("category", "Category", "text", "placeholder=\"e.g. Peace club, Dialogue series\"")}${input("county", "County")}${select("status", "Publication status", ["Draft", "Published"])}${input("latitude", "Latitude", "number", "step=\"any\" placeholder=\"e.g. -1.1815\"")}${input("longitude", "Longitude", "number", "step=\"any\" placeholder=\"e.g. 36.9284\"")}${textarea("description", "Description", "What is happening at this location?")}</div>`;
    return "";
  }

  function openModal(entity, id) {
    const existing = id ? findEntity(entity, id) : null;
    const item = existing ? copy(existing) : defaultEntity(entity);
    activeModalContext = { entity, id: existing?.id || null };
    document.getElementById("adminModalKicker").textContent = existing ? `Edit ${entityNames[entity] || "item"}` : `New ${entityNames[entity] || "item"}`;
    document.getElementById("adminModalTitle").textContent = existing ? `Edit ${item.title || item.fullName || "item"}` : `Add ${entityNames[entity] || "item"}`;
    document.getElementById("adminModalBody").innerHTML = fieldsFor(entity, item);
    document.getElementById("adminModalSubmit").textContent = existing ? "Save changes" : `Add ${entityNames[entity] || "item"}`;
    if (modalInstance) modalInstance.show();
    else modalEl.classList.add("show");
  }

  function defaultEntity(entity) {
    const today = isoToday();
    if (entity === "users") return { fullName: "", email: "", role: "Learner", status: "Active", joined: today, activity: "New member" };
    if (entity === "applications") return { fullName: "", email: "", county: "", interests: "", availability: "Flexible", status: "New", submittedAt: today };
    if (entity === "content") return { title: "", type: "News", date: today, excerpt: "", status: "Draft", author: getAdminName() };
    if (entity === "materials") return { title: "", category: "", type: "Course", duration: "", instructor: getAdminName(), status: "Draft", learners: 0 };
    if (entity === "resources") return { title: "", category: "", description: "", format: "FILE", size: "—", status: "Draft", downloads: 0 };
    if (entity === "games") return { title: "", audience: "13–25 years", description: "", status: "Draft", plays: 0, updated: today };
    if (entity === "projects") return { title: "", owner: getAdminName(), dueDate: today, description: "", progress: 0, status: "Planning", updated: "Just now" };
    if (entity === "registrations") return { fullName: "", email: "", phone: "", eventTitle: "", notes: "", status: "Pending", submittedAt: today };
    if (entity === "quizzes") return { title: "", category: "", description: "", status: "Draft", questionsText: "" };
    if (entity === "initiatives") return { title: "", category: "", county: "", latitude: "", longitude: "", description: "", status: "Draft" };
    return {};
  }

  function formDataToObject(form) {
    const data = {};
    new FormData(form).forEach((value, key) => {
      if (key !== "resourceFile") data[key] = typeof value === "string" ? value.trim() : value;
    });
    return data;
  }

  function validateEntity(entity, data) {
    const required = { users: ["fullName", "email"], applications: ["fullName", "email"], content: ["title", "date"], materials: ["title", "category"], resources: ["title", "category"], games: ["title"], projects: ["title", "owner"], registrations: ["fullName", "eventTitle"], quizzes: ["title"], initiatives: ["title"] }[entity] || [];
    const missing = required.find((field) => !data[field]);
    if (missing) return "Please complete the required fields.";
    if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) return "Please enter a valid email address.";
    return null;
  }

  function collectionName(entity) {
    return entity === "materials" ? "materials" : entity;
  }

  function upsertEntity(entity, data, id) {
    const collection = entityItems(entity);
    if (!Array.isArray(collection)) return null;
    if (entity === "materials") data.learners = Number(data.learners || 0);
    if (entity === "resources") data.downloads = Number(data.downloads || 0);
    if (entity === "games") data.plays = Number(data.plays || 0);
    if (entity === "projects") data.progress = Number(data.progress || 0);
    if (id) {
      const index = collection.findIndex((item) => String(item.id) === String(id));
      if (index > -1) collection[index] = { ...collection[index], ...data };
      return collection[index];
    }
    const prefix = entity.slice(0, 1);
    const item = { id: newId(prefix), ...data };
    collection.unshift(item);
    if (entity === "users") state.metrics.community = Number(state.metrics.community || 0) + 1;
    if (entity === "applications") state.activity.unshift({ initials: initials(item.fullName), name: item.fullName, action: "submitted a volunteer application", time: "now" });
    return item;
  }

  async function submitModal(event) {
    event.preventDefault();
    if (!activeModalContext) return;
    const { entity, id } = activeModalContext;
    const data = formDataToObject(modalForm);
    const error = validateEntity(entity, data);
    if (error) {
      showToast(error, true);
      return;
    }
    if (entity === "resources") {
      const file = modalForm.querySelector("input[name=resourceFile]")?.files?.[0];
      if (file) {
        data.format = (file.name.split(".").pop() || "FILE").toUpperCase();
        data.size = readableBytes(file.size);
      }
    }
    if (entity === "materials") {
      const file = modalForm.querySelector("input[name=materialFile]")?.files?.[0];
      if (file) {
        data.fileName = file.name;
        data.fileSize = readableBytes(file.size);
      }
    }
    if (entity === "games") data.updated = isoToday();
    if (entity === "projects") data.updated = "Just now";
    const item = upsertEntity(entity, data, id);
    persist();
    renderActiveView();
    if (modalInstance) modalInstance.hide();
    if (entity === "resources") {
      const file = modalForm.querySelector("input[name=resourceFile]")?.files?.[0] || null;
      syncResourceWithFile(item, file, Boolean(id));
    } else {
      syncEntity(entity, item, Boolean(id));
    }
    showToast(`${id ? "Saved" : "Added"} ${entityNames[entity] || "item"}.`);
  }

  // Resources get their own sync path (rather than the generic JSON
  // syncEntity used by every other entity) because an attached file needs
  // to travel as multipart/form-data, not JSON — the file's actual bytes,
  // not just its name and size, so real downloads work on the public site.
  async function syncResourceWithFile(item, file, isUpdate) {
    const adminKey = localStorage.getItem(ADMIN_KEY_STORAGE);
    if (!adminKey) return;

    const formData = new FormData();
    formData.append("title", item.title || "");
    formData.append("description", item.description || "");
    formData.append("category", item.category || "");
    formData.append("status", String(item.status || "Draft").toLowerCase());
    if (file) formData.append("file", file);

    const url = isUpdate ? `/api/admin/resources/${encodeURIComponent(item.id)}` : "/api/admin/resources";

    try {
      const response = await fetch(url, {
        method: isUpdate ? "PATCH" : "POST",
        headers: { "x-admin-key": adminKey },
        body: formData,
      });
      if (!response.ok) return;
      const payload = await response.json();
      const serverItem = payload?.item || payload?.data;
      if (!serverItem) return;

      const collection = entityItems("resources");
      const index = Array.isArray(collection) ? collection.findIndex((c) => String(c.id) === String(item.id)) : -1;
      if (index > -1) {
        collection[index] = { ...collection[index], ...normaliseServerItem(serverItem, "resources") };
        persist();
        renderActiveView();
      }
    } catch (err) {
      // Local preview still stands even if the live sync failed.
    }
  }

  function readableBytes(bytes) {
    if (!Number(bytes)) return "—";
    const units = ["B", "KB", "MB", "GB"];
    const level = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, level)).toFixed(level ? 1 : 0)} ${units[level]}`;
  }

  function removeEntity(entity, id) {
    const collection = entityItems(entity);
    if (!Array.isArray(collection)) return;
    const index = collection.findIndex((item) => String(item.id) === String(id));
    if (index < 0) return;
    const item = collection[index];
    if (!window.confirm(`Remove ${item.title || item.fullName || "this item"}? This can’t be undone from the dashboard.`)) return;
    collection.splice(index, 1);
    if (entity === "users") state.metrics.community = Math.max(0, Number(state.metrics.community || 0) - 1);
    persist();
    renderActiveView();
    syncDelete(entity, item.id);
    showToast("Item removed.");
  }

  function setApplicationStatus(id, status) {
    const item = findEntity("applications", id);
    if (!item) return;
    item.status = status;
    persist();
    renderActiveView();
    syncEntity("applications", item, true);
    showToast(`${item.fullName}'s application was ${status.toLowerCase()}.`);
  }

  function publishEntity(entity, id) {
    const item = findEntity(entity, id);
    if (!item) return;
    item.status = "Published";
    persist();
    renderActiveView();
    syncEntity(entity, item, true);
    showToast(`${item.title || "Item"} is now published.`);
  }

  function downloadExport(entity) {
    let rows = [];
    if (entity === "analytics") {
      rows = Object.entries(state.metrics).map(([metric, value]) => ({ metric, value }));
    } else {
      rows = copy(entityItems(entity) || []);
    }
    if (!rows.length) {
      showToast("There is nothing to export yet.", true);
      return;
    }
    const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const csv = [keys.join(","), ...rows.map((row) => keys.map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `common-ground-${entity}-${isoToday()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast("Your CSV export is ready.");
  }

  function togglePopover(id, anchor) {
    const popover = document.getElementById(id);
    if (!popover) return;
    const otherId = id === "notificationsPopover" ? "profilePopover" : "notificationsPopover";
    document.getElementById(otherId)?.setAttribute("hidden", "");
    const wasHidden = popover.hasAttribute("hidden");
    if (wasHidden) {
      popover.removeAttribute("hidden");
      if (id === "notificationsPopover") renderNotifications();
    } else {
      popover.setAttribute("hidden", "");
    }
    if (anchor) anchor.setAttribute("aria-expanded", String(wasHidden));
  }

  function renderNotifications() {
    const list = document.getElementById("notificationList");
    if (!list) return;
    list.innerHTML = state.notifications.length ? state.notifications.map((item) => `<div class="notification-row"><span class="notification-dot"><i class="${escapeAttr(item.icon)}"></i></span><span><p>${escapeHtml(item.text)}</p><time>${escapeHtml(item.time)}</time></span></div>`).join("") : '<div class="empty-state"><i class="fa-regular fa-bell"></i><p>You are all caught up.</p></div>';
  }

  function markNotificationsRead() {
    state.notifications = [];
    persist();
    renderNotifications();
    document.querySelector(".notification-button span")?.remove();
    showToast("Notifications marked as read.");
  }

  function closeSidebar() {
    shell.classList.remove("sidebar-open");
  }

  function openSidebar() {
    shell.classList.add("sidebar-open");
  }

  async function apiRequest(url, options = {}) {
    const adminKey = localStorage.getItem(ADMIN_KEY_STORAGE);
    if (!adminKey || !window.fetch) return null;
    try {
      const response = await fetch(url, {
        ...options,
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey, ...(options.headers || {}) },
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      return null;
    }
  }

  async function hydrateServerData() {
    const payload = await apiRequest("/api/admin/dashboard");
    if (!payload) return false;
    const incoming = payload.data || payload.dashboard || payload;
    const collections = incoming.recent || incoming.collections || incoming;
    const map = { users: "users", volunteers: "applications", content: "content", materials: "materials", resources: "resources", games: "games", projects: "projects", registrations: "registrations", quizzes: "quizzes", initiatives: "initiatives" };
    Object.entries(map).forEach(([serverName, clientName]) => {
      const rows = collections[serverName];
      // Starter cards from the API are helpful for a newly created database,
      // but the richer local workspace sample remains a better first-run view.
      if (Array.isArray(rows) && rows.length && !rows.every((item) => item.isStarter)) state[clientName] = rows.map((item) => normaliseServerItem(item, clientName));
    });
    if (incoming.metrics && typeof incoming.metrics === "object") {
      const metrics = incoming.metrics;
      state.metrics = {
        ...state.metrics,
        community: Number.isFinite(Number(metrics.users)) ? Number(metrics.users) : state.metrics.community,
        registrations: Number.isFinite(Number(metrics.registrations)) ? Number(metrics.registrations) : state.metrics.registrations,
        completions: Number.isFinite(Number(metrics.courseCompletions)) ? Number(metrics.courseCompletions) : state.metrics.completions,
      };
    }
    persist();
    renderActiveView();
    return true;
  }

  function normaliseServerItem(item, collection) {
    const normalised = { ...item };
    if (item.name && !normalised.fullName) normalised.fullName = item.name;
    if (item.createdAt && !normalised.submittedAt) normalised.submittedAt = String(item.createdAt).slice(0, 10);
    if (item.created_at && !normalised.submittedAt) normalised.submittedAt = String(item.created_at).slice(0, 10);
    if (item.due_date && !normalised.dueDate) normalised.dueDate = String(item.due_date).slice(0, 10);
    if (item.updated_at && !normalised.updated) normalised.updated = String(item.updated_at).slice(0, 10);
    if (collection === "users") {
      normalised.fullName = normalised.fullName || normalised.email || "Community member";
      normalised.role = ({ member: "Learner", volunteer: "Volunteer", editor: "Facilitator", admin: "Administrator" })[String(normalised.role).toLowerCase()] || normalised.role || "Learner";
      normalised.status = ({ active: "Active", suspended: "Inactive" })[String(normalised.status).toLowerCase()] || normalised.status || "Active";
      normalised.joined = String(item.createdAt || item.created_at || isoToday()).slice(0, 10);
      normalised.activity = normalised.activity || "Community account";
    }
    if (collection === "applications") {
      normalised.fullName = normalised.fullName || "Volunteer applicant";
      normalised.interests = Array.isArray(normalised.interests) ? normalised.interests.join(", ") : normalised.interests || "—";
      normalised.status = ({ pending: "New", reviewed: "Reviewing", approved: "Approved", declined: "Declined" })[String(normalised.status).toLowerCase()] || normalised.status || "New";
    }
    if (collection === "content") {
      normalised.type = String(normalised.type || "News").replace(/^./, (char) => char.toUpperCase());
      normalised.excerpt = normalised.excerpt || normalised.summary || "";
      normalised.date = String(normalised.eventAt || normalised.publishedAt || normalised.createdAt || isoToday()).slice(0, 10);
      normalised.status = String(normalised.status || "Draft").replace(/^./, (char) => char.toUpperCase());
      normalised.author = normalised.author || "Peace Hub";
    }
    if (collection === "materials") {
      normalised.type = normalised.type || normalised.format || "Learning material";
      normalised.duration = normalised.duration || "Self-paced";
      normalised.instructor = normalised.instructor || "Peace Hub";
      normalised.learners = Number(normalised.learners || 0);
      normalised.status = String(normalised.status || "Draft").replace(/^./, (char) => char.toUpperCase());
    }
    if (collection === "resources") {
      normalised.format = normalised.format || normalised.fileType || (normalised.fileName ? normalised.fileName.split(".").pop().toUpperCase() : "FILE");
      normalised.size = normalised.size || "—";
      normalised.downloads = Number(normalised.downloads || 0);
      normalised.status = String(normalised.status || "Draft").replace(/^./, (char) => char.toUpperCase());
    }
    if (collection === "games") {
      normalised.audience = normalised.audience || "All audiences";
      normalised.plays = Number(normalised.plays || 0);
      normalised.updated = String(normalised.updated || normalised.updatedAt || normalised.createdAt || isoToday()).slice(0, 10);
      normalised.status = String(normalised.status || "Draft").replace(/^./, (char) => char.toUpperCase());
    }
    if (collection === "projects") {
      normalised.status = ({ active: "On track", planning: "Planning", on_hold: "Paused", completed: "Complete" })[String(normalised.status).toLowerCase()] || normalised.status || "Planning";
      normalised.progress = Number(normalised.progress || 0);
      normalised.owner = normalised.owner || "Peace Hub";
      normalised.dueDate = String(normalised.dueDate || normalised.due_date || isoToday()).slice(0, 10);
    }
    if (collection === "registrations") {
      normalised.fullName = normalised.fullName || normalised.name || "Attendee";
      normalised.status = ({ pending: "Pending", confirmed: "Confirmed", attended: "Attended", cancelled: "Cancelled" })[String(normalised.status).toLowerCase()] || normalised.status || "Pending";
      normalised.submittedAt = String(item.submittedAt || item.createdAt || isoToday()).slice(0, 10);
    }
    if (collection === "quizzes") {
      normalised.category = normalised.category || "General";
      normalised.questionsText = questionsToText(normalised.questions);
      normalised.status = String(normalised.status || "Draft").replace(/^./, (char) => char.toUpperCase());
    }
    if (collection === "initiatives") {
      normalised.category = normalised.category || "Initiative";
      normalised.status = String(normalised.status || "Draft").replace(/^./, (char) => char.toUpperCase());
    }
    return normalised;
  }

  function serverPayloadFor(entity, item) {
    if (entity === "users") return { name: item.fullName, role: ({ Learner: "member", Volunteer: "volunteer", Facilitator: "editor", Administrator: "admin" })[item.role] || "member", status: item.status === "Active" ? "active" : "suspended" };
    if (entity === "applications") return { name: item.fullName, email: item.email, county: item.county, interests: item.interests, availability: item.availability, status: ({ New: "pending", Reviewing: "reviewed", Approved: "approved", Declined: "declined" })[item.status] || "pending", submittedAt: item.submittedAt };
    if (entity === "content") return { type: String(item.type || "News").toLowerCase(), title: item.title, summary: item.excerpt, status: String(item.status || "Draft").toLowerCase(), eventAt: item.type === "Event" ? item.date : "", publishedAt: item.type === "News" && item.status === "Published" ? item.date : "" };
    if (entity === "materials") return { title: item.title, description: item.description || item.category, format: item.type, category: item.category, status: String(item.status || "Draft").toLowerCase() };
    if (entity === "resources") return { title: item.title, description: item.description, category: item.category, fileName: item.title, fileType: item.format, status: String(item.status || "Draft").toLowerCase() };
    if (entity === "games") return { title: item.title, description: item.description, status: String(item.status || "Draft").toLowerCase() };
    if (entity === "projects") return { title: item.title, description: item.description, owner: item.owner, dueDate: item.dueDate, progress: item.progress, status: ({ "On track": "active", Planning: "planning", Paused: "on_hold", Complete: "completed" })[item.status] || "planning" };
    if (entity === "registrations") return { name: item.fullName, email: item.email, phone: item.phone, eventTitle: item.eventTitle, notes: item.notes, status: String(item.status || "Pending").toLowerCase(), submittedAt: item.submittedAt };
    if (entity === "quizzes") return { title: item.title, description: item.description, category: item.category, questions: parseQuestionsText(item.questionsText), status: String(item.status || "Draft").toLowerCase() };
    if (entity === "initiatives") return { title: item.title, description: item.description, category: item.category, county: item.county, latitude: item.latitude === "" ? null : item.latitude, longitude: item.longitude === "" ? null : item.longitude, status: String(item.status || "Draft").toLowerCase() };
    return item;
  }

  async function syncEntity(entity, item, isUpdate) {
    const endpoint = entity === "users" ? "users" : endpointByEntity[entity];
    if (!endpoint || !item || (item.isStarter && isUpdate)) return;
    const url = isUpdate ? `/api/admin/${endpoint}/${encodeURIComponent(item.id)}` : `/api/admin/${endpoint}`;
    const response = await apiRequest(url, { method: isUpdate ? "PATCH" : "POST", body: JSON.stringify(serverPayloadFor(entity, item)) });
    if (response?.item || response?.data) {
      const serverItem = response.item || response.data;
      const collection = entityItems(entity);
      const index = Array.isArray(collection) ? collection.findIndex((candidate) => String(candidate.id) === String(item.id)) : -1;
      if (index > -1 && serverItem && typeof serverItem === "object") {
        collection[index] = { ...collection[index], ...normaliseServerItem(serverItem, entity) };
      }
      persist();
      renderActiveView();
    }
  }

  async function syncDelete(entity, id) {
    const endpoint = entity === "users" ? "users" : endpointByEntity[entity];
    if (!endpoint) return;
    await apiRequest(`/api/admin/${endpoint}/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  function connectAdminData() {
    const existing = localStorage.getItem(ADMIN_KEY_STORAGE) || "";
    const value = window.prompt("Enter the administrator access key to connect live workspace data.", existing);
    if (value === null) return;
    if (!value.trim()) {
      localStorage.removeItem(ADMIN_KEY_STORAGE);
      showToast("Live data connection removed. You are viewing the workspace preview.");
      return;
    }
    localStorage.setItem(ADMIN_KEY_STORAGE, value.trim());
    hydrateServerData().then((connected) => showToast(connected ? "Connected to secure workspace data." : "The access key could not connect to live data. You can still use the workspace preview.", !connected)).catch(() => showToast("The access key could not connect to live data. You can still use the workspace preview.", true));
  }

  function handleClick(event) {
    const target = event.target.closest("button, [data-view-target]");
    if (!target) return;
    const view = target.dataset.viewTarget;
    if (view) {
      setView(view);
      document.getElementById("notificationsPopover")?.setAttribute("hidden", "");
      return;
    }
    const action = target.dataset.action;
    if (!action) return;
    const entity = target.dataset.entity;
    const id = target.dataset.id;
    if (action === "new") openModal(entity);
    if (action === "edit") openModal(entity, id);
    if (action === "delete") removeEntity(entity, id);
    if (action === "approve") setApplicationStatus(id, "Approved");
    if (action === "decline") setApplicationStatus(id, "Declined");
    if (action === "publish") publishEntity(entity, id);
    if (action === "export") downloadExport(entity);
    if (action === "go") setView(entity);
    if (action === "mark-notifications") markNotificationsRead();
    if (action === "connect-admin") connectAdminData();
    if (action === "account-settings") showToast("Account settings are ready to connect to your organisation’s identity provider.");
    if (action === "sign-out") {
      localStorage.removeItem("cg_token");
      localStorage.removeItem("cg_user");
      window.location.href = "login.html";
    }
  }

  function setupEvents() {
    document.addEventListener("click", (event) => {
      const inPopover = event.target.closest(".admin-popover");
      const notificationTrigger = event.target.closest("#notificationsButton");
      const profileTrigger = event.target.closest("#headerProfile, #profileMenu");
      if (notificationTrigger) {
        togglePopover("notificationsPopover", notificationTrigger);
        return;
      }
      if (profileTrigger) {
        togglePopover("profilePopover", profileTrigger);
        return;
      }
      if (!inPopover) {
        document.getElementById("notificationsPopover")?.setAttribute("hidden", "");
        document.getElementById("profilePopover")?.setAttribute("hidden", "");
      }
      handleClick(event);
    });

    document.getElementById("mobileMenu")?.addEventListener("click", openSidebar);
    document.getElementById("sidebarClose")?.addEventListener("click", closeSidebar);
    document.getElementById("sidebarBackdrop")?.addEventListener("click", closeSidebar);
    modalForm?.addEventListener("submit", submitModal);

    document.addEventListener("input", (event) => {
      const input = event.target;
      if (input.matches("[data-filter-query]")) {
        filters[`${input.dataset.filterQuery}-query`] = input.value;
        renderActiveView();
      }
      if (input.id === "field-progress") {
        const out = document.getElementById("progressValue");
        if (out) out.textContent = `${input.value}%`;
      }
    });

    document.addEventListener("change", (event) => {
      const select = event.target;
      if (select.matches("[data-filter-status]")) {
        filters[`${select.dataset.filterStatus}-status`] = select.value;
        renderActiveView();
      }
    });

    document.getElementById("globalSearch")?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      const query = event.currentTarget.value.trim();
      if (!query) return;
      const collections = ["users", "applications", "content", "registrations", "materials", "quizzes", "resources", "games", "projects", "initiatives"];
      const matches = collections.flatMap((entity) => (entityItems(entity) || []).filter((item) => JSON.stringify(item).toLowerCase().includes(query.toLowerCase())).map((item) => ({ entity, item })));
      if (!matches.length) {
        showToast(`No workspace results for “${query}”.`, true);
        return;
      }
      const first = matches[0];
      const matchingView = first.entity === "materials" ? "learning" : first.entity;
      filters[`${matchingView}-query`] = query;
      setView(matchingView);
      showToast(`${matches.length} result${matches.length === 1 ? "" : "s"} found for “${query}”.`);
    });
  }

  function addProfileConnectionAction() {
    const profilePopover = document.getElementById("profilePopover");
    if (!profilePopover) return;
    const connectButton = document.createElement("button");
    connectButton.type = "button";
    connectButton.dataset.action = "connect-admin";
    connectButton.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Connect live data';
    profilePopover.prepend(connectButton);
  }

  function init() {
    refreshProfile();
    addProfileConnectionAction();
    setupEvents();
    renderOverview();
    updateNavCounts();
    hydrateServerData();
  }

  init();
})();
