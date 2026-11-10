/*
  Labels the page "public" (Home, Shows, About) or "band" (login and band workspace)
  so public-theme.css only restyles the public pages. It reads the address the same
  way app.js does and changes nothing else. Delete this file and its <script> line
  in index.html to turn the new look off.
*/
(function () {
  function label() {
    var page = (location.hash || '#home').slice(1).split('?')[0];
    document.documentElement.setAttribute('data-zone', page === 'band' ? 'band' : 'public');
  }
  label();
  window.addEventListener('hashchange', label);
})();
