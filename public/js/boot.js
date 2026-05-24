/** API-Origin & Redirect auf Port 3001 — Skripte nicht nachträglich umschreiben (bricht Safari). */
(function () {
  var host = location.hostname;
  var DEV =
    host === '127.0.0.1' ? 'http://127.0.0.1:3001' : 'http://localhost:3001';

  if (location.protocol !== 'file:') {
    if ((host === 'localhost' || host === '127.0.0.1') && location.port !== '3001') {
      location.replace(DEV + location.pathname + location.search + location.hash);
      return;
    }
    window.TOKENSYNC_API_ORIGIN = location.origin;
  } else {
    window.TOKENSYNC_API_ORIGIN = DEV;
    document.addEventListener('DOMContentLoaded', function () {
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
