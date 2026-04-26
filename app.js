const LETTERS = ["A", "B", "C", "D"];

const els = {
  bankTitle: document.getElementById("bankTitle"),
  cardLoading: document.getElementById("cardLoading"),
  cardBody: document.getElementById("cardBody"),
  cardError: document.getElementById("cardError"),
  qEn: document.getElementById("qEn"),
  qAr: document.getElementById("qAr"),
  optionsGrid: document.getElementById("optionsGrid"),
  feedback: document.getElementById("feedback"),
  feedbackBanner: document.getElementById("feedbackBanner"),
  correctOption: document.getElementById("correctOption"),
  explanation: document.getElementById("explanation"),
  btnPrev: document.getElementById("btnPrev"),
  btnNext: document.getElementById("btnNext"),
  btnShuffle: document.getElementById("btnShuffle"),
  btnTheme: document.getElementById("btnTheme"),
  progressLabel: document.getElementById("progressLabel"),
  scoreLabel: document.getElementById("scoreLabel"),
  progressFill: document.getElementById("progressFill"),
  progressBar: document.querySelector(".progress-bar"),
  searchInput: document.getElementById("searchInput"),
};

let data = null;
/** @type {number[]} order — indices into data.questions */
let order = [];
let pos = 0;
let selected = null;
let revealed = false;
let correctCount = 0;
let attempted = new Set();

function loadTheme() {
  const t = localStorage.getItem("mcq-theme");
  if (t === "dark" || (!t && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
    document.documentElement.setAttribute("data-theme", "dark");
    els.btnTheme.querySelector(".theme-icon").textContent = "☀";
  } else {
    document.documentElement.removeAttribute("data-theme");
    els.btnTheme.querySelector(".theme-icon").textContent = "☾";
  }
}

function toggleTheme() {
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  if (dark) {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("mcq-theme", "light");
    els.btnTheme.querySelector(".theme-icon").textContent = "☾";
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("mcq-theme", "dark");
    els.btnTheme.querySelector(".theme-icon").textContent = "☀";
  }
}

function shuffleOrder() {
  order = order.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  pos = 0;
  selected = null;
  revealed = false;
  correctCount = 0;
  attempted = new Set();
  els.scoreLabel.hidden = false;
  render();
}

function applySearch() {
  const q = els.searchInput.value.trim().toLowerCase();
  if (!data) return;
  if (!q) {
    order = data.questions.map((_, i) => i);
  } else {
    order = [];
    data.questions.forEach((item, i) => {
      const hay = `${item.question.en} ${item.question.ar}`.toLowerCase();
      if (hay.includes(q)) order.push(i);
    });
  }
  pos = 0;
  selected = null;
  revealed = false;
  render();
}

function currentQuestion() {
  const idx = order[pos];
  return data.questions[idx];
}

function render() {
  if (!data || order.length === 0) {
    els.progressLabel.textContent = els.searchInput.value.trim()
      ? "لا توجد أسئلة مطابقة للبحث"
      : "—";
    els.progressFill.style.width = "0%";
    els.qEn.textContent = "";
    els.qAr.textContent = "";
    els.optionsGrid.innerHTML = "";
    els.feedback.classList.add("hidden");
    return;
  }

  const item = currentQuestion();
  const n = order.length;
  const displayNum = pos + 1;

  els.progressLabel.textContent = `السؤال ${displayNum} من ${n}`;
  els.scoreLabel.textContent = `صحيح: ${correctCount}`;
  const pct = (displayNum / n) * 100;
  els.progressFill.style.width = `${pct}%`;
  els.progressBar.setAttribute("aria-valuemax", String(n));
  els.progressBar.setAttribute("aria-valuenow", String(displayNum));

  els.qEn.textContent = item.question.en;
  els.qAr.textContent = item.question.ar;

  els.optionsGrid.innerHTML = "";
  LETTERS.forEach((L, i) => {
    const text = item.options[L] ?? "";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-btn";
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-checked", "false");
    btn.dataset.letter = L;
    btn.innerHTML = `<span class="option-key">${L}</span><span class="option-text"></span>`;
    btn.querySelector(".option-text").textContent = text || "(لا نص في المصدر)";
    btn.addEventListener("click", () => choose(L));
    els.optionsGrid.appendChild(btn);
  });

  els.feedback.classList.add("hidden");
  els.feedbackBanner.className = "feedback-banner";
  selected = null;
  revealed = false;

  if (attempted.has(order[pos])) {
    const prev = attempted.get(order[pos]);
    if (prev) {
      selected = prev.choice;
      revealed = true;
      showFeedback(prev.choice);
    }
  }

  els.btnPrev.disabled = pos === 0;
  els.btnNext.disabled = pos >= n - 1;
}

function choose(letter) {
  if (revealed) return;
  selected = letter;
  revealed = true;
  const item = currentQuestion();
  const idx = order[pos];
  const ok = letter === item.correct;
  if (ok && !attempted.has(idx)) correctCount += 1;
  attempted.set(idx, { choice: letter, ok });

  showFeedback(letter);
  els.scoreLabel.hidden = false;
  els.scoreLabel.textContent = `صحيح: ${correctCount}`;
}

function showFeedback(letter) {
  const item = currentQuestion();
  const ok = letter === item.correct;

  els.feedback.classList.remove("hidden");
  els.feedbackBanner.textContent = ok ? "إجابة صحيحة — أحسنت" : "إجابة غير صحيحة — راجع الشرح";
  els.feedbackBanner.classList.add(ok ? "ok" : "bad");

  const correctText = item.options[item.correct] ?? "";
  els.correctOption.textContent = `${item.correct}) ${correctText}`;
  els.explanation.textContent = item.explanation;

  els.optionsGrid.querySelectorAll(".option-btn").forEach((btn) => {
    const L = btn.dataset.letter;
    btn.disabled = true;
    if (L === item.correct) btn.classList.add("correct");
    if (L === letter && L !== item.correct) btn.classList.add("wrong");
    if (L === letter) btn.classList.add("selected");
    btn.setAttribute("aria-checked", L === letter ? "true" : "false");
  });
}

function go(delta) {
  const n = order.length;
  if (n === 0) return;
  const next = pos + delta;
  if (next < 0 || next >= n) return;
  pos = next;
  render();
}

async function init() {
  loadTheme();
  els.btnTheme.addEventListener("click", toggleTheme);
  els.btnShuffle.addEventListener("click", shuffleOrder);
  els.btnPrev.addEventListener("click", () => go(-1));
  els.btnNext.addEventListener("click", () => go(1));
  els.searchInput.addEventListener(
    "input",
    debounce(() => applySearch(), 200)
  );

  document.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      go(e.key === "ArrowRight" ? 1 : -1);
    }
    if (!revealed && /^[1-4]$/.test(e.key)) {
      const L = LETTERS[Number(e.key) - 1];
      choose(L);
    }
  });

  try {
    const res = await fetch("questions.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
    els.bankTitle.textContent = data.title || "بنك الأسئلة";
    document.title = `${els.bankTitle.textContent} — MCQ`;
    order = data.questions.map((_, i) => i);
    els.cardLoading.classList.add("hidden");
    els.cardBody.classList.remove("hidden");
    render();
  } catch (err) {
    els.cardLoading.classList.add("hidden");
    els.cardError.classList.remove("hidden");
    els.cardError.textContent =
      "تعذر تحميل questions.json. افتح الموقع عبر خادم محلي أو بعد رفعه على GitHub Pages.";
    console.error(err);
  }
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

init();
