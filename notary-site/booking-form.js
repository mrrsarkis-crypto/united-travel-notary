(() => {
  const form = document.getElementById('bookForm');
  const status = document.getElementById('booking-status');
  if (!form || !status) return;
  const button = form.querySelector('[type="submit"]');
  const mode = document.getElementById('f-mode');
  const location = document.getElementById('f-location');
  const locationLabel = document.querySelector('label[for="f-location"]');
  const updateMode = () => {
    const online = mode.value === 'virtual';
    locationLabel.textContent = online ? 'State and country for your virtual appointment *' : 'Where should we meet you? *';
    location.placeholder = online ? 'State / province and country' : 'Street address and city';
  };
  mode.addEventListener('change', updateMode);
  updateMode();
  let busy = false, requestId = null;
  form.addEventListener('input', () => { if (!busy) requestId = null; });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    const value = id => document.getElementById(id).value.trim();
    requestId ||= crypto.randomUUID();
    const payload = {
      request_id: requestId, name: value('f-name'), phone: value('f-phone'),
      email: value('f-email'), service: value('f-service'), addr: value('f-location'),
      date: value('f-date'), time: value('f-time'), notes: value('f-notes'), online: mode.value === 'virtual'
    };
    busy = true;
    button.disabled = true;
    form.setAttribute('aria-busy', 'true');
    status.textContent = 'Sending your booking request…';
    try {
      const response = await fetch('/api/booking', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(15000)
      });
      const result = await response.json();
      if (!response.ok || !result.ok || !result.id) throw new Error('not_accepted');
      status.textContent = 'Request received. Reference: ' + result.id + '. Your appointment and total price still need confirmation. No payment has been taken.';
    } catch {
      status.textContent = 'We could not confirm receipt. Your details are still here. Retry, or call or text (424) 450-6387 to confirm your request.';
    } finally {
      busy = false;
      button.disabled = false;
      form.removeAttribute('aria-busy');
    }
  });
})();
