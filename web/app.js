// VLSI Forge — fully offline PWA.
// All content is embedded in data.js (window.VLSI_DATA). Accounts, streaks,
// bookmarks and the leaderboard live in the browser (localStorage), so the
// site works with NO backend, NO hosting cost and NO extra accounts.

const DATA = window.VLSI_DATA || { subjects: [], mcqs: [], tutorials: [] };

// ── Subject metadata (icon + accent color) ───────────────────────────────────
const SUBJECT_META = {
  "digital-electronics":           { icon: "⚡", color: "#2563eb" },
  "verilog-hdl":                   { icon: "📟", color: "#7c3aed" },
  "sta-basics":                    { icon: "⏱",  color: "#dc2626" },
  "systemverilog-rtl":             { icon: "🔧", color: "#059669" },
  "uvm":                           { icon: "🧪", color: "#d97706" },
  "physical-design":               { icon: "📐", color: "#0891b2" },
  "bus-protocols":                 { icon: "🔌", color: "#9333ea" },
  "interview-core-vlsi":           { icon: "🏆", color: "#b45309" },
  "interview-company-qualcomm":    { icon: "💼", color: "#374151" },
  "interview-company-nvidia-amd":  { icon: "🎮", color: "#16a34a" },
};

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

let searchQuery = "";
let activeSubjectId = null;
let activeSubjectSlug = null;
let activeTab = "learn";
let quizQuestions = [];
let quizStart = 0;
let quizCurrentIndex = 0;
let quizCorrect = 0;
let quizAnswered = [];
let quizDiffFilter = "all";
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

// ── Topic completion tracking ─────────────────────────────────────────────────
function getReadTopics(subjectId) {
  return new Set(JSON.parse(localStorage.getItem(userKey(`read_${subjectId}`)) || "[]"));
}
function markTopicRead(subjectId, idx) {
  const set = getReadTopics(subjectId);
  set.add(idx);
  localStorage.setItem(userKey(`read_${subjectId}`), JSON.stringify([...set]));
}

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
  const qEl = document.getElementById("questionCount");
  if (qEl) qEl.textContent = `${DATA.mcqs.length}+`;
  if (premiumCount) premiumCount.textContent = String(items.filter(x => x.is_premium).length);
  if (planPrice) {
    const premium = items.find(x => x.is_premium && x.monthly_price_inr);
    planPrice.textContent = premium ? `INR ${premium.monthly_price_inr}` : "Free";
  }
}

function renderSubjects() {
  let filtered = DATA.subjects.slice();
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(s =>
      s.title.toLowerCase().includes(q) ||
      (s.description || "").toLowerCase().includes(q) ||
      DATA.mcqs.some(m => m.subject_id === s.id && m.question_text.toLowerCase().includes(q)));
  }
  filtered.sort((a, b) => (a.is_premium ? 1 : 0) - (b.is_premium ? 1 : 0));
  if (!filtered.length) {
    subjectGrid.innerHTML = `<article class="subject-card"><h3>No subjects found</h3><p>${searchQuery ? "Try a different search." : "No content available."}</p></article>`;
    return;
  }
  subjectGrid.innerHTML = filtered.map(s => {
    const qCount = DATA.mcqs.filter(m => m.subject_id === s.id).length;
    const tCount = DATA.tutorials.filter(t => t.subject_id === s.id).length;
    const nCount = (DATA.notes || []).filter(n => n.subject_id === s.id).length;
    const cCount = (DATA.coding || []).filter(c => c.subject_id === s.id).length;
    const totalTopics = tCount + nCount;
    const readCount = getReadTopics(s.id).size;
    const pct = totalTopics > 0 ? Math.min(100, Math.round((readCount / totalTopics) * 100)) : 0;
    const bits = [`📘 ${totalTopics} topics`, `📝 ${qCount} questions`];
    if (cCount) bits.push(`💻 ${cCount} code`);
    const meta = SUBJECT_META[s.slug] || { icon: "📚", color: "var(--brand)" };
    return `
    <article class="subject-card clickable" data-id="${s.id}" data-slug="${escapeHtml(s.slug)}" data-title="${escapeHtml(s.title)}" tabindex="0" role="button"
      style="--subject-color:${meta.color}">
      <div class="card-icon">${meta.icon}</div>
      <div class="subject-meta">
        <span class="tag ${s.is_premium ? "premium" : "free"}">${s.is_premium ? `⭐ Premium INR ${s.monthly_price_inr}/mo` : "Free"}</span>
      </div>
      <h3>${escapeHtml(s.title)}</h3>
      <p>${escapeHtml(s.description)}</p>
      <div class="subject-meta"><span class="muted">${bits.join(" • ")}</span></div>
      ${pct > 0 ? `<div class="progress-bar" title="${pct}% topics read"><div class="progress-fill" style="width:${pct}%"></div></div>` : ""}
      <span class="card-cta">Open &amp; study →</span>
    </article>`;
  }).join("");
}

function escapeHtml(v) {
  return String(v == null ? "" : v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

// ── Verilog/SV syntax highlighter ────────────────────────────────────────────
const SV_KEYWORDS = new Set("module endmodule input output inout wire reg logic bit integer real byte shortint int longint string parameter localparam always always_ff always_comb always_latch initial begin end if else case casex casez endcase for while repeat forever fork join function endfunction task endtask assign posedge negedge generate endgenerate genvar typedef struct union enum class endclass extends virtual rand randc constraint covergroup coverpoint bins cross property sequence assert assume cover interface endinterface modport clocking endclocking package endpackage import export signed unsigned packed unpacked automatic static void super this new null return break continue unique priority inside dist with iff default local protected pure extern".split(" "));

function highlightCode(raw) {
  const out = [];
  let i = 0;
  while (i < raw.length) {
    // Line comment
    if (raw[i] === '/' && raw[i+1] === '/') {
      let j = i; while (j < raw.length && raw[j] !== '\n') j++;
      out.push(`<span class="hl-cmt">${escapeHtml(raw.slice(i, j))}</span>`); i = j; continue;
    }
    // Block comment
    if (raw[i] === '/' && raw[i+1] === '*') {
      let j = i + 2; while (j < raw.length && !(raw[j] === '*' && raw[j+1] === '/')) j++;
      j += 2; out.push(`<span class="hl-cmt">${escapeHtml(raw.slice(i, j))}</span>`); i = j; continue;
    }
    // String
    if (raw[i] === '"') {
      let j = i + 1; while (j < raw.length && raw[j] !== '"') { if (raw[j] === '\\') j++; j++; }
      j++; out.push(`<span class="hl-str">${escapeHtml(raw.slice(i, j))}</span>`); i = j; continue;
    }
    // Verilog number literal: 4'b1010, 8'hFF, 32'd100
    const numLit = /^(\d+'[bdohBDOH][0-9a-fA-FxXzZ_?]+)/.exec(raw.slice(i));
    if (numLit) { out.push(`<span class="hl-num">${escapeHtml(numLit[0])}</span>`); i += numLit[0].length; continue; }
    // Word
    const word = /^[a-zA-Z_`$][a-zA-Z0-9_$]*/.exec(raw.slice(i));
    if (word) {
      const w = word[0];
      out.push(SV_KEYWORDS.has(w) ? `<span class="hl-kw">${escapeHtml(w)}</span>` : escapeHtml(w));
      i += w.length; continue;
    }
    // Plain decimal number
    const dec = /^\d+(\.\d+)?/.exec(raw.slice(i));
    if (dec) { out.push(`<span class="hl-num">${escapeHtml(dec[0])}</span>`); i += dec[0].length; continue; }
    // Everything else
    out.push(escapeHtml(raw[i])); i++;
  }
  return out.join('');
}

// Global copy handler (called from inline onclick)
function copyCode(btn) {
  const code = btn.closest('.code-block-wrap').querySelector('code').textContent;
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = '✓ Copied!'; btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1600);
  }).catch(() => { btn.textContent = 'Error'; });
}

// ── Minimal, safe Markdown renderer ──────────────────────────────────────────
function mdInline(s) {
  s = escapeHtml(s);
  s = s.replace(/`([^`]+)`/g, (m, c) => `<code>${c}</code>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return s;
}
function mdToHtml(md) {
  const lines = String(md == null ? "" : md).replace(/\r\n/g, "\n").split("\n");
  let html = "", i = 0, listType = null;
  const closeList = () => { if (listType) { html += `</${listType}>`; listType = null; } };
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    // fenced code block
    if (/^```/.test(trimmed)) {
      closeList();
      const langMatch = trimmed.match(/^```(\w+)?/);
      const lang = (langMatch && langMatch[1]) ? langMatch[1] : "verilog";
      i++; let code = "";
      while (i < lines.length && !/^```/.test(lines[i].trim())) { code += lines[i] + "\n"; i++; }
      i++;
      const rawCode = code.replace(/\n$/, "");
      const highlighted = highlightCode(rawCode);
      html += `<div class="code-block-wrap"><div class="code-header"><span class="code-lang">${escapeHtml(lang)}</span><button class="copy-btn" onclick="copyCode(this)">Copy</button></div><pre class="md-code"><code>${highlighted}</code></pre></div>`;
      continue;
    }
    // table
    if (line.includes("|") && i + 1 < lines.length && lines[i + 1].includes("|") && /^[\s|:-]+$/.test(lines[i + 1]) && lines[i + 1].includes("-")) {
      closeList();
      const parseRow = r => r.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map(c => c.trim());
      const headers = parseRow(line); i += 2;
      let t = `<table class="md-table"><thead><tr>${headers.map(h => `<th>${mdInline(h)}</th>`).join("")}</tr></thead><tbody>`;
      while (i < lines.length && lines[i].includes("|")) { t += `<tr>${parseRow(lines[i]).map(c => `<td>${mdInline(c)}</td>`).join("")}</tr>`; i++; }
      html += t + "</tbody></table>";
      continue;
    }
    let m;
    if ((m = /^(#{1,6})\s+(.*)$/.exec(trimmed))) { closeList(); const lv = Math.min(m[1].length + 1, 6); html += `<h${lv} class="md-h">${mdInline(m[2])}</h${lv}>`; i++; continue; }
    if (/^>\s?/.test(trimmed)) { closeList(); html += `<blockquote class="md-quote">${mdInline(trimmed.replace(/^>\s?/, ""))}</blockquote>`; i++; continue; }
    if (/^[-*]\s+/.test(trimmed)) { if (listType !== "ul") { closeList(); html += "<ul class='md-list'>"; listType = "ul"; } html += `<li>${mdInline(trimmed.replace(/^[-*]\s+/, ""))}</li>`; i++; continue; }
    if (/^\d+\.\s+/.test(trimmed)) { if (listType !== "ol") { closeList(); html += "<ol class='md-list'>"; listType = "ol"; } html += `<li>${mdInline(trimmed.replace(/^\d+\.\s+/, ""))}</li>`; i++; continue; }
    if (trimmed === "") { closeList(); i++; continue; }
    closeList(); html += `<p class="md-p">${mdInline(trimmed)}</p>`; i++;
  }
  closeList();
  return html;
}

// ── Search ────────────────────────────────────────────────────────────────────
searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value.trim();
  renderSubjects();
});

// Clicking the hero stat cards jumps into the subjects.
const kpiGrid = document.getElementById("kpiGrid");
if (kpiGrid) {
  kpiGrid.style.cursor = "pointer";
  kpiGrid.addEventListener("click", () => {
    document.getElementById("tracks").scrollIntoView({ behavior: "smooth" });
  });
}

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
  if (card) openSubject(Number(card.dataset.id), card.dataset.title, card.dataset.slug);
});
subjectGrid.addEventListener("keydown", e => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const card = e.target.closest(".subject-card.clickable");
  if (card) { e.preventDefault(); openSubject(Number(card.dataset.id), card.dataset.title, card.dataset.slug); }
});

modalClose.addEventListener("click", () => studyModal.classList.add("hidden"));
studyModal.addEventListener("click", e => { if (e.target === studyModal) studyModal.classList.add("hidden"); });

modalTabs.forEach(tab => tab.addEventListener("click", () => {
  modalTabs.forEach(t => t.classList.remove("active"));
  tab.classList.add("active");
  activeTab = tab.dataset.tab;
  lessonIndex = null;
  if (activeTab === "learn") renderLearn();
  else if (activeTab === "notes") renderNotes();
  else if (activeTab === "code") renderCode();
  else { quizDiffFilter = "all"; renderQuiz(); }
}));

function openSubject(id, title, slug) {
  activeSubjectId = id;
  activeSubjectSlug = slug || "";
  activeTab = "learn";
  lessonIndex = null;
  modalTabs.forEach(t => t.classList.toggle("active", t.dataset.tab === "learn"));
  modalTitle.textContent = title || "Subject";
  studyModal.classList.remove("hidden");
  renderLearn();
}

// ── Table-of-contents lesson navigation (pick a topic, read it on its own) ─────
let lessonIndex = null;

function lessonTOC(items, kind, introHtml) {
  const readSet = getReadTopics(activeSubjectId);
  return (introHtml || "") + `<div class="toc">` + items.map((t, idx) => {
    const done = readSet.has(idx);
    return `<button class="toc-item${done ? " done" : ""}" data-kind="${kind}" data-idx="${idx}">
      <span class="toc-num">${done ? "✓" : idx + 1}</span>
      <span class="toc-text"><strong>${escapeHtml(t.title)}</strong>
        <span class="muted">${escapeHtml(t.topic)}${t.reading_minutes ? " • " + t.reading_minutes + " min" : ""}</span>
      </span>
      <span class="toc-arrow">›</span>
    </button>`;
  }).join("") + `</div>`;
}

function lessonDetail(items, kind, idx) {
  markTopicRead(activeSubjectId, idx);
  const t = items[idx];
  const prev = idx > 0 ? `<button class="btn ghost sm" data-kind="${kind}" data-idx="${idx - 1}">‹ Prev</button>` : `<span></span>`;
  const next = idx < items.length - 1 ? `<button class="btn ghost sm" data-kind="${kind}" data-idx="${idx + 1}">Next ›</button>` : `<span></span>`;
  return `
    <button class="btn ghost sm toc-back" data-back="${kind}">‹ All topics</button>
    <h3 class="lesson-title">${escapeHtml(t.title)}</h3>
    <p class="muted lesson-sub">${escapeHtml(t.topic)}${t.reading_minutes ? " • " + t.reading_minutes + " min read" : ""}</p>
    <div class="lesson-md">${mdToHtml(t.content_markdown)}</div>
    <div class="lesson-nav">${prev}${next}</div>`;
}

// Delegated clicks for the TOC list, back button and prev/next.
modalBody.addEventListener("click", e => {
  const back = e.target.closest("[data-back]");
  if (back) { lessonIndex = null; (back.dataset.back === "learn" ? renderLearn() : renderNotes()); modalBody.scrollTop = 0; return; }
  const item = e.target.closest("[data-idx][data-kind]");
  if (item) { lessonIndex = Number(item.dataset.idx); (item.dataset.kind === "learn" ? renderLearn() : renderNotes()); modalBody.scrollTop = 0; }
});

function renderLearn() {
  const tutorials = DATA.tutorials
    .filter(t => t.subject_id === activeSubjectId)
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  if (!tutorials.length) {
    modalBody.innerHTML = "<p class='muted'>No tutorials for this subject yet. Try the Notes or Quiz tab.</p>"; return;
  }
  if (lessonIndex == null || lessonIndex >= tutorials.length) {
    const intro = `<p class="muted toc-intro">📘 ${tutorials.length} topics — tap any topic to learn it in full.</p>`;
    modalBody.innerHTML = lessonTOC(tutorials, "learn", intro);
  } else {
    modalBody.innerHTML = lessonDetail(tutorials, "learn", lessonIndex);
  }
}

function renderNotes() {
  const notes = (DATA.notes || []).filter(n => n.subject_id === activeSubjectId);
  if (!notes.length) {
    modalBody.innerHTML = "<p class='muted'>No quick notes for this subject yet. Try the Learn or Quiz tab.</p>"; return;
  }
  if (lessonIndex == null || lessonIndex >= notes.length) {
    const intro = `<p class="muted toc-intro">📝 Quick revision notes — tap one to read it before an exam or interview.</p>`;
    modalBody.innerHTML = lessonTOC(notes, "notes", intro);
  } else {
    modalBody.innerHTML = lessonDetail(notes, "notes", lessonIndex);
  }
}

// ── Code Lab (Verilog/SV/UVM only) ───────────────────────────────────────────
const CODE_LAB_SLUGS = ["verilog-hdl", "systemverilog-rtl", "uvm"];
const cmEditors = new Map(); // key → CodeMirror instance

function checkVerilogSyntax(code) {
  const errs = [];
  const modCount    = (code.match(/\bmodule\b/g)    || []).length;
  const endmodCount = (code.match(/\bendmodule\b/g) || []).length;
  const begCount    = (code.match(/\bbegin\b/g)     || []).length;
  const endCount    = (code.match(/\bend\b/g)        || []).length - endmodCount;
  if (modCount !== endmodCount)  errs.push(`⚠ module/endmodule mismatch (${modCount} vs ${endmodCount})`);
  if (begCount !== endCount)     errs.push(`⚠ begin/end mismatch (${begCount} vs ${endCount})`);
  if (modCount === 0)            errs.push(`⚠ No 'module' declaration found`);
  const lines = code.split('\n');
  lines.forEach((l, i) => {
    const trimmed = l.trim();
    if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*') &&
        !trimmed.endsWith(';') && !trimmed.endsWith(',') && !trimmed.endsWith('(') &&
        !trimmed.endsWith(')') && !trimmed.endsWith('{') && !trimmed.endsWith('}') &&
        !trimmed.startsWith('`') && !/\b(begin|end|endmodule|endfunction|endtask|else)\b/.test(trimmed) &&
        trimmed.length > 5) {
      // light heuristic — don't flag every line
    }
  });
  return errs;
}

function renderCode() {
  const allowedIds = new Set(DATA.subjects
    .filter(s => CODE_LAB_SLUGS.includes(s.slug))
    .map(s => s.id));

  const probs = (DATA.coding || []).filter(c => allowedIds.has(c.subject_id));

  if (!probs.length) {
    modalBody.innerHTML = "<p class='muted'>No coding problems available.</p>";
    return;
  }

  // Group by subject title
  const grouped = {};
  probs.forEach(p => {
    const subj = DATA.subjects.find(s => s.id === p.subject_id);
    const key = subj ? subj.title : "Other";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  });

  let html = `<div class="codelab-header">
    <p class="muted codelab-intro">Write your solution in the editor below. Click <strong>▶ Check &amp; Run</strong> for instant feedback, then <strong>Open Simulator</strong> to execute online.</p>
  </div>`;

  let probIdx = 0;
  Object.entries(grouped).forEach(([subjTitle, problems]) => {
    const meta = Object.values(SUBJECT_META).find(m => problems[0] &&
      DATA.subjects.find(s => s.id === problems[0].subject_id && SUBJECT_META[s.slug] === m));
    html += `<h4 class="code-group-title">${escapeHtml(subjTitle)}</h4>`;
    problems.forEach((c) => {
      const idx = probIdx++;
      html += `<div class="code-problem" id="cp_${idx}">
        <div class="code-prob-header">
          <h4>${escapeHtml(c.title)}</h4>
        </div>
        <p class="code-prompt">${escapeHtml(c.prompt)}</p>
        ${c.constraints ? `<p class="code-constraint"><strong>Constraints:</strong> ${escapeHtml(c.constraints)}</p>` : ""}
        ${c.expected_output ? `<p class="code-expected"><strong>Expected:</strong> ${escapeHtml(c.expected_output)}</p>` : ""}
        <div class="editor-wrap" id="editor_wrap_${idx}">
          <textarea id="editor_ta_${idx}">${escapeHtml(c.starter_code || "// Write your solution here\n")}</textarea>
        </div>
        <div class="code-actions-row">
          <button class="btn run-btn" data-idx="${idx}">▶ Check &amp; Run</button>
          <button class="btn ghost sm open-sim-btn" data-idx="${idx}">🌐 Open Simulator</button>
          <button class="btn ghost sm show-sol-btn" data-idx="${idx}">Show Solution</button>
        </div>
        <div class="output-panel hidden" id="output_${idx}"></div>
        <div class="sol-block hidden" id="sol_${idx}"><div class="code-block-wrap">
          <div class="code-header"><span class="code-lang">solution</span></div>
          <pre class="md-code"><code>${highlightCode(c.solution_code || "")}</code></pre>
        </div></div>
      </div>`;
    });
  });

  cmEditors.clear();
  modalBody.innerHTML = html;

  // Initialize CodeMirror or fallback textarea
  let localIdx = 0;
  Object.values(grouped).forEach(problems => {
    problems.forEach(() => {
      const idx = localIdx++;
      const ta = document.getElementById(`editor_ta_${idx}`);
      if (!ta) return;
      if (typeof CodeMirror !== 'undefined') {
        const cm = CodeMirror.fromTextArea(ta, {
          mode: "verilog", theme: "monokai",
          lineNumbers: true, matchBrackets: true,
          indentUnit: 2, tabSize: 2,
          extraKeys: { "Tab": cm => cm.execCommand("indentMore") }
        });
        cm.setSize("100%", "220px");
        cmEditors.set(idx, cm);
      } else {
        // Graceful fallback: style the textarea
        ta.style.cssText = "width:100%;height:200px;background:#161b22;color:#e6edf3;font-family:'JetBrains Mono',monospace;font-size:13px;padding:12px;border:none;resize:vertical;border-radius:0 0 8px 8px;";
      }
    });
  });

  // Button handlers
  modalBody.querySelectorAll(".run-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.idx);
      const cm = cmEditors.get(idx);
      const code = cm ? cm.getValue() : (document.getElementById(`editor_ta_${idx}`) || {}).value || "";
      const errs = checkVerilogSyntax(code);
      const out = document.getElementById(`output_${idx}`);
      out.classList.remove("hidden");
      if (errs.length === 0) {
        out.innerHTML = `<div class="output-ok">✓ Syntax check passed — no obvious errors found.<br><span class="muted">Click "Open Simulator" to compile and run with Icarus Verilog.</span></div>`;
      } else {
        out.innerHTML = `<div class="output-err"><strong>Syntax issues found:</strong><ul>${errs.map(e => `<li>${escapeHtml(e)}</li>`).join("")}</ul></div>`;
      }
    });
  });

  modalBody.querySelectorAll(".open-sim-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.idx);
      const cm = cmEditors.get(idx);
      const code = cm ? cm.getValue() : "";
      navigator.clipboard.writeText(code).catch(() => {});
      window.open("https://www.edaplayground.com/", "_blank");
      const out = document.getElementById(`output_${idx}`);
      out.classList.remove("hidden");
      out.innerHTML = `<div class="output-info">Code copied to clipboard! EDA Playground opened — paste your code in the left panel, select Icarus Verilog, and click Run.</div>`;
    });
  });

  modalBody.querySelectorAll(".show-sol-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.idx);
      const sol = document.getElementById(`sol_${idx}`);
      const visible = !sol.classList.contains("hidden");
      sol.classList.toggle("hidden", visible);
      btn.textContent = visible ? "Show Solution" : "Hide Solution";
    });
  });
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function renderQuiz() {
  let pool = DATA.mcqs.filter(m => m.subject_id === activeSubjectId);
  if (!pool.length) { modalBody.innerHTML = "<p class='muted'>No MCQs for this subject yet.</p>"; return; }

  // Build difficulty filter bar
  const diffs = ["all", ...new Set(pool.map(m => m.difficulty).filter(Boolean))];
  const filterHtml = `<div class="quiz-filter">${diffs.map(d =>
    `<button class="quiz-filter-btn${quizDiffFilter === d ? " active" : ""}" data-diff="${d}">${d === "all" ? "All" : d}</button>`
  ).join("")}</div>`;

  if (quizDiffFilter !== "all") pool = pool.filter(m => m.difficulty === quizDiffFilter);
  quizQuestions = shuffle(pool).slice(0, Math.min(10, pool.length));
  quizCurrentIndex = 0;
  quizCorrect = 0;
  quizAnswered = [];
  quizStart = Date.now();

  modalBody.innerHTML = filterHtml;
  modalBody.querySelectorAll(".quiz-filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      quizDiffFilter = btn.dataset.diff;
      renderQuiz();
    });
  });

  renderQuizQuestion();
}

function renderQuizQuestion() {
  const total = quizQuestions.length;
  const i = quizCurrentIndex;
  if (i >= total) { renderQuizResult(); return; }
  const q = quizQuestions[i];

  // Remove previous question block (keep filter bar)
  const old = modalBody.querySelector(".quiz-question-block");
  if (old) old.remove();

  const bm = isBookmarked(q.id);
  const opts = [["A","option_a"],["B","option_b"],["C","option_c"],["D","option_d"]];
  const diffTag = q.difficulty ? `<span class="diff-tag diff-${q.difficulty.toLowerCase()}">${q.difficulty}</span>` : "";

  const block = document.createElement("div");
  block.className = "quiz-question-block";
  block.innerHTML = `
    <div class="quiz-progress-wrap">
      <div class="quiz-progress-label">Question ${i + 1} of ${total}</div>
      <div class="quiz-progress-track"><div class="quiz-progress-fill" style="width:${(i / total) * 100}%"></div></div>
    </div>
    <div class="quiz-q">
      <p class="quiz-text">${i+1}. ${escapeHtml(q.question_text)}
        <button class="bookmark-btn ${bm ? "active" : ""}" data-mcqid="${q.id}" title="Bookmark">🔖</button>
      </p>
      ${diffTag}
      <div class="quiz-opts-list">
        ${opts.map(([k, f]) => `<button class="quiz-opt-btn" data-val="${k}">${k}) ${escapeHtml(q[f])}</button>`).join("")}
      </div>
    </div>`;

  modalBody.appendChild(block);

  block.querySelectorAll(".quiz-opt-btn").forEach(btn => {
    btn.addEventListener("click", () => answerQuestion(q, btn.dataset.val, block));
  });
  block.querySelector(".bookmark-btn").addEventListener("click", (e) => {
    const b = e.currentTarget;
    const added = toggleBookmark(Number(b.dataset.mcqid));
    b.classList.toggle("active", added);
  });
}

function answerQuestion(q, selected, block) {
  const isCorrect = selected === q.correct_option;
  if (isCorrect) quizCorrect++;
  quizAnswered.push({ id: q.id, selected, isCorrect });

  block.querySelectorAll(".quiz-opt-btn").forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.val === q.correct_option) btn.classList.add("correct");
    if (btn.dataset.val === selected && !isCorrect) btn.classList.add("wrong");
  });

  const fb = document.createElement("div");
  fb.className = `quiz-feedback ${isCorrect ? "correct-fb" : "wrong-fb"}`;
  fb.innerHTML = `<strong>${isCorrect ? "✓ Correct!" : "✗ Wrong"}</strong>${q.explanation ? " " + escapeHtml(q.explanation) : ""}`;

  const nextBtn = document.createElement("button");
  nextBtn.className = "btn quiz-next-btn";
  nextBtn.textContent = quizCurrentIndex + 1 < quizQuestions.length ? "Next question →" : "See results";
  nextBtn.addEventListener("click", () => {
    quizCurrentIndex++;
    renderQuizQuestion();
    modalBody.scrollTop = 0;
  });

  block.querySelector(".quiz-q").appendChild(fb);
  block.querySelector(".quiz-q").appendChild(nextBtn);

  // Update progress fill to show current answered
  const fill = block.querySelector(".quiz-progress-fill");
  if (fill) fill.style.width = `${((quizCurrentIndex + 1) / quizQuestions.length) * 100}%`;
}

function gradeFor(pct) {
  if (pct >= 90) return "A+"; if (pct >= 80) return "A"; if (pct >= 70) return "B";
  if (pct >= 60) return "C"; if (pct >= 50) return "D"; return "F";
}

function renderQuizResult() {
  const total = quizQuestions.length;
  const pct = Math.round((quizCorrect / total) * 100);
  const timeSeconds = Math.round((Date.now() - quizStart) / 1000);
  recordQuiz(quizCorrect, total);

  const msg = pct >= 80 ? "Excellent work! 🎉" : pct >= 60 ? "Good effort! Keep practicing." : "Keep studying — you'll get there! 💪";
  const opts = { A: "option_a", B: "option_b", C: "option_c", D: "option_d" };

  const reviewHtml = quizAnswered.map((a, i) => {
    const q = quizQuestions[i];
    return `<div class="review-item ${a.isCorrect ? "ok" : "err"}">
      <p class="quiz-text">${i+1}. ${escapeHtml(q.question_text)}</p>
      <p>Your answer: <strong>${a.selected}) ${escapeHtml(q[opts[a.selected]] || "")}</strong></p>
      ${!a.isCorrect ? `<p>Correct: <strong class="ok-text">${q.correct_option}) ${escapeHtml(q[opts[q.correct_option]] || "")}</strong></p>` : ""}
      ${q.explanation ? `<p class="muted">${escapeHtml(q.explanation)}</p>` : ""}
    </div>`;
  }).join("");

  modalBody.innerHTML = `
    <div class="quiz-result">
      <div class="result-circle"><span class="result-pct">${pct}%</span><span class="result-grade">${gradeFor(pct)}</span></div>
      <h3>${quizCorrect}/${total} correct &nbsp;·&nbsp; ${timeSeconds}s</h3>
      <p class="muted">${msg}</p>
      <button class="btn" id="retakeBtn">Retake quiz</button>
    </div>
    <div class="quiz-review"><h4>Review all questions</h4>${reviewHtml}</div>`;

  document.getElementById("retakeBtn").addEventListener("click", renderQuiz);
}

// ── Init ──────────────────────────────────────────────────────────────────────
renderAuthArea();
loadDashboard();

// ── Dark mode toggle ──────────────────────────────────────────────────────────
const darkToggle = document.getElementById("darkToggle");
if (darkToggle) {
  function syncDarkIcon() {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    darkToggle.textContent = isDark ? "☀️" : "🌙";
    darkToggle.title = isDark ? "Switch to light mode" : "Switch to dark mode";
  }
  syncDarkIcon();
  darkToggle.addEventListener("click", () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const next = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("vlsi_theme", next);
    syncDarkIcon();
  });
}

// ── Install app (PWA "Add to Home Screen") ────────────────────────────────────
let deferredPrompt = null;
const installBtn = document.getElementById("installBtn");
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.classList.remove("hidden");
});
if (installBtn) {
  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) {
      alert("To install: open your browser menu and tap \"Add to Home screen\".");
      return;
    }
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.classList.add("hidden");
  });
}
window.addEventListener("appinstalled", () => {
  if (installBtn) installBtn.classList.add("hidden");
});

// Register service worker for offline + installability (PWA).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
