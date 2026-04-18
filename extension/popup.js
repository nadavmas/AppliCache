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

function getApiBase() {
  const raw =
    typeof globalThis !== "undefined" && globalThis.APPLICACHE_API_BASE_URL
      ? globalThis.APPLICACHE_API_BASE_URL
      : "";
  const s = String(raw).trim();
  if (!s) return "";
  return s.replace(/\/$/, "");
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

/**
 * @param {Response} res
 * @returns {Promise<string>}
 */
async function parseErrorBody(res) {
  try {
    const data = await res.json();
    if (data && typeof data.message === "string") return data.message;
  } catch {
    // ignore
  }
  return `Request failed (${res.status})`;
}

/**
 * @param {"error"|"success"|"neutral"|"warning"} kind
 * @param {string} text
 */
function setCacheStatus(kind, text) {
  const el = document.getElementById("cache-status");
  if (!el) return;
  el.textContent = text;
  el.classList.remove(
    "cache-status--error",
    "cache-status--success",
    "cache-status--warning",
  );
  if (kind === "error") el.classList.add("cache-status--error");
  else if (kind === "success") el.classList.add("cache-status--success");
  else if (kind === "warning") el.classList.add("cache-status--warning");
}

function resetBoardSelect() {
  const boardSelect = document.getElementById("board-select");
  if (!boardSelect) return;
  boardSelect.innerHTML = "";
  const opt = document.createElement("option");
  opt.value = "";
  opt.textContent = "Select a board…";
  boardSelect.appendChild(opt);
}

/**
 * @param {string | undefined} url
 * @returns {boolean}
 */
function isLinkedInJobPageUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const u = new URL(url);
    if (u.hostname !== "www.linkedin.com") return false;
    return u.pathname.includes("/jobs/");
  } catch {
    return false;
  }
}

/**
 * @returns {Promise<Record<string, unknown>>}
 */
function getStorageData() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(STORAGE_KEYS, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(result);
    });
  });
}

/**
 * @param {string} boardId
 * @param {string} rawText
 * @param {string} url
 * @returns {Promise<void>}
 */
async function saveJobToAppliCache(boardId, rawText, url) {
  const base = getApiBase();
  if (!base) {
    throw new Error(
      "API URL not configured. Set APPLICACHE_API_BASE_URL in config.js.",
    );
  }
  const data = await getStorageData();
  const idToken = data.applicache_idToken;
  if (!idToken || typeof idToken !== "string") {
    throw new Error("Not signed in. Connect your account from the dashboard.");
  }

  const res = await fetch(
    `${base}/boards/${encodeURIComponent(boardId)}/smart-cache`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rawText, url }),
    },
  );

  if (res.status === 401) {
    throw new Error("Session expired. Please sign in again on the web.");
  }
  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }
}

/**
 * @param {string | undefined} msg
 * @returns {boolean}
 */
function isContentScriptConnectionError(msg) {
  if (!msg || typeof msg !== "string") return false;
  return (
    msg.includes("Could not establish connection") ||
    msg.includes("Receiving end does not exist")
  );
}

/**
 * @param {string} idToken
 * @returns {Promise<void>}
 */
async function loadBoards(idToken) {
  resetBoardSelect();
  const base = getApiBase();
  if (!base) {
    setCacheStatus(
      "error",
      "API URL not configured. Set APPLICACHE_API_BASE_URL in config.js.",
    );
    return;
  }

  try {
    const res = await fetch(`${base}/boards`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (res.status === 401) {
      setCacheStatus(
        "error",
        "Session expired. Please sign in again on the web.",
      );
      return;
    }

    if (!res.ok) {
      setCacheStatus("error", await parseErrorBody(res));
      return;
    }

    const json = await res.json();
    const boards = Array.isArray(json.boards) ? json.boards : [];
    const boardSelect = document.getElementById("board-select");
    if (!boardSelect) return;

    boardSelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select a board…";
    boardSelect.appendChild(placeholder);

    if (boards.length === 0) {
      setCacheStatus(
        "neutral",
        "No boards yet. Create one in the dashboard.",
      );
      return;
    }

    for (const b of boards) {
      const id = b.boardId;
      if (typeof id !== "string" || !id) continue;
      const opt = document.createElement("option");
      opt.value = id;
      const name =
        typeof b.boardName === "string" && b.boardName.trim()
          ? b.boardName.trim()
          : id;
      opt.textContent = name;
      boardSelect.appendChild(opt);
    }

    setCacheStatus("neutral", "");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not load boards.";
    setCacheStatus("error", msg);
  }
}

/**
 * @param {Record<string, unknown>} data
 */
function render(data) {
  const authSection = document.getElementById("auth-section");
  const loginSection = document.getElementById("login-section");
  const emailEl = document.getElementById("user-email");
  const loginMessage = document.getElementById("login-message");

  if (!authSection || !loginSection || !emailEl) return;

  const authed = isSessionValid(data);

  if (authed) {
    loginSection.classList.add("hidden");
    authSection.classList.remove("hidden");
    const email =
      typeof data.applicache_email === "string" && data.applicache_email
        ? data.applicache_email
        : "Account";
    emailEl.textContent = email;
    setCacheStatus("neutral", "");
    const idToken =
      typeof data.applicache_idToken === "string" ? data.applicache_idToken : "";
    if (idToken) {
      void loadBoards(idToken);
    }
  } else {
    authSection.classList.add("hidden");
    loginSection.classList.remove("hidden");
    resetBoardSelect();
    if (loginMessage) {
      const expired =
        typeof data.applicache_idTokenExp === "number" &&
        data.applicache_idTokenExp <= Date.now();
      loginMessage.textContent = expired
        ? "Session expired — sign in again on the web, then connect from the dashboard."
        : "Please log in to start caching jobs.";
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

  const btnCache = document.getElementById("btn-cache");
  /** @type {boolean} */
  let cacheRequestInFlight = false;
  if (btnCache) {
    btnCache.addEventListener("click", () => {
      const boardSelect = document.getElementById("board-select");
      const boardId = boardSelect && boardSelect.value ? boardSelect.value : "";
      if (!boardId) {
        setCacheStatus("error", "Select a board first.");
        return;
      }

      if (cacheRequestInFlight) {
        return;
      }

      const finishLoading = () => {
        cacheRequestInFlight = false;
        btnCache.classList.remove("btn--loading");
        btnCache.disabled = false;
        btnCache.setAttribute("aria-busy", "false");
      };

      cacheRequestInFlight = true;
      btnCache.classList.add("btn--loading");
      btnCache.disabled = true;
      btnCache.setAttribute("aria-busy", "true");
      setCacheStatus("neutral", "");

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id) {
          finishLoading();
          setCacheStatus("error", "No active tab.");
          return;
        }

        if (!isLinkedInJobPageUrl(tab.url)) {
          finishLoading();
          setCacheStatus(
            "error",
            "Open a LinkedIn jobs page (linkedin.com/jobs/…) and try again.",
          );
          return;
        }

        try {
          chrome.tabs.sendMessage(
            tab.id,
            { action: "GET_JOB_DATA" },
            (response) => {
              if (chrome.runtime.lastError) {
                finishLoading();
                const errMsg = chrome.runtime.lastError.message || "";
                if (isContentScriptConnectionError(errMsg)) {
                  setCacheStatus(
                    "error",
                    "Please refresh the LinkedIn page and try again.",
                  );
                } else {
                  setCacheStatus(
                    "error",
                    "Open a LinkedIn jobs page and try again.",
                  );
                }
                return;
              }

              void (async () => {
                try {
                  if (
                    !response ||
                    typeof response !== "object" ||
                    typeof response.rawText !== "string" ||
                    typeof response.url !== "string"
                  ) {
                    setCacheStatus(
                      "error",
                      "Could not read this page. Open a LinkedIn jobs page and try again.",
                    );
                    return;
                  }

                  const raw = response.rawText.trim();
                  if (raw.length <= 100) {
                    setCacheStatus(
                      "warning",
                      "Not enough text on this page. Open a job or scroll to load content, then try again.",
                    );
                    return;
                  }

                  setCacheStatus("neutral", "Saving…");
                  await saveJobToAppliCache(
                    boardId,
                    response.rawText,
                    response.url,
                  );
                  setCacheStatus("success", "Saved to your board.");
                } catch (e) {
                  const msg =
                    e instanceof Error ? e.message : "Could not save to your board.";
                  setCacheStatus("error", msg);
                } finally {
                  finishLoading();
                }
              })();
            },
          );
        } catch {
          finishLoading();
          setCacheStatus(
            "error",
            "Please refresh the LinkedIn page and try again.",
          );
        }
      });
    });
  }
});
