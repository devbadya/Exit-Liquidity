/** Assets & API-Origin — funktioniert auch bei file:// / Live Server */
(function () {
  var DEV = 'http://localhost:3001';

  function apiOrigin() {
    if (location.protocol === 'file:') return DEV;
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      if (!location.port || location.port !== '3001') return DEV;
    }
    return location.origin;
  }

  var ORIGIN = apiOrigin();
  window.TOKENSYNC_API_ORIGIN = ORIGIN;

  function assetUrl(path) {
    return ORIGIN + (path.startsWith('/') ? path : '/' + path);
  }

  function fixAssets() {
    var css = document.getElementById('main-css') || document.querySelector('link[rel="stylesheet"]');
    if (css) css.href = assetUrl('/css/styles.css') + '?v=' + Date.now();

    document.querySelectorAll('script[src]').forEach(function (s) {
      var src = s.getAttribute('src');
      if (!src || src.startsWith('http')) return;
      s.src = assetUrl(src);
    });

    var icon = document.querySelector('link[rel="icon"]');
    if (icon) icon.href = assetUrl('/favicon.svg');
  }

  fixAssets();
  if (location.protocol === 'file:') {
    document.addEventListener('DOMContentLoaded', function () {
      fixAssets();
      var app = document.getElementById('app');
      if (app) {
        app.innerHTML =
          '<div style="padding:2rem;max-width:36rem;color:#e2e8f0">' +
          '<h2 style="color:#f87171">Falsch geöffnet</h2>' +
          '<p>Bitte <a href="' +
          DEV +
          '" style="color:#22d3ee">' +
          DEV +
          '</a> öffnen (nach <code>npm run dev</code>).</p></div>';
      }
    });
  }
})();
