// public/input.js - quick debug version
console.log('input.js loaded — debug edition');
const API_BASE = window.location.origin + '/api';
console.log('DEBUG API_BASE =', API_BASE);

// quick test function
async function runDebug() {
  console.log('Calling POST', API_BASE + '/debug');
  try {
    const res = await fetch(API_BASE + '/debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'hello', ts: Date.now() })
    });
    console.log('Response status', res.status, res.statusText);
    const ct = res.headers.get('content-type') || '';
    console.log('content-type:', ct);
    let body;
    if (ct.includes('application/json')) {
      body = await res.json();
      console.log('JSON body:', body);
      alert('DEBUG OK — server returned JSON. Check console for details.');
    } else {
      body = await res.text();
      console.log('TEXT body:', body.slice(0, 1000));
      alert('DEBUG returned non-json. See console for details.');
    }
  } catch (err) {
    console.error('Fetch error', err);
    alert('Fetch error — see console (server not reachable?)');
  }
}

// attach to saveBtn for one-click test (if button exists)
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('saveBtn');
  if (btn) {
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      runDebug();
    });
  } else {
    console.warn('No #saveBtn; running debug automatically');
    runDebug();
  }
});
