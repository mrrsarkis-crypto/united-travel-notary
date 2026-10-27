// Spinning favicon: rotates this site's own logo on a canvas.
// The artwork is clipped to a circle so the rim stays put while the logo
// turns inside it. Pauses while the tab is hidden.
// The spin loads the real PNG at /favicon-192.png: an SVG-wrapped image
// (favicon.svg) does not draw to canvas reliably in several browsers,
// which silently stopped the spin.
(function () {
  if (window.__faviconSpin) return;
  window.__faviconSpin = 1;
  var img = new Image();
  img.onload = function () {
    var S = 64, c = document.createElement('canvas');
    c.width = S; c.height = S;
    var ctx = c.getContext('2d');
    var link = document.querySelector('link[rel="icon"]');
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    var a = 0, timer = null;
    function frame() {
      a += 0.09; // 0.09 rad per 50 ms tick -> one full turn in ~3.5 s, easy on the eye
      ctx.clearRect(0, 0, S, S);
      ctx.save();
      ctx.beginPath();
      ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.translate(S / 2, S / 2);
      ctx.rotate(a);
      ctx.drawImage(img, -S / 2, -S / 2, S, S);
      ctx.restore();
      link.href = c.toDataURL('image/png');
    }
    function start() { if (!timer) timer = setInterval(frame, 50); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });
    if (!document.hidden) start();
  };
  img.src = '/favicon-192.png';
})();
