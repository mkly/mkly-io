(() => {
  const footer = document.querySelector('.anti-footer');
  if (!footer) return;

  function loadGraphics() {
    const script = document.createElement('script');
    script.src = '/assets/skyline.js';
    script.async = true;
    document.body.appendChild(script);
  }

  function afterPageLoad() {
    setTimeout(loadGraphics, 0);
  }

  if (document.readyState === 'complete') afterPageLoad();
  else window.addEventListener('load', afterPageLoad, { once: true });
})();
