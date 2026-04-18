(function () {
  if (window.location.hostname !== "www.linkedin.com") {
    return;
  }

  const RAW_TEXT_MAX = 8000;
  const RETRY_MS = 500;

  /**
   * Visible page text: trim, normalize newlines, cap length.
   * @returns {string}
   */
  function capturePageText() {
    const body = document.body;
    if (!body) return "";
    let t = body.innerText || "";
    t = t.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    t = t.replace(/\n{2,}/g, "\n");
    t = t.trim();
    if (t.length > RAW_TEXT_MAX) {
      t = t.slice(0, RAW_TEXT_MAX);
    }
    return t;
  }

  function emptyPayload() {
    return {
      rawText: "",
      url:
        typeof window.location.href === "string" ? window.location.href : "",
    };
  }

  /**
   * @returns {{ rawText: string, url: string }}
   */
  function scrapeJobData() {
    return {
      rawText: capturePageText(),
      url: typeof window.location.href === "string" ? window.location.href : "",
    };
  }

  /**
   * @param {(payload: ReturnType<typeof scrapeJobData>) => void} sendResponse
   * @returns {boolean}
   */
  function deliverGetJobData(sendResponse) {
    try {
      const data = scrapeJobData();
      if (!data.rawText.trim()) {
        setTimeout(() => {
          try {
            sendResponse(scrapeJobData());
          } catch {
            sendResponse(emptyPayload());
          }
        }, RETRY_MS);
        return true;
      }
      sendResponse(data);
      return false;
    } catch {
      sendResponse(emptyPayload());
      return false;
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.action !== "GET_JOB_DATA") {
      return false;
    }
    return deliverGetJobData(sendResponse);
  });
})();
