importScripts("config.js");

const AUTH_SYNC_TYPE = "APPLICACHE_AUTH_SYNC";

const STORAGE_KEYS = {
  idToken: "applicache_idToken",
  accessToken: "applicache_accessToken",
  refreshToken: "applicache_refreshToken",
  email: "applicache_email",
  username: "applicache_username",
  idTokenExp: "applicache_idTokenExp",
};

/**
 * @param {chrome.runtime.MessageSender} sender
 * @returns {boolean}
 */
function isAllowedSender(sender) {
  const url = sender?.url;
  if (!url || typeof url !== "string") return false;
  const origins = self.APPLICACHE_ALLOWED_ORIGINS || [];
  return origins.some(
    (origin) => url.startsWith(`${origin}/`) || url === origin,
  );
}

/**
 * @param {string} jwt
 * @returns {number | null} expiry in ms, or null
 */
function idTokenExpMs(jwt) {
  if (!jwt || typeof jwt !== "string") return null;
  const parts = jwt.split(".");
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json);
    const exp = payload?.exp;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

chrome.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    if (!isAllowedSender(sender)) {
      sendResponse({ ok: false, error: "forbidden" });
      return false;
    }

    if (!message || message.type !== AUTH_SYNC_TYPE) {
      sendResponse({ ok: false, error: "unknown_type" });
      return false;
    }

    const idToken = typeof message.idToken === "string" ? message.idToken : "";
    const accessToken =
      typeof message.accessToken === "string" ? message.accessToken : "";
    const refreshToken =
      typeof message.refreshToken === "string" ? message.refreshToken : "";
    const email = typeof message.email === "string" ? message.email : "";
    const username =
      typeof message.username === "string" ? message.username : "";

    if (!idToken) {
      sendResponse({ ok: false, error: "missing_id_token" });
      return false;
    }

    const expMs = idTokenExpMs(idToken);
    /** @type {Record<string, string | number>} */
    const payload = {
      [STORAGE_KEYS.idToken]: idToken,
      [STORAGE_KEYS.accessToken]: accessToken,
      [STORAGE_KEYS.refreshToken]: refreshToken,
      [STORAGE_KEYS.email]: email,
      [STORAGE_KEYS.username]: username,
    };
    if (expMs != null) {
      payload[STORAGE_KEYS.idTokenExp] = expMs;
    }

    chrome.storage.local.set(payload, () => {
      const err = chrome.runtime.lastError;
      if (err) {
        sendResponse({ ok: false, error: err.message });
        return;
      }
      sendResponse({ ok: true });
    });

    return true;
  },
);
