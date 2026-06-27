// In production, set window.VLSI_API_BASE in index.html to your deployed API URL.
const API_HOST = window.location.hostname || "127.0.0.1";
const API_BASE = (window.VLSI_API_BASE && window.VLSI_API_BASE.trim())
  ? window.VLSI_API_BASE.replace(/\/$/, "")
  : `http://${API_HOST}:8000/api/v1`;

// ── Auth state ──────────────────────────────────────────────────────────────
let authToken = localStorage.getItem("vlsi_token") || null;
let currentUser = JSON.parse(localStorage.getItem("vlsi_user") || "null");

function authHeaders() {
  return authToken ? { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` }
                   : { "Content-Type": "application/json" };
}

// ── DOM refs ────────────────────────────────────────────────────────────────
const subjectGrid   = document.getElementById("subjectGrid");
const subjectCount  = document.getElementById("subjectCount");
const freeCount     = document.getElementById("freeCount");
const premiumCount  = document.getElementById("premiumCount");
const planPrice     = document.getElementById("planPrice");
const refreshBtn    = document.getElementById("refreshBtn");
const premiumBtn    = document.getElementById("premiumBtn");
const phaseTabs     = document.querySelectorAll(".phase-tab");
const form          = document.getElementById("requestForm");
const formMsg       = document.getElementById("formMsg");
const searchInput   = document.getElementById("searchInput");
const authArea      = document.getElementById("authArea");
const streakBanner  = document.getElementById("streakBanner");

// Study modal
const studyModal = document.getElementById("studyModal");
const modalTitle = document.getElementById("modalTitle");
const modalBody  = document.getElementById("modalBody");
const modalClose = document.getElementById("modalClose");
const modalTabs  = document.querySelectorAll(".modal-tab");

// Auth modal
const authModal    = document.getElementById("authModal");
const authTitle    = document.getElementById("authTitle");
const authClose    = document.getElementById("authClose");
const authEmail    = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authName     = document.getElementById("authName");
const authSubmit   = document.getElementById("authSubmit");
const authToggle   = document.getElementById("authToggle");
const authError    = document.getElementById("authError");

// Leaderboard modal
const lbModal = document.getElementById("lbModal");
const lbBody  = document.getElementById("lbBody");
const lbClose = document.getElementById("lbClose");
const lbBtn   = document.getElementById("leaderboardBtn");

let subjects = [];
let selectedPhase = "all";
let searchQuery = "";
let activeSubjectId = null;
let activeTab = "learn";
let quizQuestions = [];
let quizStart = 0;
let isRegisterMode = false;

// ── Auth UI ─────────────────────────────────────────────────────────────────
function renderAuthArea() {
  if (currentUser) {
    authArea.innerHTML = `
      <div class="user-badge">
        <span>👤 ${escapeHtml(currentUser.name || "User")}</span>
        <button id="logoutBtn" class="btn ghost">Logout</button>
      </div>`;
    document.getElementById("logoutBtn").addEventListener("click", logout);
    loadStreak();
  } else {
    authArea.innerHTML = `<button id="loginBtn" class="btn">Sign In</button>`;
    document.getElementById("loginBtn").addEventListener("click", () => openAuthModal(false));
  }
}

function openAuthModal(register) {
  isRegisterMode = register;
  authTitle.textContent = register ? "Create Account" : "Sign In";
  authName.classList.toggle("hidden", !register);
  authSubmit.textContent = register ? "Register" : "Sign In";
  authError.textContent = "";
  authModal.classList.remove("hidden");
}

authClose.addEventListener("click", () => authModal.classList.add("hidden"));
authModal.addEventListener("click", (e) => { if (e.target === authModal) authModal.classList.add("hidden"); });

authToggle.querySelector("a").addEventListener("click", (e) => {
  e.preventDefault();
  openAuthModal(!isRegisterMode);
});

authSubmit.addEventListener("click", async () => {
  const email = authEmail.value.trim();
  const password = authPassword.value;
  const name = authName.value.trim();
  if (!email || !password) { authError.textContent = "Email and password required."; return; }
  if (isRegisterMode && !name) { authError.textContent = "Full name required."; return; }

  const endpoint = isRegisterMode ? "/auth/register" : "/auth/login";
  const body = isRegisterMode ? { full_name: name, email, password } : { email, password };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json();
      authError.textContent = err.detail || "Failed. Try again.";
      return;
    }
    const data = await res.json();
    authToken = data.access_token;
    currentUser = { name: name || email.split("@")[0] };
    localStorage.setItem("vlsi_token", authToken);
    localStorage.setItem("vlsi_user", JSON.stringify(currentUser));
    authModal.classList.add("hidden");
    renderAuthArea();
  } catch {
    authError.textContent = "Network error. Is backend running?";
  }
});

function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem("vlsi_token");
  localStorage.removeItem("vlsi_user");
  streakBanner.classList.add("hidden");
  renderAuthArea();
}

// ── Streak ───────────────────────────────────────────────────────────────────
async function loadStreak() {
  if (!authToken) return;
  try {
    const s = await fetch(`${API_BASE}/user/streak`, { headers: authHeaders() }).then(r => r.json());
    if (s.current_streak > 0) {
      streakBanner.textContent = `🔥 ${s.current_streak}-day streak • ${s.total_quizzes} quizzes • ${s.total_correct} correct`;
      streakBanner.classList.remove("hidden");
    }
  } catch {}
}

async function pingStreak() {
  if (!authToken) return;
  try {
    await fetch(`${API_BASE}/user/streak/ping`, { method: "POST", headers: authHeaders() });
    loadStreak();
  } catch {}
}

// ── Bookmarks ─────────────────────────────────────────────────────────────────
let myBookmarks = [];

async function loadBookmarks() {
  if (!authToken) return;
  try {
    myBookmarks = await fetch(`${API_BASE}/user/bookmarks`, { headers: authHeaders() }).then(r => r.json());
  } catch { myBookmarks = []; }
}

async function toggleBookmark(mcqId) {
  if (!authToken) { openAuthModal(false); return; }
  const existing = myBookmarks.find(b => b.mcq_id === mcqId);
  if (existing) {
    await fetch(`${API_BASE}/user/bookmarks/${existing.id}`, { method: "DELETE", headers: authHeaders() });
    myBookmarks = myBookmarks.filter(b => b.id !== existing.id);
    return false;
  } else {
    const b = await fetch(`${API_BASE}/user/bookmarks`, {
      method: "POST", headers: authHeaders(), body: JSON.stringify({ mcq_id: mcqId })
    }).then(r => r.json());
    myBookmarks.push(b);
    return true;
  }
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
lbBtn.addEventListener("click", async () => {
  lbBody.innerHTML = "<p class='muted'>Loading...</p>";
  lbModal.classList.remove("hidden");
  try {
    const rows = await fetch(`${API_BASE}/user/leaderboard`).then(r => r.json());
    if (!rows.length) { lbBody.innerHTML = "<p class='muted'>No entries yet. Complete a quiz to appear here!</p>"; return; }
    lbBody.innerHTML = `<table class="lb-table"><thead><tr><th>#</th><th>Name</th><th>🔥 Streak</th><th>Quizzes</th><th>Correct</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${r.rank}</td><td>${escapeHtml(r.full_name)}</td><td>${r.current_streak}</td><td>${r.total_quizzes}</td><td>${r.total_correct}</td></tr>`).join("")}
    </tbody></table>`;
  } catch { lbBody.innerHTML = "<p class='muted'>Could not load leaderboard.</p>"; }
});
lbClose.addEventListener("click", () => lbModal.classList.add("hidden"));
lbModal.addEventListener("click", (e) => { if (e.target === lbModal) lbModal.classList.add("hidden"); });

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const [subjectData, premiumPlan] = await Promise.all([
      fetch(`${API_BASE}/content/subjects?include_premium=true`).then(r => r.json()),
      fetch(`${API_BASE}/content/plans/premium`).then(r => r.json()),
    ]);
    subjects = Array.isArray(subjectData) ? subjectData : [];
    renderStats(subjects, premiumPlan);
    renderSubjects();
    loadBookmarks();
  } catch {
    subjectGrid.innerHTML = `<article class="subject-card"><h3>Backend connection needed</h3><p>Start FastAPI at ${API_BASE} to load real subjects.</p></article>`;
  }
}

function renderStats(items, premiumPlan) {
  subjectCount.textContent = String(items.length);
  freeCount.textContent = String(items.filter(x => !x.is_premium).length);
  premiumCount.textContent = String(items.filter(x => x.is_premium).length);
  planPrice.textContent = `INR ${premiumPlan.monthly_price_inr}`;
}

function renderSubjects() {
  let filtered = selectedPhase === "all" ? subjects : subjects.filter(s => String(s.phase) === selectedPhase);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(s => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
  }
  if (!filtered.length) {
    subjectGrid.innerHTML = `<article class="subject-card"><h3>No subjects found</h3><p>${searchQuery ? "Try a different search." : "Add content using seed files."}</p></article>`;
    return;
  }
  subjectGrid.innerHTML = filtered.map(s => `
    <article class="subject-card clickable" data-id="${s.id}" data-title="${escapeHtml(s.title)}" tabindex="0" role="button">
      <div class="subject-meta">Phase ${s.phase}
        <span class="tag ${s.is_premium ? "premium" : "free"}">${s.is_premium ? `Premium INR ${s.monthly_price_inr}/mo` : "Free"}</span>
      </div>
      <h3>${escapeHtml(s.title)}</h3>
      <p>${escapeHtml(s.description)}</p>
      <span class="card-cta">Open &amp; study →</span>
    </article>`).join("");
}

function escapeHtml(v) {
  return String(v || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

// ── Phase tabs & search ───────────────────────────────────────────────────────
phaseTabs.forEach(tab => tab.addEventListener("click", () => {
  phaseTabs.forEach(t => t.classList.remove("active"));
  tab.classList.add("active");
  selectedPhase = tab.dataset.phase || "all";
  renderSubjects();
}));

searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value.trim();
  renderSubjects();
});

refreshBtn.addEventListener("click", loadDashboard);
premiumBtn.addEventListener("click", () => alert("Hook this button to your payment gateway checkout flow (Razorpay/Stripe)."));

form.addEventListener("submit", e => {
  e.preventDefault();
  const payload = { name: document.getElementById("studentName").value.trim(), topic: document.getElementById("topicName").value.trim(), details: document.getElementById("details").value.trim(), createdAt: new Date().toISOString() };
  const key = "vlsi-topic-requests";
  const existing = JSON.parse(localStorage.getItem(key) || "[]");
  existing.push(payload);
  localStorage.setItem(key, JSON.stringify(existing));
  formMsg.textContent = "Request saved!";
  form.reset();
});

// ── Study modal ───────────────────────────────────────────────────────────────
subjectGrid.addEventListener("click", e => {
  const card = e.target.closest(".subject-card.clickable");
  if (card) openSubject(Number(card.dataset.id), card.dataset.title);
});
subjectGrid.addEventListener("keydown", e => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const card = e.target.closest(".subject-card.clickable");
  if (card) { e.preventDefault(); openSubject(Number(card.dataset.id), card.dataset.title); }
});

modalClose.addEventListener("click", () => studyModal.classList.add("hidden"));
studyModal.addEventListener("click", e => { if (e.target === studyModal) studyModal.classList.add("hidden"); });

modalTabs.forEach(tab => tab.addEventListener("click", () => {
  modalTabs.forEach(t => t.classList.remove("active"));
  tab.classList.add("active");
  activeTab = tab.dataset.tab;
  if (activeTab === "learn") renderLearn(); else renderQuiz();
}));

async function openSubject(id, title) {
  activeSubjectId = id;
  activeTab = "learn";
  modalTabs.forEach(t => t.classList.toggle("active", t.dataset.tab === "learn"));
  modalTitle.textContent = title || "Subject";
  modalBody.innerHTML = "<p class='muted'>Loading...</p>";
  studyModal.classList.remove("hidden");
  renderLearn();
}

async function renderLearn() {
  modalBody.innerHTML = "<p class='muted'>Loading tutorials...</p>";
  try {
    const tutorials = await fetch(`${API_BASE}/content/subjects/${activeSubjectId}/tutorials`).then(r => r.json());
    if (!Array.isArray(tutorials) || !tutorials.length) {
      modalBody.innerHTML = "<p class='muted'>No tutorials for this subject yet. Try the Quiz tab.</p>"; return;
    }
    modalBody.innerHTML = tutorials.map(t => `
      <details class="lesson">
        <summary><strong>${escapeHtml(t.title)}</strong><span class="muted"> • ${escapeHtml(t.topic)} • ${t.reading_minutes} min</span></summary>
        <pre class="lesson-body">${escapeHtml(t.content_markdown)}</pre>
      </details>`).join("");
  } catch { modalBody.innerHTML = "<p class='muted'>Could not load tutorials.</p>"; }
}

async function renderQuiz() {
  modalBody.innerHTML = "<p class='muted'>Loading questions...</p>";
  try {
    quizQuestions = await fetch(`${API_BASE}/content/subjects/${activeSubjectId}/mcqs?limit=5`).then(r => r.json());
    if (!Array.isArray(quizQuestions) || !quizQuestions.length) {
      modalBody.innerHTML = "<p class='muted'>No MCQs for this subject yet.</p>"; return;
    }
    quizStart = Date.now();
    const opts = [["A","option_a"],["B","option_b"],["C","option_c"],["D","option_d"]];
    const html = quizQuestions.map((q, i) => {
      const isBookmarked = myBookmarks.some(b => b.mcq_id === q.id);
      return `<div class="quiz-q" data-qid="${q.id}">
        <p class="quiz-text">${i+1}. ${escapeHtml(q.question_text)}
          <button class="bookmark-btn ${isBookmarked ? "active" : ""}" data-mcqid="${q.id}" title="Bookmark">🔖</button>
        </p>
        ${opts.map(([k,f]) => `<label class="quiz-opt"><input type="radio" name="q${q.id}" value="${k}" /><span>${k}) ${escapeHtml(q[f])}</span></label>`).join("")}
      </div>`;
    }).join("");
    modalBody.innerHTML = `${html}<button id="quizSubmit" class="btn">Submit quiz</button><div id="quizScore"></div>`;
    document.getElementById("quizSubmit").addEventListener("click", submitQuiz);
    modalBody.querySelectorAll(".bookmark-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const mcqId = Number(btn.dataset.mcqid);
        const added = await toggleBookmark(mcqId);
        btn.classList.toggle("active", added);
      });
    });
  } catch { modalBody.innerHTML = "<p class='muted'>Could not load questions.</p>"; }
}

async function submitQuiz() {
  const answers = quizQuestions.map(q => {
    const picked = modalBody.querySelector(`input[name="q${q.id}"]:checked`);
    return { mcq_id: q.id, selected_option: picked ? picked.value : "A" };
  });
  const timeSeconds = Math.round((Date.now() - quizStart) / 1000);
  try {
    const res = await fetch(`${API_BASE}/progress/quiz/submit`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ subject_id: activeSubjectId, time_seconds: timeSeconds, answers }),
    }).then(r => r.json());

    const byId = {};
    res.results.forEach(r => (byId[r.mcq_id] = r));
    modalBody.querySelectorAll(".quiz-q").forEach(qEl => {
      const r = byId[Number(qEl.dataset.qid)];
      if (!r) return;
      qEl.querySelectorAll(".quiz-opt").forEach(opt => {
        const v = opt.querySelector("input").value;
        if (v === r.correct_option) opt.classList.add("correct");
        if (v === r.selected_option && !r.is_correct) opt.classList.add("wrong");
      });
      const exp = document.createElement("p");
      exp.className = "quiz-exp"; exp.textContent = r.explanation;
      qEl.appendChild(exp);
    });
    document.getElementById("quizScore").innerHTML =
      `<div class="score-card"><strong>${res.score_percent}%</strong> • Grade ${escapeHtml(res.grade)} • ${res.correct_count}/${res.total_questions} correct in ${res.time_seconds}s</div>`;
    pingStreak();
  } catch { document.getElementById("quizScore").textContent = "Could not score quiz."; }
}

// ── Init ──────────────────────────────────────────────────────────────────────
renderAuthArea();
loadDashboard();

// Register service worker for offline + installability (PWA).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

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
