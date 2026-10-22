// Cloudflare Pages Functions middleware — United Travel Notary
// Mirrors the AdSense parts of the other sites' middleware (United / Fairy):
// injects the google-adsense-account publisher meta into HTML responses and
// strips any eager adsbygoogle script tags so the initial page stays light.
// Publisher ID verified from unitedtraffictickets.com's live homepage
// on 2026-10-22: ca-pub-9943048295609395.

const ADSENSE_ACCOUNT = 'ca-pub-9943048295609395';
const ADSENSE_META = '<meta name="google-adsense-account" content="' + ADSENSE_ACCOUNT + '">';

function insertAfterHeadOpen(html, fragment) {
  return html.replace(/<head([^>]*)>/i, (m) => `${m}\n${fragment}`);
}

export async function onRequest(context) {
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  let html = await response.text();

  // Static pages may contain an eager AdSense tag. Remove it at the edge and
  // retain the publisher meta tag (same pattern as the other sites).
  html = html.replace(/<script[^>]+pagead\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[^>]*><\/script>/gi, '');
  if (!html.includes('google-adsense-account')) html = insertAfterHeadOpen(html, ADSENSE_META);

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}
