document.addEventListener('DOMContentLoaded', function () {
  try {
    let sessionId = sessionStorage.getItem('vf_session_id');

    if (!sessionId) {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        sessionId = crypto.randomUUID();
      } else {
        sessionId = Math.random().toString(36).substr(2, 9) + Date.now();
      }
      sessionStorage.setItem('vf_session_id', sessionId);
    }

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: window.location.pathname,
        referrer: document.referrer,
        sessionId: sessionId
      }),
      keepalive: true
    });
  } catch (e) {
    // silently fail
  }
});
