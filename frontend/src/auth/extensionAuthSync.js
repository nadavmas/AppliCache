import { fetchAuthSession } from "aws-amplify/auth";

export const APPLICACHE_AUTH_SYNC_TYPE = "APPLICACHE_AUTH_SYNC";

/**
 * @param {unknown} token
 * @returns {string}
 */
function tokenToString(token) {
  if (token == null) return "";
  if (typeof token === "object" && token !== null && "toString" in token) {
    const fn = /** @type {{ toString?: () => string }} */ (token).toString;
    if (typeof fn === "function") return fn.call(token);
  }
  return String(token);
}

/**
 * @param {string} jwt
 * @returns {{ email?: string } | null }
 */
function decodeJwtPayload(jwt) {
  if (!jwt || typeof jwt !== "string") return null;
  const parts = jwt.split(".");
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function canUseChromeExtensionBridge() {
  if (typeof window === "undefined") return false;
  if (typeof window.chrome === "undefined") return false;
  if (typeof window.chrome.runtime?.sendMessage !== "function") return false;
  return true;
}

/**
 * Sends Cognito tokens to the Chrome extension (externally_connectable).
 * No-ops safely when not in Chromium or extension APIs are missing.
 *
 * @param {string} extensionId
 * @returns {Promise<{ ok: boolean; skipped?: boolean }>}
 */
export async function syncAuthTokensToExtensionIfNeeded(extensionId) {
  if (!extensionId || typeof extensionId !== "string") {
    return { ok: false, skipped: true };
  }
  if (!canUseChromeExtensionBridge()) {
    return { ok: false, skipped: true };
  }

  try {
    const session = await fetchAuthSession();
    const idToken = tokenToString(session.tokens?.idToken);
    const accessToken = tokenToString(session.tokens?.accessToken);
    const tokens = /** @type {{ refreshToken?: unknown }} */ (session.tokens);
    const refreshToken = tokenToString(tokens?.refreshToken);

    if (!idToken) {
      return { ok: false, skipped: true };
    }

    const payload = decodeJwtPayload(idToken);
    const email =
      typeof payload?.email === "string"
        ? payload.email
        : typeof payload?.["cognito:username"] === "string"
          ? payload["cognito:username"]
          : "";

    const message = {
      type: APPLICACHE_AUTH_SYNC_TYPE,
      idToken,
      accessToken,
      refreshToken,
      email,
    };

    await new Promise((resolve, reject) => {
      try {
        window.chrome.runtime.sendMessage(extensionId, message, (response) => {
          const err = window.chrome.runtime.lastError;
          if (err) {
            reject(new Error(err.message));
            return;
          }
          resolve(response);
        });
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });

    return { ok: true };
  } catch (e) {
    if (import.meta.env.DEV) {
      console.debug("[AppliCache] Extension auth sync skipped", e);
    }
    return { ok: false, skipped: true };
  }
}
