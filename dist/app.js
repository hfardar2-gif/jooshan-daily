const STORAGE_KEY = "jooshan-daily-state-v1";
const LARGE_TEXT_KEY = "jooshan-large-text";
const fa = new Intl.NumberFormat("fa-IR", { useGrouping: false });

const els = {
  arabic: document.querySelector("#arabicText"),
  translation: document.querySelector("#translationText"),
  section: document.querySelector("#sectionChip"),
  day: document.querySelector("#dayLabel"),
  percent: document.querySelector("#percentLabel"),
  fill: document.querySelector("#progressFill"),
  streak: document.querySelector("#streakLabel"),
  done: document.querySelector("#doneButton"),
  doneText: document.querySelector("#doneButtonText"),
  next: document.querySelector("#nextNote"),
  dialog: document.querySelector("#settingsDialog"),
  largeText: document.querySelector("#largeTextToggle"),
  settingsProgress: document.querySelector("#settingsProgress"),
  settingsBadge: document.querySelector("#settingsBadge"),
  celebration: document.querySelector("#celebration")
};

const todayKey = () => new Date().toLocaleDateString("en-CA");
const addDays = (dateKey, days) => {
  const date = new Date(dateKey + "T12:00:00");
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("en-CA");
};

function getState() {
  try {
    return { completed: [], streak: 0, lastRead: null, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
  } catch {
    return { completed: [], streak: 0, lastRead: null };
  }
}

function cleanText(text) {
  return text.replace(/\*\*/g, "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function parsePrayer(markdown) {
  const lines = markdown.split(/\r?\n/).map(cleanText).filter(Boolean);
  const parts = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/\(([۰-۹]+)\)\s*$/);
    if (!match) continue;
    const number = Number(match[1].replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
    if (!number || number > 100 || parts.some(p => p.number === number)) continue;
    const arabic = lines[i].replace(/\s*\([۰-۹]+\)\s*$/, "").replace(/^\([۰-۹]+\)\s*/, "");
    const translation = lines[i + 1] || "";
    parts.push({ number, arabic, translation });
  }
  return parts.sort((a, b) => a.number - b.number);
}

let prayers = [];

function render() {
  const state = getState();
  const completedToday = state.lastRead === todayKey() || state.completed.length >= 100;
  const progress = state.completed.length;
  const index = Math.min(completedToday && progress ? progress - 1 : progress, 99);
  const prayer = prayers[index];
  const displayDay = completedToday ? Math.max(progress, 1) : Math.min(progress + 1, 100);

  els.arabic.textContent = prayer.arabic;
  els.translation.textContent = prayer.translation;
  els.section.textContent = `بند ${fa.format(prayer.number)}`;
  els.day.textContent = `روز ${fa.format(displayDay)} از ۱۰۰`;
  els.percent.textContent = `${fa.format(progress)}٪`;
  els.fill.style.width = `${progress}%`;
  els.settingsProgress.textContent = `${fa.format(progress)} بند خوانده شده`;
  els.settingsBadge.textContent = `${progress}/100`;
  els.streak.textContent = state.streak > 1 ? `${fa.format(state.streak)} روز همراهی پیوسته` : progress ? "اولین قدم روشن برداشته شد" : "آغاز یک مسیر روشن";

  els.done.disabled = completedToday;
  els.done.classList.toggle("complete", completedToday);
  if (state.completed.length >= 100) {
    els.doneText.textContent = "دوره کامل شد";
    els.next.textContent = "صد بند را با حضور خواندی؛ قبول باشد";
  } else if (completedToday) {
    els.doneText.textContent = "امروز خوانده شد";
    els.next.textContent = "بند بعدی فردا برایت آماده است";
  } else {
    els.doneText.textContent = "خواندم";
    els.next.textContent = "پس از خواندن، پیشرفت امروزت را ثبت کن";
  }
}

function celebrate() {
  const colors = ["#39d2c0", "#e9c46a", "#fff2bf"];
  for (let i = 0; i < 26; i++) {
    const spark = document.createElement("i");
    spark.className = "spark";
    spark.style.left = Math.random() * 100 + "vw";
    spark.style.top = 50 + Math.random() * 20 + "vh";
    spark.style.background = colors[i % colors.length];
    spark.style.animationDelay = Math.random() * .25 + "s";
    els.celebration.appendChild(spark);
    setTimeout(() => spark.remove(), 1600);
  }
}

els.done.addEventListener("click", () => {
  const state = getState();
  if (state.lastRead === todayKey() || state.completed.length >= 100) return;
  const yesterday = addDays(todayKey(), -1);
  state.streak = state.lastRead === yesterday ? state.streak + 1 : 1;
  state.lastRead = todayKey();
  state.completed.push(state.completed.length + 1);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  navigator.vibrate?.(35);
  celebrate();
  render();
});

document.querySelector("#settingsButton").addEventListener("click", () => els.dialog.showModal());
els.largeText.checked = localStorage.getItem(LARGE_TEXT_KEY) === "true";
document.body.classList.toggle("large-text", els.largeText.checked);
els.largeText.addEventListener("change", () => {
  document.body.classList.toggle("large-text", els.largeText.checked);
  localStorage.setItem(LARGE_TEXT_KEY, String(els.largeText.checked));
});
document.querySelector("#resetButton").addEventListener("click", () => {
  if (!confirm("پیشرفت دوره پاک شود و از بند اول شروع کنید؟")) return;
  localStorage.removeItem(STORAGE_KEY);
  els.dialog.close();
  render();
});

fetch("./jooshan.md")
  .then(response => {
    if (!response.ok) throw new Error("content");
    return response.text();
  })
  .then(markdown => {
    prayers = parsePrayer(markdown);
    if (prayers.length !== 100) throw new Error(`Expected 100 sections, found ${prayers.length}`);
    els.done.disabled = false;
    render();
  })
  .catch(() => {
    els.arabic.textContent = "متن دعا در دسترس نیست";
    els.translation.textContent = "لطفاً برنامه را یک‌بار با اینترنت باز کنید.";
  });

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
