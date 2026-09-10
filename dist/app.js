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
  reminderToggle: document.querySelector("#reminderToggle"),
  reminderTime: document.querySelector("#reminderTime"),
  reminderTimeRow: document.querySelector("#reminderTimeRow"),
  reminderDescription: document.querySelector("#reminderDescription"),
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
let installPrompt = null;
const installButton = document.querySelector("#installButton");
const installHint = document.querySelector("#installHint");
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPrompt = event;
  installButton.textContent = "نصب برنامه روی گوشی";
});
window.addEventListener("appinstalled", () => {
  installPrompt = null;
  installButton.textContent = "برنامه نصب شد";
  installButton.disabled = true;
  installHint.textContent = "";
});
installButton.addEventListener("click", async () => {
  if (installPrompt) {
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    return;
  }
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  installHint.textContent = isIOS
    ? "در Safari دکمهٔ اشتراک‌گذاری را بزنید و «Add to Home Screen» را انتخاب کنید."
    : "از منوی مرورگر گزینهٔ «Install app» یا «Add to Home screen» را انتخاب کنید.";
});
if (window.AndroidBridge) {
  document.body.classList.add("native-app");
  const reminder = JSON.parse(window.AndroidBridge.getReminderSettings());
  els.reminderToggle.checked = reminder.enabled;
  els.reminderTime.value = reminder.time || "09:00";
  els.reminderTimeRow.classList.toggle("disabled", !reminder.enabled);
  els.reminderToggle.addEventListener("change", () => {
    els.reminderTimeRow.classList.toggle("disabled", !els.reminderToggle.checked);
    if (els.reminderToggle.checked) window.AndroidBridge.enableDailyReminder(els.reminderTime.value);
    else window.AndroidBridge.disableDailyReminder();
  });
  els.reminderTime.addEventListener("change", () => {
    if (els.reminderToggle.checked) window.AndroidBridge.enableDailyReminder(els.reminderTime.value);
  });
} else {
  const WEB_REMINDER_KEY = "jooshan-web-reminder-v1";
  const savedReminder = JSON.parse(localStorage.getItem(WEB_REMINDER_KEY) || "null");
  els.reminderToggle.checked = Boolean(savedReminder?.enabled);
  els.reminderTime.value = savedReminder?.time || "09:00";
  els.reminderTimeRow.classList.toggle("disabled", !els.reminderToggle.checked);

  const base64ToUint8Array = value => {
    const padding = "=".repeat((4 - value.length % 4) % 4);
    const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from([...raw].map(char => char.charCodeAt(0)));
  };

  async function enableWebReminder() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      throw new Error("unsupported");
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("permission");
    const registration = await navigator.serviceWorker.ready;
    const keyResponse = await fetch(`${window.PUSH_API_URL}/vapid-public-key`);
    if (!keyResponse.ok) throw new Error("server");
    const { publicKey } = await keyResponse.json();
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(publicKey)
      });
    }
    const [hour, minute] = els.reminderTime.value.split(":").map(Number);
    const response = await fetch(`${window.PUSH_API_URL}/subscriptions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        hour,
        minute
      })
    });
    if (!response.ok) throw new Error("server");
    localStorage.setItem(WEB_REMINDER_KEY, JSON.stringify({ enabled: true, time: els.reminderTime.value }));
    els.reminderDescription.textContent = "اعلان روزانه فعال است";
  }

  async function disableWebReminder() {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await fetch(`${window.PUSH_API_URL}/subscriptions`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });
      await subscription.unsubscribe();
    }
    localStorage.setItem(WEB_REMINDER_KEY, JSON.stringify({ enabled: false, time: els.reminderTime.value }));
    els.reminderDescription.textContent = "هر روز در ساعت انتخاب‌شده";
  }

  els.reminderToggle.addEventListener("change", async () => {
    els.reminderToggle.disabled = true;
    try {
      if (els.reminderToggle.checked) await enableWebReminder();
      else await disableWebReminder();
    } catch (error) {
      els.reminderToggle.checked = false;
      els.reminderDescription.textContent = error.message === "permission"
        ? "اجازهٔ اعلان در مرورگر داده نشد"
        : error.message === "unsupported" ? "این مرورگر از اعلان PWA پشتیبانی نمی‌کند" : "سرویس اعلان هنوز آماده نیست";
    } finally {
      els.reminderToggle.disabled = false;
      els.reminderTimeRow.classList.toggle("disabled", !els.reminderToggle.checked);
    }
  });

  els.reminderTime.addEventListener("change", async () => {
    if (els.reminderToggle.checked) {
      try { await enableWebReminder(); }
      catch { els.reminderDescription.textContent = "ثبت ساعت جدید انجام نشد"; }
    }
  });
}
els.largeText.checked = localStorage.getItem(LARGE_TEXT_KEY) === "true";
document.documentElement.classList.toggle("large-text", els.largeText.checked);
els.largeText.addEventListener("change", () => {
  document.documentElement.classList.toggle("large-text", els.largeText.checked);
  localStorage.setItem(LARGE_TEXT_KEY, String(els.largeText.checked));
});

async function loadPrayers() {
  try {
    if (Array.isArray(window.JOOSHAN_PRAYERS)) {
      prayers = window.JOOSHAN_PRAYERS;
    } else {
      const response = await fetch("./jooshan.md");
      if (!response.ok) throw new Error("content");
      prayers = parsePrayer(await response.text());
    }
    if (prayers.length !== 100) throw new Error(`Expected 100 sections, found ${prayers.length}`);
    els.done.disabled = false;
    render();
  } catch {
    els.arabic.textContent = "متن دعا در دسترس نیست";
    els.translation.textContent = "لطفاً برنامه را به آخرین نسخه به‌روزرسانی کنید.";
  }
}

loadPrayers();

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
