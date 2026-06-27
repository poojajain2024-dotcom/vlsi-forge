// VLSI Forge — fully offline PWA.
// All content is embedded in data.js (window.VLSI_DATA). Accounts, streaks,
// bookmarks and the leaderboard live in the browser (localStorage), so the
// site works with NO backend, NO hosting cost and NO extra accounts.

const DATA = window.VLSI_DATA || { subjects: [], mcqs: [], tutorials: [] };

// ── Account / auth state (all local) ─────────────────────────────────────────
function loadAccounts() { return JSON.parse(localStorage.getItem("vlsi_accounts") || "{}"); }
function saveAccounts(a) { localStorage.setItem("vlsi_accounts", JSON.stringify(a)); }
function hashPwd(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return String(h); }

let currentUser = JSON.parse(localStorage.getItem("vlsi_user") || "null"); // { email, name }

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

let selectedPhase = "all";
let searchQuery = "";
let activeSubjectId = null;
let activeTab = "learn";
let quizQuestions = [];
let quizStart = 0;
let isRegisterMode = false;

// ── Per-user storage helpers ──────────────────────────────────────────────────
function userKey(suffix) {
  const id = currentUser ? currentUser.email : "guest";
  return `vlsi_${suffix}_${id}`;
}
function getStreak() {
  return JSON.parse(localStorage.getItem(userKey("streak")) || "null")
    || { current_streak: 0, longest_streak: 0, last_activity_date: null, total_quizzes: 0, total_correct: 0 };
}
function setStreak(s) { localStorage.setItem(userKey("streak"), JSON.stringify(s)); }
function getBookmarks() { return JSON.parse(localStorage.getItem(userKey("bookmarks")) || "[]"); }
function setBookmarks(b) { localStorage.setItem(userKey("bookmarks"), JSON.stringify(b)); }

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
    streakBanner.classList.add("hidden");
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

authSubmit.addEventListener("click", () => {
  const email = authEmail.value.trim().toLowerCase();
  const password = authPassword.value;
  const name = authName.value.trim();
  if (!email || !password) { authError.textContent = "Email and password required."; return; }
  if (isRegisterMode && !name) { authError.textContent = "Full name required."; return; }

  const accounts = loadAccounts();
  if (isRegisterMode) {
    if (accounts[email]) { authError.textContent = "Account already exists. Sign in instead."; return; }
    accounts[email] = { name, pwd: hashPwd(password) };
    saveAccounts(accounts);
    currentUser = { email, name };
  } else {
    const acc = accounts[email];
    if (!acc || acc.pwd !== hashPwd(password)) { authError.textContent = "Wrong email or password."; return; }
    currentUser = { email, name: acc.name };
  }
  localStorage.setItem("vlsi_user", JSON.stringify(currentUser));
  authEmail.value = ""; authPassword.value = ""; authName.value = "";
  authModal.classList.add("hidden");
  renderAuthArea();
  renderSubjects();
});

function logout() {
  currentUser = null;
  localStorage.removeItem("vlsi_user");
  streakBanner.classList.add("hidden");
  renderAuthArea();
  renderSubjects();
}

// ── Streak (date-based, local) ────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().slice(0, 10); }

function loadStreak() {
  if (!currentUser) return;
  const s = getStreak();
  if (s.current_streak > 0) {
    streakBanner.textContent = `🔥 ${s.current_streak}-day streak • ${s.total_quizzes} quizzes • ${s.total_correct} correct`;
    streakBanner.classList.remove("hidden");
  } else {
    streakBanner.classList.add("hidden");
  }
}

function recordQuiz(correctCount, totalCount) {
  if (!currentUser) return;
  const s = getStreak();
  const today = todayStr();
  if (s.last_activity_date !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    s.current_streak = s.last_activity_date === yesterday ? s.current_streak + 1 : 1;
    s.longest_streak = Math.max(s.longest_streak, s.current_streak);
    s.last_activity_date = today;
  }
  s.total_quizzes += 1;
  s.total_correct += correctCount;
  setStreak(s);
  loadStreak();
}

// ── Bookmarks (local) ─────────────────────────────────────────────────────────
function isBookmarked(mcqId) { return getBookmarks().includes(mcqId); }

function toggleBookmark(mcqId) {
  if (!currentUser) { openAuthModal(false); return false; }
  let b = getBookmarks();
  if (b.includes(mcqId)) { b = b.filter(x => x !== mcqId); setBookmarks(b); return false; }
  b.push(mcqId); setBookmarks(b); return true;
}

// ── Leaderboard (local — every account on this device) ────────────────────────
lbBtn.addEventListener("click", () => {
  const accounts = loadAccounts();
  const rows = Object.keys(accounts).map(email => {
    const s = JSON.parse(localStorage.getItem(`vlsi_streak_${email}`) || "null")
      || { current_streak: 0, total_quizzes: 0, total_correct: 0 };
    return { name: accounts[email].name, ...s, email };
  });
  rows.sort((a, b) => b.current_streak - a.current_streak || b.total_correct - a.total_correct);
  lbModal.classList.remove("hidden");
  if (!rows.length || rows.every(r => r.total_quizzes === 0)) {
    lbBody.innerHTML = "<p class='muted'>No entries yet. Complete a quiz to appear here!</p>";
    return;
  }
  lbBody.innerHTML = `<p class="muted" style="margin:0 0 .6rem">Ranked across all accounts on this device.</p>
    <table class="lb-table"><thead><tr><th>#</th><th>Name</th><th>🔥 Streak</th><th>Quizzes</th><th>Correct</th></tr></thead><tbody>
    ${rows.map((r, i) => `<tr${currentUser && r.email === currentUser.email ? ' class="me"' : ''}>
      <td>${i + 1}</td><td>${escapeHtml(r.name)}</td><td>${r.current_streak}</td><td>${r.total_quizzes}</td><td>${r.total_correct}</td></tr>`).join("")}
    </tbody></table>`;
});
lbClose.addEventListener("click", () => lbModal.classList.add("hidden"));
lbModal.addEventListener("click", (e) => { if (e.target === lbModal) lbModal.classList.add("hidden"); });

// ── Dashboard ─────────────────────────────────────────────────────────────────
function loadDashboard() {
  renderStats();
  renderSubjects();
}

function renderStats() {
  const items = DATA.subjects;
  subjectCount.textContent = String(items.length);
  freeCount.textContent = String(items.filter(x => !x.is_premium).length);
  premiumCount.textContent = String(items.filter(x => x.is_premium).length);
  const premium = items.find(x => x.is_premium && x.monthly_price_inr);
  planPrice.textContent = premium ? `INR ${premium.monthly_price_inr}` : "Free";
}

function renderSubjects() {
  let filtered = selectedPhase === "all" ? DATA.subjects : DATA.subjects.filter(s => String(s.phase) === selectedPhase);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(s =>
      s.title.toLowerCase().includes(q) ||
      (s.description || "").toLowerCase().includes(q) ||
      DATA.mcqs.some(m => m.subject_id === s.id && m.question_text.toLowerCase().includes(q)));
  }
  if (!filtered.length) {
    subjectGrid.innerHTML = `<article class="subject-card"><h3>No subjects found</h3><p>${searchQuery ? "Try a different search." : "No content available."}</p></article>`;
    return;
  }
  subjectGrid.innerHTML = filtered.map(s => {
    const qCount = DATA.mcqs.filter(m => m.subject_id === s.id).length;
    const tCount = DATA.tutorials.filter(t => t.subject_id === s.id).length;
    return `
    <article class="subject-card clickable" data-id="${s.id}" data-title="${escapeHtml(s.title)}" tabindex="0" role="button">
      <div class="subject-meta">Phase ${s.phase}
        <span class="tag ${s.is_premium ? "premium" : "free"}">${s.is_premium ? `Premium INR ${s.monthly_price_inr}/mo` : "Free"}</span>
      </div>
      <h3>${escapeHtml(s.title)}</h3>
      <p>${escapeHtml(s.description)}</p>
      <div class="subject-meta"><span class="muted">📘 ${tCount} lessons • 📝 ${qCount} questions</span></div>
      <span class="card-cta">Open &amp; study →</span>
    </article>`;
  }).join("");
}

function escapeHtml(v) {
  return String(v == null ? "" : v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
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

function openSubject(id, title) {
  activeSubjectId = id;
  activeTab = "learn";
  modalTabs.forEach(t => t.classList.toggle("active", t.dataset.tab === "learn"));
  modalTitle.textContent = title || "Subject";
  studyModal.classList.remove("hidden");
  renderLearn();
}

function renderLearn() {
  const tutorials = DATA.tutorials
    .filter(t => t.subject_id === activeSubjectId)
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  if (!tutorials.length) {
    modalBody.innerHTML = "<p class='muted'>No tutorials for this subject yet. Try the Quiz tab.</p>"; return;
  }
  modalBody.innerHTML = tutorials.map(t => `
    <details class="lesson">
      <summary><strong>${escapeHtml(t.title)}</strong><span class="muted"> • ${escapeHtml(t.topic)} • ${t.reading_minutes} min</span></summary>
      <pre class="lesson-body">${escapeHtml(t.content_markdown)}</pre>
    </details>`).join("");
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function renderQuiz() {
  const pool = DATA.mcqs.filter(m => m.subject_id === activeSubjectId);
  if (!pool.length) {
    modalBody.innerHTML = "<p class='muted'>No MCQs for this subject yet.</p>"; return;
  }
  quizQuestions = shuffle(pool).slice(0, Math.min(5, pool.length));
  quizStart = Date.now();
  const opts = [["A","option_a"],["B","option_b"],["C","option_c"],["D","option_d"]];
  const html = quizQuestions.map((q, i) => {
    const bm = isBookmarked(q.id);
    return `<div class="quiz-q" data-qid="${q.id}">
      <p class="quiz-text">${i+1}. ${escapeHtml(q.question_text)}
        <button class="bookmark-btn ${bm ? "active" : ""}" data-mcqid="${q.id}" title="Bookmark">🔖</button>
      </p>
      ${opts.map(([k,f]) => `<label class="quiz-opt"><input type="radio" name="q${q.id}" value="${k}" /><span>${k}) ${escapeHtml(q[f])}</span></label>`).join("")}
    </div>`;
  }).join("");
  modalBody.innerHTML = `${html}<button id="quizSubmit" class="btn">Submit quiz</button><div id="quizScore"></div>`;
  document.getElementById("quizSubmit").addEventListener("click", submitQuiz);
  modalBody.querySelectorAll(".bookmark-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const mcqId = Number(btn.dataset.mcqid);
      const added = toggleBookmark(mcqId);
      btn.classList.toggle("active", added);
    });
  });
}

function gradeFor(pct) {
  if (pct >= 90) return "A+"; if (pct >= 80) return "A"; if (pct >= 70) return "B";
  if (pct >= 60) return "C"; if (pct >= 50) return "D"; return "F";
}

function submitQuiz() {
  let correct = 0;
  modalBody.querySelectorAll(".quiz-q").forEach(qEl => {
    const q = quizQuestions.find(x => x.id === Number(qEl.dataset.qid));
    if (!q) return;
    const picked = qEl.querySelector(`input[name="q${q.id}"]:checked`);
    const selected = picked ? picked.value : null;
    const isCorrect = selected === q.correct_option;
    if (isCorrect) correct++;
    qEl.querySelectorAll(".quiz-opt").forEach(opt => {
      const v = opt.querySelector("input").value;
      if (v === q.correct_option) opt.classList.add("correct");
      if (v === selected && !isCorrect) opt.classList.add("wrong");
    });
    const exp = document.createElement("p");
    exp.className = "quiz-exp"; exp.textContent = q.explanation;
    qEl.appendChild(exp);
  });
  const total = quizQuestions.length;
  const pct = Math.round((correct / total) * 100);
  const timeSeconds = Math.round((Date.now() - quizStart) / 1000);
  document.getElementById("quizScore").innerHTML =
    `<div class="score-card"><strong>${pct}%</strong> • Grade ${gradeFor(pct)} • ${correct}/${total} correct in ${timeSeconds}s</div>`;
  recordQuiz(correct, total);
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
