// Cloudflare Pages Functions middleware — United Travel Notary
// AdSense (updated 2026-10-31, owner's maximize-AdSense directive): injects
// the google-adsense-account publisher meta AND the standard AdSense loader
// (Auto Ads) into every HTML response, so every page template carries the
// ad configuration — previously this site served the meta tag only and no
// ads ever loaded. Static in-content units live in the content pages
// themselves (slots 3445149853 / 5026833996, the account's existing units).
// Publisher ID verified from unitedtraffictickets.com's live homepage
// on 2026-10-22: ca-pub-9943048295609395.

const ADSENSE_ACCOUNT = 'ca-pub-9943048295609395';
const ADSENSE_META = '<meta name="google-adsense-account" content="' + ADSENSE_ACCOUNT + '">';
const ADSENSE_LOADER = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + ADSENSE_ACCOUNT + '" crossorigin="anonymous"></script>';
const UET_SCRIPT = '<script>(function(w,d,t,r,u){var f,n,i;w[u]=w[u]||[];f=function(){var o={ti:"187285081",enableAutoSpaTracking:true};o.q=w[u];w[u]=new UET(o);w[u].push("pageLoad")};n=d.createElement(t);n.src=r;n.async=1;n.onload=n.onreadystatechange=function(){var s=this.readyState;if(s&&s!=="loaded"&&s!=="complete")return;f();n.onload=n.onreadystatechange=null};i=d.getElementsByTagName(t)[0];i.parentNode.insertBefore(n,i)})(window,document,"script","//bat.bing.com/bat.js","uetq");</script>';
const UET_MARKER = '187285081';

function insertAfterHeadOpen(html, fragment) {
  return html.replace(/<head([^>]*)>/i, (m) => `${m}\n${fragment}`);
}

export async function onRequest(context) {
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  let html = await response.text();

  // Inject the publisher meta + the Auto Ads loader right after <head> on
  // every HTML page (skipping either if the page already carries it).
  if (!html.includes('google-adsense-account')) html = insertAfterHeadOpen(html, ADSENSE_META);
  if (!html.includes('adsbygoogle.js')) html = insertAfterHeadOpen(html, ADSENSE_LOADER);
  if (!html.includes('bat.bing.com/bat.js')) html = insertAfterHeadOpen(html, UET_SCRIPT);

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}
