// Public Quizzes page. Reads published quizzes from /api/quizzes on this
// project's own backend (see backend/server.js) and runs them entirely
// client-side — no answers are sent anywhere.

(function () {
  "use strict";

  const grid = document.getElementById("quizGrid");
  const loading = document.getElementById("quizLoading");
  const backdrop = document.getElementById("quizModalBackdrop");
  const modalBody = document.getElementById("quizModalBody");
  const closeBtn = document.getElementById("quizModalClose");
  if (!grid) return;

  let quizzes = [];
  let current = null;
  let questionIndex = 0;
  let correctCount = 0;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[ch]);
  }

  function cardMarkup(quiz) {
    const count = (quiz.questions || []).length;
    return `
      <article class="entry-card">
        <div class="entry-card-top">
          <span class="entry-icon"><i class="fa-solid fa-circle-question"></i></span>
          <div>
            <span class="entry-tag">${escapeHtml(quiz.category || "General")}</span>
            <h3>${escapeHtml(quiz.title)}</h3>
          </div>
        </div>
        <p class="entry-desc">${escapeHtml(quiz.description || "")}</p>
        <div class="entry-meta"><div><i class="fa-regular fa-circle-question"></i>${count} question${count === 1 ? "" : "s"}</div></div>
        <button type="button" class="entry-primary-btn${count ? "" : " is-disabled"}" data-id="${escapeHtml(quiz.id)}" ${count ? "" : "disabled"}>Start quiz</button>
      </article>
    `;
  }

  function render() {
    if (!quizzes.length) {
      grid.innerHTML = '<div class="list-empty">No quizzes are published yet — check back soon.</div>';
      return;
    }
    grid.innerHTML = quizzes.map(cardMarkup).join("");
  }

  function openModal() {
    backdrop.classList.add("is-open");
  }
  function closeModal() {
    backdrop.classList.remove("is-open");
    current = null;
  }
  closeBtn.addEventListener("click", closeModal);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) closeModal();
  });

  function renderQuestion() {
    const question = current.questions[questionIndex];
    modalBody.innerHTML = `
      <div class="quiz-progress">Question ${questionIndex + 1} of ${current.questions.length}</div>
      <p class="quiz-question">${escapeHtml(question.question)}</p>
      <div class="quiz-options">
        ${question.options.map((option, i) => `<button type="button" class="quiz-option-btn" data-index="${i}">${escapeHtml(option)}</button>`).join("")}
      </div>
    `;
    modalBody.querySelectorAll(".quiz-option-btn").forEach((btn) => {
      btn.addEventListener("click", () => handleAnswer(Number(btn.dataset.index), question));
    });
  }

  function handleAnswer(chosenIndex, question) {
    const buttons = modalBody.querySelectorAll(".quiz-option-btn");
    buttons.forEach((btn) => (btn.disabled = true));
    const isCorrect = chosenIndex === question.correctIndex;
    if (isCorrect) correctCount += 1;
    buttons[question.correctIndex].classList.add("is-correct");
    if (!isCorrect) buttons[chosenIndex].classList.add("is-wrong");

    setTimeout(() => {
      questionIndex += 1;
      if (questionIndex < current.questions.length) {
        renderQuestion();
      } else {
        renderResult();
      }
    }, 900);
  }

  function renderResult() {
    const total = current.questions.length;
    modalBody.innerHTML = `
      <div class="quiz-result">
        <div class="quiz-progress">Quiz complete</div>
        <div class="quiz-result-score">${correctCount} / ${total}</div>
        <p>You got ${correctCount} out of ${total} right on "${escapeHtml(current.title)}".</p>
        <button type="button" class="entry-primary-btn" id="quizCloseBtn">Done</button>
      </div>
    `;
    document.getElementById("quizCloseBtn").addEventListener("click", closeModal);
  }

  grid.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-id]");
    if (!btn || btn.disabled) return;
    current = quizzes.find((quiz) => quiz.id === btn.dataset.id);
    if (!current || !current.questions || !current.questions.length) return;
    questionIndex = 0;
    correctCount = 0;
    openModal();
    renderQuestion();
  });

  async function load() {
    try {
      const res = await fetch("/api/quizzes");
      const data = await res.json();
      if (data.ok) {
        quizzes = data.quizzes;
        render();
      } else {
        throw new Error(data.error || "Could not load quizzes.");
      }
    } catch (err) {
      grid.innerHTML = `<div class="list-empty">Could not reach the server. Is the backend running?</div>`;
    } finally {
      if (loading) loading.remove();
    }
  }

  load();
})();
