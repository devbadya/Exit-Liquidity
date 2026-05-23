/** Erkennt falschen Aufruf (file://, Live Server) und leitet API auf Port 3001 */
(function () {
  function apiOrigin() {
    if (location.protocol === 'file:') return 'http://localhost:3001';
    if (
      location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1'
    ) {
      if (location.port && location.port !== '3001') return 'http://localhost:3001';
    }
    return location.origin;
  }

  window.TOKENSYNC_API_ORIGIN = apiOrigin();

  if (location.protocol === 'file:') {
    document.addEventListener('DOMContentLoaded', function () {
      var link = document.querySelector('link[rel="stylesheet"]');
      if (link && link.getAttribute('href').startsWith('/')) {
        link.setAttribute('href', 'css/styles.css');
      }
      document.querySelectorAll('script[src^="/js/"]').forEach(function (s) {
        s.src = s.getAttribute('src').replace(/^\//, '');
      });
    });
  }
})();
