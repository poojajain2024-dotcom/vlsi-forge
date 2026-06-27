// In production, set window.VLSI_API_BASE in index.html to your deployed API URL.
// Locally it auto-targets the backend on the same host at port 8000.
const API_HOST = window.location.hostname || "127.0.0.1";
const API_BASE = (window.VLSI_API_BASE && window.VLSI_API_BASE.trim())
  ? window.VLSI_API_BASE.replace(/\/$/, "")
  : `http://${API_HOST}:8000/api/v1`;

const subjectGrid = document.getElementById("subjectGrid");
const subjectCount = document.getElementById("subjectCount");
const freeCount = document.getElementById("freeCount");
const premiumCount = document.getElementById("premiumCount");
const planPrice = document.getElementById("planPrice");
const refreshBtn = document.getElementById("refreshBtn");
const premiumBtn = document.getElementById("premiumBtn");
const phaseTabs = document.querySelectorAll(".phase-tab");

const form = document.getElementById("requestForm");
const studentName = document.getElementById("studentName");
const topicName = document.getElementById("topicName");
const details = document.getElementById("details");
const formMsg = document.getElementById("formMsg");

let subjects = [];
let selectedPhase = "all";

async function loadDashboard() {
  try {
    const [subjectData, premiumPlan] = await Promise.all([
      fetch(`${API_BASE}/content/subjects?include_premium=true`).then((r) => r.json()),
      fetch(`${API_BASE}/content/plans/premium`).then((r) => r.json()),
    ]);

    subjects = Array.isArray(subjectData) ? subjectData : [];
    renderStats(subjects, premiumPlan);
    renderSubjects();
  } catch (err) {
    subjectGrid.innerHTML = `<article class="subject-card"><h3>Backend connection needed</h3><p>Start FastAPI at ${API_BASE} to load real subjects.</p></article>`;
  }
}

function renderStats(items, premiumPlan) {
  const free = items.filter((x) => !x.is_premium).length;
  const premium = items.filter((x) => x.is_premium).length;

  subjectCount.textContent = String(items.length);
  freeCount.textContent = String(free);
  premiumCount.textContent = String(premium);
  planPrice.textContent = `INR ${premiumPlan.monthly_price_inr}`;
}

function renderSubjects() {
  const filtered = selectedPhase === "all" ? subjects : subjects.filter((s) => String(s.phase) === selectedPhase);

  if (filtered.length === 0) {
    subjectGrid.innerHTML = `<article class="subject-card"><h3>No subjects in this phase yet</h3><p>Add content using docs/seed and import script.</p></article>`;
    return;
  }

  subjectGrid.innerHTML = filtered
    .map(
      (s) => `
      <article class="subject-card clickable" data-id="${s.id}" data-title="${escapeHtml(s.title)}" tabindex="0" role="button">
        <div class="subject-meta">Phase ${s.phase}
          <span class="tag ${s.is_premium ? "premium" : "free"}">
            ${s.is_premium ? `Premium INR ${s.monthly_price_inr}/month` : "Free"}
          </span>
        </div>
        <h3>${escapeHtml(s.title)}</h3>
        <p>${escapeHtml(s.description)}</p>
        <span class="card-cta">Open &amp; study →</span>
      </article>
    `,
    )
    .join("");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

phaseTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    phaseTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    selectedPhase = tab.dataset.phase || "all";
    renderSubjects();
  });
});

refreshBtn.addEventListener("click", loadDashboard);

premiumBtn.addEventListener("click", () => {
  alert("Hook this button to your payment gateway checkout flow (Razorpay/Stripe).");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const payload = {
    name: studentName.value.trim(),
    topic: topicName.value.trim(),
    details: details.value.trim(),
    createdAt: new Date().toISOString(),
  };

  const key = "vlsi-topic-requests";
  const existing = JSON.parse(localStorage.getItem(key) || "[]");
  existing.push(payload);
  localStorage.setItem(key, JSON.stringify(existing));

  formMsg.textContent = "Request saved. You can later sync this to backend/admin panel.";
  form.reset();
});

// ---- Interactive study + quiz modal ----
const studyModal = document.getElementById("studyModal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalClose = document.getElementById("modalClose");
const modalTabs = document.querySelectorAll(".modal-tab");

let activeSubjectId = null;
let activeTab = "learn";
let quizQuestions = [];
let quizStart = 0;

function openModal() {
  studyModal.classList.remove("hidden");
}

function closeModal() {
  studyModal.classList.add("hidden");
}

subjectGrid.addEventListener("click", (event) => {
  const card = event.target.closest(".subject-card.clickable");
  if (card) openSubject(Number(card.dataset.id), card.dataset.title);
});

subjectGrid.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest(".subject-card.clickable");
  if (card) {
    event.preventDefault();
    openSubject(Number(card.dataset.id), card.dataset.title);
  }
});

modalClose.addEventListener("click", closeModal);
studyModal.addEventListener("click", (event) => {
  if (event.target === studyModal) closeModal();
});

modalTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    modalTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    activeTab = tab.dataset.tab;
    if (activeTab === "learn") renderLearn();
    else renderQuiz();
  });
});

async function openSubject(id, title) {
  activeSubjectId = id;
  activeTab = "learn";
  modalTabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === "learn"));
  modalTitle.textContent = title || "Subject";
  modalBody.innerHTML = "<p class='muted'>Loading...</p>";
  openModal();
  renderLearn();
}

async function renderLearn() {
  modalBody.innerHTML = "<p class='muted'>Loading tutorials...</p>";
  try {
    const tutorials = await fetch(`${API_BASE}/content/subjects/${activeSubjectId}/tutorials`).then((r) => r.json());
    if (!Array.isArray(tutorials) || tutorials.length === 0) {
      modalBody.innerHTML = "<p class='muted'>No tutorials for this subject yet. Try the Quiz tab.</p>";
      return;
    }
    modalBody.innerHTML = tutorials
      .map(
        (t) => `
        <details class="lesson">
          <summary><strong>${escapeHtml(t.title)}</strong><span class="muted"> • ${escapeHtml(t.topic)} • ${t.reading_minutes} min</span></summary>
          <pre class="lesson-body">${escapeHtml(t.content_markdown)}</pre>
        </details>`,
      )
      .join("");
  } catch (err) {
    modalBody.innerHTML = "<p class='muted'>Could not load tutorials. Is the backend running?</p>";
  }
}

async function renderQuiz() {
  modalBody.innerHTML = "<p class='muted'>Loading questions...</p>";
  try {
    quizQuestions = await fetch(`${API_BASE}/content/subjects/${activeSubjectId}/mcqs?limit=5`).then((r) => r.json());
    if (!Array.isArray(quizQuestions) || quizQuestions.length === 0) {
      modalBody.innerHTML = "<p class='muted'>No MCQs for this subject yet.</p>";
      return;
    }
    quizStart = Date.now();
    const opts = [
      ["A", "option_a"],
      ["B", "option_b"],
      ["C", "option_c"],
      ["D", "option_d"],
    ];
    const html = quizQuestions
      .map(
        (q, i) => `
        <div class="quiz-q" data-qid="${q.id}">
          <p class="quiz-text">${i + 1}. ${escapeHtml(q.question_text)}</p>
          ${opts
            .map(
              ([key, field]) => `
            <label class="quiz-opt">
              <input type="radio" name="q${q.id}" value="${key}" />
              <span>${key}) ${escapeHtml(q[field])}</span>
            </label>`,
            )
            .join("")}
        </div>`,
      )
      .join("");
    modalBody.innerHTML = `${html}<button id="quizSubmit" class="btn">Submit quiz</button><div id="quizScore"></div>`;
    document.getElementById("quizSubmit").addEventListener("click", submitQuiz);
  } catch (err) {
    modalBody.innerHTML = "<p class='muted'>Could not load questions. Is the backend running?</p>";
  }
}

async function submitQuiz() {
  const answers = quizQuestions.map((q) => {
    const picked = modalBody.querySelector(`input[name="q${q.id}"]:checked`);
    return { mcq_id: q.id, selected_option: picked ? picked.value : "A" };
  });
  const timeSeconds = Math.round((Date.now() - quizStart) / 1000);
  try {
    const res = await fetch(`${API_BASE}/progress/quiz/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject_id: activeSubjectId, time_seconds: timeSeconds, answers }),
    }).then((r) => r.json());

    const byId = {};
    res.results.forEach((r) => (byId[r.mcq_id] = r));
    modalBody.querySelectorAll(".quiz-q").forEach((qEl) => {
      const qid = Number(qEl.dataset.qid);
      const r = byId[qid];
      if (!r) return;
      qEl.querySelectorAll(".quiz-opt").forEach((optEl) => {
        const val = optEl.querySelector("input").value;
        if (val === r.correct_option) optEl.classList.add("correct");
        if (val === r.selected_option && !r.is_correct) optEl.classList.add("wrong");
      });
      const exp = document.createElement("p");
      exp.className = "quiz-exp";
      exp.textContent = r.explanation;
      qEl.appendChild(exp);
    });

    const score = document.getElementById("quizScore");
    score.innerHTML = `<div class="score-card"><strong>${res.score_percent}%</strong> • Grade ${escapeHtml(res.grade)} • ${res.correct_count}/${res.total_questions} correct in ${res.time_seconds}s</div>`;
  } catch (err) {
    document.getElementById("quizScore").textContent = "Could not score quiz. Is the backend running?";
  }
}

loadDashboard();
