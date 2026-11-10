/* The saved skin applies only to public pages. Workspace styles stay independent. */
(function () {
  function label() {
    var page = (location.hash || '#home').slice(1).split('?')[0];
    document.documentElement.setAttribute('data-zone', page === 'band' ? 'band' : 'public');
  }
  window.setMotelSkin = function (skin) {
    document.documentElement.setAttribute('data-skin', skin === 'neon' ? 'neon' : 'orange');
  };
  window.setMotelSkin('orange');
  label();
  window.addEventListener('hashchange', label);
})();
