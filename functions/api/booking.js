export async function onRequestPost({ request, env }) {
  let b;
  try {
    b = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const name = (b.name || "").toString().trim().slice(0, 120);
  const phone = (b.phone || "").toString().trim().slice(0, 40);
  const email = (b.email || "").toString().trim().slice(0, 160);
  const service = (b.service || "").toString().trim().slice(0, 120);
  const price = (b.price || "").toString().trim().slice(0, 20);
  const zip = (b.zip || "").toString().trim().slice(0, 10);
  const date = (b.date || "").toString().trim().slice(0, 20);
  const time = (b.time || "").toString().trim().slice(0, 40);
  const addr = (b.addr || "").toString().trim().slice(0, 300);
  const notes = (b.notes || "").toString().trim().slice(0, 1000);
  const isLA = !!b.isLA;
  const online = !!b.online;

  if (!name || !phone) {
    return json({ ok: false, error: "name_and_phone_required" }, 400);
  }
  if (!/^[0-9+\-().\s]{7,40}$/.test(phone)) {
    return json({ ok: false, error: "invalid_phone" }, 400);
  }

  const id = "bk_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const created = new Date().toISOString();
  const record = { id, created, name, phone, email, service, price, zip, date, time, addr, notes, isLA, online, status: "new" };

  // Store in KV
  try {
    if (env.BOOKINGS) {
      await env.BOOKINGS.put(id, JSON.stringify(record));
    }
  } catch (e) {
    console.error("KV put failed", e);
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
    await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: "unitedtravelnotary@gmail.com", name: "United Travel Notary" }] }],
        from: { email: "bookings@unitedtravelnotary.com", name: "United Travel Notary" },
        subject,
        content: [{ type: "text/plain", value: text }],
      }),
    });
  } catch (e) {
    console.error("notify email failed", e);
  }

  return json({ ok: true, id });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}
