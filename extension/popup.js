/** Keep in sync with keys in background.js */
const STORAGE_KEYS = [
  "applicache_idToken",
  "applicache_accessToken",
  "applicache_refreshToken",
  "applicache_email",
  "applicache_idTokenExp",
];

function getAppOrigin() {
  const origin =
    typeof globalThis !== "undefined" && globalThis.APPLICACHE_APP_ORIGIN
      ? globalThis.APPLICACHE_APP_ORIGIN
      : "http://localhost:5173";
  return String(origin).replace(/\/$/, "");
}

/**
 * @param {Record<string, unknown>} data
 * @returns {boolean}
 */
function isSessionValid(data) {
  const idToken = data.applicache_idToken;
  if (!idToken || typeof idToken !== "string") return false;
  const exp = data.applicache_idTokenExp;
  if (typeof exp === "number" && exp <= Date.now()) return false;
  return true;
}

function render(data) {
  const guest = document.getElementById("view-guest");
  const profile = document.getElementById("user-profile");
  const emailEl = document.getElementById("user-email");
  const guestStatus = document.getElementById("guest-status");

  if (!guest || !profile || !emailEl) return;

  const authed = isSessionValid(data);

  if (authed) {
    guest.classList.add("popup__panel--hidden");
    profile.classList.remove("popup__panel--hidden");
    const email =
      typeof data.applicache_email === "string" && data.applicache_email
        ? data.applicache_email
        : "Account";
    emailEl.textContent = `Logged in as ${email}`;
  } else {
    profile.classList.add("popup__panel--hidden");
    guest.classList.remove("popup__panel--hidden");
    if (guestStatus) {
      guestStatus.textContent =
        typeof data.applicache_idTokenExp === "number" &&
        data.applicache_idTokenExp <= Date.now()
          ? "Session expired — connect again from the button below"
          : "Connect your AppliCache account — if you’re already signed in on the web, we’ll link automatically.";
    }
  }
}

function refreshFromStorage() {
  chrome.storage.local.get(STORAGE_KEYS, (result) => {
    if (chrome.runtime.lastError) {
      console.warn(chrome.runtime.lastError.message);
      return;
    }
    render(result);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  refreshFromStorage();

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    const touched = STORAGE_KEYS.some((k) =>
      Object.prototype.hasOwnProperty.call(changes, k),
    );
    if (touched) refreshFromStorage();
  });

  const loginBtn = document.getElementById("btn-login");
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      const id = chrome.runtime.id;
      const origin = getAppOrigin();
      const url = `${origin}/dashboard?from=extension&extensionId=${encodeURIComponent(id)}`;
      chrome.tabs.create({ url });
    });
  }

  const logoutBtn = document.getElementById("btn-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      chrome.storage.local.remove(STORAGE_KEYS, () => {
        refreshFromStorage();
      });
    });
  }
});
