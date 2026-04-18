/**
 * Must stay aligned with `externally_connectable.matches` in manifest.json
 * (scheme + host + port). Add your production SPA origin here and in the manifest when deploying.
 */
(function () {
  const g = typeof globalThis !== "undefined" ? globalThis : self;
  if (!g) return;
  g.APPLICACHE_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    // "https://your-production-host.example",
  ];
  g.APPLICACHE_APP_ORIGIN = g.APPLICACHE_ALLOWED_ORIGINS[0];
})();
