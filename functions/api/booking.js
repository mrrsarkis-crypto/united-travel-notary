export async function onRequestPost({ request, env }) {
  let b;
  try {
    b = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  if (!b || typeof b !== "object" || Array.isArray(b)) return json({ ok: false, error: "invalid_json" }, 400);

  const name = (b.name || "").toString().trim().slice(0, 120);
  const phone = (b.phone || "").toString().trim().slice(0, 40);
  const email = (b.email || "").toString().trim().slice(0, 160);
  const service = (b.service || "").toString().trim().slice(0, 120);
  const price = (b.price || "").toString().trim().slice(0, 20);
  const zip = (b.zip || "").toString().trim().slice(0, 10);
  const date = (b.date || "").toString().trim().slice(0, 20);
  const time = (b.time || "").toString().trim().slice(0, 40);
  const addr = (b.addr || b.location || "").toString().trim().slice(0, 300);
  const notes = (b.notes || "").toString().trim().slice(0, 1000);
  const isLA = !!b.isLA;
  const online = !!b.online;

  if (!name || !phone) {
    return json({ ok: false, error: "name_and_phone_required" }, 400);
  }
  if (!/^[0-9+\-().\s]{7,40}$/.test(phone)) {
    return json({ ok: false, error: "invalid_phone" }, 400);
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: "invalid_email" }, 400);
  if (!env.BOOKINGS) return json({ ok: false, error: "booking_unavailable" }, 503);
  const requestId = String(b.request_id || crypto.randomUUID());
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(requestId)) return json({ ok: false, error: "invalid_reference" }, 400);
  const id = "bk_" + requestId;
  const fields = { name, phone, email, service, price, zip, date, time, addr, notes, isLA, online };
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(fields)));
  const fingerprint = [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2,"0")).join("");
  try {
    const previous = await env.BOOKINGS.get(id, "json");
    if (previous) return previous.fingerprint === fingerprint
      ? json({ ok: true, id, reused: true })
      : json({ ok: false, error: "request_changed" }, 409);
  } catch {
    return json({ ok: false, error: "booking_unavailable" }, 503);
  }
  const created = new Date().toISOString();
  const record = { id, created, name, phone, email, service, price, zip, date, time, addr, notes, isLA, online, status: "new", fingerprint };

  // Store in KV
  try {
    await env.BOOKINGS.put(id, JSON.stringify(record));
  } catch {
    return json({ ok: false, error: "booking_unavailable" }, 503);
  }

  // Email notification to Sarkis via MailChannels (free, no key needed from Cloudflare)
  const subject = `New notary booking — ${name} (${service || "notary"})`;
  const text = [
    `New booking from unitedtravelnotary.com`,
    ``,
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Email: ${email || "-"}`,
    `Service: ${service || "-"} (from $${price || "?"})`,
    `Mode: ${online ? "Online video" : "In person"}`,
    `ZIP: ${zip}`,
    `When: ${date || "ASAP"} — ${time || ""}`,
    `Address: ${addr || "-"}`,
    `Sarkis direct: ${isLA ? "YES (LA area)" : "NO (dispatch network)"}`,
    `Notes: ${notes || "-"}`,
    ``,
    `Booking ID: ${id}`,
    `Received: ${created}`,
  ].join("\n");

  try {
    const notification = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      signal: AbortSignal.timeout(5000),
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: "unitedtravelnotary@gmail.com", name: "United Travel Notary" }] }],
        from: { email: "bookings@unitedtravelnotary.com", name: "United Travel Notary" },
        subject,
        content: [{ type: "text/plain", value: text }],
      }),
    });
    if (!notification.ok) console.error("booking_notification_failed");
  } catch {
    console.error("booking_notification_failed");
  }

  return json({ ok: true, id });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}

