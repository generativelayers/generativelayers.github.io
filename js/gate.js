/**
 * gate.js — Access gate for review period.
 *
 * If the visitor has not authenticated via /enter.html,
 * the entire page is replaced with a "site under review" screen.
 * The enter.html page itself must NOT include this script.
 */
(function () {
  if (sessionStorage.getItem('gl_access') === 'granted') return;

  // Stop all further loading
  document.documentElement.innerHTML = '';

  document.addEventListener('DOMContentLoaded', render);
  if (document.readyState !== 'loading') render();

  function render() {
    document.documentElement.innerHTML =
      '<head>' +
        '<meta charset="utf-8">' +
        '<meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<title>Generative Layers</title>' +
        '<link rel="icon" href="/icon/icon.ico" type="image/x-icon">' +
        '<style>' +
          '*{margin:0;padding:0;box-sizing:border-box}' +
          'body{min-height:100vh;display:flex;align-items:center;justify-content:center;' +
            'background:#0a0f1a;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#e2e8f0}' +
          '.gate{text-align:center;max-width:480px;padding:40px 32px}' +
          '.gate-logo{width:80px;height:80px;margin-bottom:28px;opacity:.85}' +
          '.gate h1{font-size:24px;font-weight:700;margin-bottom:8px;color:#fff}' +
          '.gate .subtitle{font-size:15px;color:#94a3b8;line-height:1.6;margin-bottom:32px}' +
          '.gate .badge{display:inline-flex;align-items:center;gap:8px;padding:8px 20px;' +
            'background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.25);border-radius:999px;' +
            'font-size:13px;font-weight:600;color:#4ade80;letter-spacing:.3px}' +
          '.gate .badge i{font-size:14px}' +
        '</style>' +
        '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">' +
      '</head>' +
      '<body>' +
        '<div class="gate">' +
          '<img class="gate-logo" src="/icon/logo.png" alt="Generative Layers">' +
          '<h1>Generative Layers</h1>' +
          '<p class="subtitle">This site is currently under review and not publicly accessible.<br>It will be made available upon completion of the review process.</p>' +
          '<div class="badge"><i class="fa-solid fa-lock"></i> Under Review</div>' +
        '</div>' +
      '</body>';
  }
})();
