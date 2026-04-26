const LETTERS = ["A", "B", "C", "D"];
const SITE_NAME = "هياكل البيانات والخوارزميات";

const els = {
  bankTitle: document.getElementById("bankTitle"),
  cardLoading: document.getElementById("cardLoading"),
  cardBody: document.getElementById("cardBody"),
  cardError: document.getElementById("cardError"),
  quizCard: document.getElementById("quizCard"),
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
  tabPractice: document.getElementById("tabPractice"),
  tabExam: document.getElementById("tabExam"),
  practiceTools: document.getElementById("practiceTools"),
  examSetup: document.getElementById("examSetup"),
  examSlider: document.getElementById("examSizeSlider"),
  examSizeValue: document.getElementById("examSizeValue"),
  examBankHint: document.getElementById("examBankHint"),
  btnStartExam: document.getElementById("btnStartExam"),
  examBadge: document.getElementById("examBadge"),
  summaryModal: document.getElementById("summaryModal"),
  summaryBackdrop: document.getElementById("summaryBackdrop"),
  summaryRing: document.getElementById("summaryRing"),
  summaryPercent: document.getElementById("summaryPercent"),
  summaryStats: document.getElementById("summaryStats"),
  summaryNewExam: document.getElementById("summaryNewExam"),
  summaryToPractice: document.getElementById("summaryToPractice"),
};

let data = null;
/** @type {number[]} order — indices into data.questions */
let order = [];
let pos = 0;
let selected = null;
let revealed = false;
let correctCount = 0;
/** @type {Map<number, { choice: string, ok: boolean }>} */
let attempted = new Map();

/** @type {'practice' | 'exam'} */
let activeTab = "practice";
/** True بينما الاختبار قيد التنفيذ */
let examSession = false;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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

function updateExamBankHint() {
  if (!data) return;
  const n = data.questions.length;
  const maxPick = Math.max(20, Math.min(100, n));
  els.examSlider.max = String(maxPick);
  let v = Number(els.examSlider.value);
  if (v > maxPick) v = maxPick;
  if (v < 20) v = 20;
  els.examSlider.value = String(v);
  els.examSizeValue.textContent = String(v);
  els.examBankHint.textContent =
    n >= 100
      ? `البنك المدمَج يحتوي على ${n} سؤالاً. الحد الأعلى لعدد أسئلة الجولة هو 100.`
      : `البنك المدمَج يحتوي على ${n} سؤالاً. يمكنك اختيار حتى ${maxPick} سؤالاً في هذه الجولة.`;
}

function setActiveTab(tab) {
  activeTab = tab;
  const isPractice = tab === "practice";

  els.tabPractice.classList.toggle("is-active", isPractice);
  els.tabPractice.setAttribute("aria-selected", isPractice ? "true" : "false");
  els.tabExam.classList.toggle("is-active", !isPractice);
  els.tabExam.setAttribute("aria-selected", !isPractice ? "true" : "false");

  if (isPractice) {
    examSession = false;
    els.practiceTools.classList.remove("hidden");
    els.examSetup.classList.add("hidden");
    els.quizCard.classList.remove("hidden");
    els.examBadge.classList.add("hidden");
    applySearch();
    return;
  }

  els.practiceTools.classList.add("hidden");
  if (!examSession) {
    els.examSetup.classList.remove("hidden");
    els.quizCard.classList.add("hidden");
    els.examBadge.classList.add("hidden");
  } else {
    els.examSetup.classList.add("hidden");
    els.quizCard.classList.remove("hidden");
    els.examBadge.classList.remove("hidden");
  }
}

function startExam() {
  if (!data) return;
  const total = data.questions.length;
  if (total < 20) {
    window.alert("البنك يحتوي على أقل من 20 سؤالاً — لا يمكن تشغيل الاختبار بهذا الحد.");
    return;
  }
  const cap = Math.min(100, total);
  const want = Math.min(cap, Math.max(20, Number(els.examSlider.value) || 50));
  const take = want;
  const allIdx = data.questions.map((_, i) => i);
  order = shuffle(allIdx).slice(0, take);
  examSession = true;
  pos = 0;
  selected = null;
  revealed = false;
  correctCount = 0;
  attempted = new Map();

  els.examSetup.classList.add("hidden");
  els.quizCard.classList.remove("hidden");
  els.examBadge.classList.remove("hidden");
  els.examBadge.textContent = `اختبار: ${take} سؤالاً`;
  els.scoreLabel.hidden = false;
  render();
}

function shufflePracticeOrder() {
  if (!data || examSession) return;
  order = shuffle(order.length ? order : data.questions.map((_, i) => i));
  pos = 0;
  selected = null;
  revealed = false;
  correctCount = 0;
  attempted = new Map();
  els.scoreLabel.hidden = false;
  render();
}

function applySearch() {
  if (!data || examSession) return;
  const q = els.searchInput.value.trim().toLowerCase();
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

function openExamSummary() {
  const total = order.length;
  let answered = 0;
  let wrong = 0;
  for (const idx of order) {
    const a = attempted.get(idx);
    if (a) {
      answered++;
      if (!a.ok) wrong++;
    }
  }
  const pct = total ? Math.round((correctCount / total) * 100) : 0;
  els.summaryRing.style.setProperty("--p", pct);
  els.summaryPercent.textContent = `${pct}%`;
  els.summaryStats.innerHTML = `
    <li><span>إجمالي الأسئلة</span><strong>${total}</strong></li>
    <li><span>إجابات صحيحة</span><strong>${correctCount}</strong></li>
    <li><span>إجابات خاطئة</span><strong>${wrong}</strong></li>
    <li><span>لم تُجب بعد</span><strong>${total - answered}</strong></li>
  `;
  els.summaryModal.classList.remove("hidden");
}

function closeSummary() {
  els.summaryModal.classList.add("hidden");
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
  els.scoreLabel.hidden = examSession ? false : correctCount === 0 && attempted.size === 0;
  const pct = (displayNum / n) * 100;
  els.progressFill.style.width = `${pct}%`;
  els.progressBar.setAttribute("aria-valuemax", String(n));
  els.progressBar.setAttribute("aria-valuenow", String(displayNum));

  els.qEn.textContent = item.question.en;
  els.qAr.textContent = item.question.ar ?? "";
  const arBlock = els.qAr.closest(".question-block");
  if (arBlock) {
    arBlock.classList.toggle("hidden", !String(item.question.ar ?? "").trim());
  }

  els.optionsGrid.innerHTML = "";
  LETTERS.forEach((L) => {
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

  const last = pos >= n - 1;
  if (examSession) {
    els.btnNext.disabled = !revealed;
    els.btnNext.textContent = last && revealed ? "عرض النتيجة" : "التالي";
  } else {
    els.btnNext.disabled = last;
    els.btnNext.textContent = "التالي";
  }

  if (order.length > 0) {
    els.cardBody.classList.remove("animate-in");
    void els.cardBody.offsetWidth;
    els.cardBody.classList.add("animate-in");
  }
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

  const n = order.length;
  const last = pos >= n - 1;
  if (examSession) {
    els.btnNext.disabled = false;
    els.btnNext.textContent = last ? "عرض النتيجة" : "التالي";
  } else {
    els.btnNext.disabled = last;
  }
}

function showFeedback(letter) {
  const item = currentQuestion();
  const ok = letter === item.correct;

  els.feedback.classList.remove("hidden");
  els.feedbackBanner.textContent = ok ? "إجابة صحيحة — أحسنت" : "إجابة غير صحيحة — راجع الشرح";
  els.feedbackBanner.classList.remove("ok", "bad", "pulse-ok", "pulse-bad");
  void els.feedbackBanner.offsetWidth;
  els.feedbackBanner.classList.add(ok ? "ok" : "bad", ok ? "pulse-ok" : "pulse-bad");

  const correctText = item.options[item.correct] ?? "";
  els.correctOption.textContent = `${item.correct}) ${correctText}`;
  els.explanation.textContent = item.explanation;

  els.optionsGrid.querySelectorAll(".option-btn").forEach((btn) => {
    const L = btn.dataset.letter;
    btn.disabled = true;
    btn.classList.remove("shake-wrong");
    if (L === item.correct) btn.classList.add("correct");
    if (L === letter && L !== item.correct) {
      btn.classList.add("wrong");
      void btn.offsetWidth;
      btn.classList.add("shake-wrong");
    }
    if (L === letter) btn.classList.add("selected");
    btn.setAttribute("aria-checked", L === letter ? "true" : "false");
  });
}

function go(delta) {
  const n = order.length;
  if (n === 0) return;
  if (examSession && delta > 0 && !revealed) return;
  const next = pos + delta;
  if (next < 0 || next >= n) return;
  pos = next;
  render();
}

function onNextClick() {
  if (examSession && pos === order.length - 1 && revealed) {
    openExamSummary();
    return;
  }
  go(1);
}

async function init() {
  loadTheme();
  els.btnTheme.addEventListener("click", toggleTheme);
  els.tabPractice.addEventListener("click", () => setActiveTab("practice"));
  els.tabExam.addEventListener("click", () => setActiveTab("exam"));
  els.btnStartExam.addEventListener("click", startExam);
  els.btnShuffle.addEventListener("click", () => {
    els.btnShuffle.classList.remove("is-pressed");
    void els.btnShuffle.offsetWidth;
    els.btnShuffle.classList.add("is-pressed");
    shufflePracticeOrder();
  });
  els.btnPrev.addEventListener("click", () => go(-1));
  els.btnNext.addEventListener("click", onNextClick);
  els.searchInput.addEventListener("input", debounce(() => applySearch(), 200));

  els.examSlider.addEventListener("input", () => {
    els.examSizeValue.textContent = els.examSlider.value;
  });

  els.summaryBackdrop.addEventListener("click", closeSummary);
  els.summaryNewExam.addEventListener("click", () => {
    closeSummary();
    examSession = false;
    els.examBadge.classList.add("hidden");
    setActiveTab("exam");
  });
  els.summaryToPractice.addEventListener("click", () => {
    closeSummary();
    setActiveTab("practice");
  });

  document.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (!els.summaryModal.classList.contains("hidden")) {
      if (e.key === "Escape") closeSummary();
      return;
    }
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      go(e.key === "ArrowRight" ? 1 : -1);
    }
    if (!revealed && /^[1-4]$/.test(e.key)) {
      const L = LETTERS[Number(e.key) - 1];
      choose(L);
    }
    if (revealed && e.key === "Enter" && !els.btnNext.disabled) {
      e.preventDefault();
      onNextClick();
    }
  });

  try {
    const res = await fetch("questions.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
    els.bankTitle.textContent = SITE_NAME;
    document.title = `${SITE_NAME} — MCQ`;
    order = data.questions.map((_, i) => i);
    updateExamBankHint();
    els.examSizeValue.textContent = els.examSlider.value;
    els.cardLoading.classList.add("hidden");
    els.cardBody.classList.remove("hidden");
    setActiveTab("practice");
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
