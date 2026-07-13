// Login / signup / recovery page.
// Email flows call the real backend (/api/auth/signup, /api/auth/login).
// Phone flows are a front-end demo only — no SMS provider is wired up.

(function () {
  "use strict";

  const panels = {
    login: document.getElementById("panel-login"),
    signup: document.getElementById("panel-signup"),
    recovery: document.getElementById("panel-recovery"),
  };
  const modeButtons = document.querySelectorAll(".mode-btn");

  function showPanel(mode) {
    Object.entries(panels).forEach(([key, el]) => {
      if (!el) return;
      el.hidden = key !== mode;
    });
    modeButtons.forEach((btn) => {
      const isActive = btn.dataset.mode === mode;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }

  modeButtons.forEach((btn) => btn.addEventListener("click", () => showPanel(btn.dataset.mode)));
  document.querySelectorAll("[data-go]").forEach((btn) =>
    btn.addEventListener("click", () => showPanel(btn.dataset.go))
  );

  // ---- Email / phone method tabs, scoped per panel ----
  document.querySelectorAll(".method-tabs").forEach((tabs) => {
    const scope = tabs.dataset.scope;
    tabs.querySelectorAll(".method-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        tabs.querySelectorAll(".method-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        document.querySelectorAll(`.method-form[data-scope="${scope}"]`).forEach((form) => {
          form.classList.toggle("active", form.dataset.methodForm === btn.dataset.method);
        });
      });
    });
  });

  function setStatus(scope, message, isError) {
    const el = document.querySelector(`[data-status="${scope}"]`);
    if (!el) return;
    el.textContent = message || "";
    el.classList.toggle("is-error", !!isError);
  }

  function markInvalid(input, invalid) {
    input.classList.toggle("is-invalid", invalid);
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async function postJSON(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) throw new Error(data.error || "Something went wrong. Please try again.");
    return data;
  }

  function rememberSession(token, user) {
    try {
      localStorage.setItem("cg_token", token);
      localStorage.setItem("cg_user", JSON.stringify(user));
    } catch (err) {
      /* storage unavailable — session simply won't persist across reloads */
    }
  }

  // ---- Login (email) ----
  const loginEmailForm = document.querySelector('form[data-scope="login"][data-method-form="email"]');
  if (loginEmailForm) {
    loginEmailForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail");
      const password = document.getElementById("loginPassword");
      const emailOk = validEmail(email.value);
      markInvalid(email, !emailOk);
      markInvalid(password, !password.value);
      if (!emailOk || !password.value) return;

      setStatus("login", "Logging in…", false);
      try {
        const data = await postJSON("/api/auth/login", { email: email.value.trim(), password: password.value });
        rememberSession(data.token, data.user);
        setStatus("login", `Welcome back, ${data.user.name || data.user.email}.`, false);
        if (window.cgToast) window.cgToast("Logged in.");
      } catch (err) {
        setStatus("login", err.message, true);
      }
    });
  }

  // ---- Login (phone) — demo only, no SMS backend ----
  const loginPhoneForm = document.querySelector('form[data-scope="login"][data-method-form="phone"]');
  wirePhoneDemo(loginPhoneForm, "login");

  // ---- Sign up (email) ----
  const signupEmailForm = document.querySelector('form[data-scope="signup"][data-method-form="email"]');
  if (signupEmailForm) {
    signupEmailForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("signupName");
      const email = document.getElementById("signupEmail");
      const password = document.getElementById("signupPassword");
      const confirm = document.getElementById("signupPasswordConfirm");
      const agree = signupEmailForm.querySelector('input[type="checkbox"]');

      const emailOk = validEmail(email.value);
      const passOk = password.value.length >= 8;
      const matchOk = password.value === confirm.value && confirm.value.length > 0;

      markInvalid(email, !emailOk);
      markInvalid(password, !passOk);
      markInvalid(confirm, !matchOk);

      if (!emailOk || !passOk || !matchOk || !agree.checked) {
        if (!agree.checked) setStatus("signup", "Please agree to the community guideline to continue.", true);
        return;
      }

      setStatus("signup", "Creating your account…", false);
      try {
        const data = await postJSON("/api/auth/signup", {
          name: name.value.trim(),
          email: email.value.trim(),
          password: password.value,
        });
        rememberSession(data.token, data.user);
        setStatus("signup", `Account created — welcome, ${data.user.name || data.user.email}.`, false);
        if (window.cgToast) window.cgToast("Account created.");
      } catch (err) {
        setStatus("signup", err.message, true);
      }
    });
  }

  // ---- Sign up (phone) — demo only ----
  const signupPhoneForm = document.querySelector('form[data-scope="signup"][data-method-form="phone"]');
  wirePhoneDemo(signupPhoneForm, "signup");

  // ---- Recovery ----
  const recoveryEmailForm = document.querySelector('form[data-scope="recovery"][data-method-form="email"]');
  if (recoveryEmailForm) {
    recoveryEmailForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("recoveryEmail");
      const emailOk = validEmail(email.value);
      markInvalid(email, !emailOk);
      if (!emailOk) return;
      setStatus("recovery", "If an account exists for that email, a reset link is on its way.", false);
    });
  }
  const recoveryPhoneForm = document.querySelector('form[data-scope="recovery"][data-method-form="phone"]');
  wirePhoneDemo(recoveryPhoneForm, "recovery");

  // ---- Shared phone "send code" demo flow ----
  function wirePhoneDemo(form, scope) {
    if (!form) return;
    const submitBtn = form.querySelector("button[type=submit]");
    const codeStep = form.querySelector("[data-code-step]");
    let codeSent = false;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!codeSent) {
        codeSent = true;
        if (codeStep) codeStep.hidden = false;
        if (submitBtn) submitBtn.textContent = submitBtn.dataset.submitLabel || "Submit";
        setStatus(scope, "This is a front-end demo — no SMS is actually sent. Enter any code to continue.", false);
      } else {
        setStatus(scope, "Phone sign-in is a front-end demo in this build — please use email instead for a real account.", false);
      }
    });
  }
})();
