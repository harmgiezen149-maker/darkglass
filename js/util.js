// Algemene helpers: SSE-verzoeken, tracking en API-status.

// POST naar een SSE-endpoint. onEvent krijgt elk event-object; de promise
// geeft het "resultaat" terug of wordt afgewezen bij een "fout".
function sseVerzoek(url, payload, onEvent) {
  return apiFetch(url, { json: payload }).then(function(r) {
    if (!r.ok) {
      return r.json().catch(function() { return {}; }).then(function(d) { throw new Error(d.error || ('HTTP ' + r.status)); });
    }
    var reader = r.body.getReader();
    var decoder = new TextDecoder();
    var buffer = '', resultaat = null, fout = null;
    function lees() {
      return reader.read().then(function(x) {
        if (x.done) {
          if (fout) throw new Error(fout);
          if (!resultaat) throw new Error('Geen resultaat ontvangen');
          return resultaat;
        }
        buffer += decoder.decode(x.value, { stream: true });
        var regels = buffer.split('\n');
        buffer = regels.pop();
        regels.forEach(function(regel) {
          if (regel.indexOf('data: ') !== 0) return;
          var data = regel.slice(6).trim();
          if (!data || data === '[DONE]') return;
          var ev;
          try { ev = JSON.parse(data); } catch (e) { return; }
          if (ev.resultaat) resultaat = ev.resultaat;
          if (ev.fout) fout = ev.fout;
          if (onEvent) onEvent(ev);
        });
        return lees();
      });
    }
    return lees();
  });
}

function trackEvent(event, meta) {
  try {
    fetch('/api/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: event, meta: meta || {} })
    }).catch(function() {});
  } catch (e) {}
}

function checkApiStatus() {
  var el = document.getElementById('apiStatus');
  if (!el) return;
  fetch('/api/status')
    .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function(d) {
      if (d.hasIncident || d.degraded) {
        el.className = 'api-status ' + (d.degraded ? 'err' : 'warn');
        el.innerHTML = '<span class="api-status-dot"></span> ' + (d.degraded ? 'API STORING' : 'API MELDING');
        el.title = (d.incidents || []).map(function(i) { return i.name; }).join(', ') || 'Melding op Anthropic statuspagina';
      } else {
        el.className = 'api-status ok';
        el.innerHTML = '<span class="api-status-dot"></span> API OK';
      }
    })
    .catch(function() {
      el.className = 'api-status ok';
      el.innerHTML = '<span class="api-status-dot"></span> API OK';
    });
}

function loadingHtml(tekst, log) {
  return '<div class="loading"><div class="vu"><span></span><span></span><span></span><span></span><span></span><span></span></div><p>' + esc(tekst) + '</p>'
    + (log && log.length ? '<ul class="voortgang">' + log.map(function(r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
}

function datumTekst(d) {
  return (d ? new Date(d) : new Date()).toLocaleDateString(currentLang === 'en' ? 'en-GB' : 'nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Toont "UPDATE" op de BLOKKEN-knop als er nieuwe blokken klaarstaan.
// Alleen voor beheerders, en zonder loginvenster (gewone fetch).
function checkBlokUpdates() {
  var badge = document.getElementById('navUpdate');
  if (!badge) return;
  fetch('/api/login', { credentials: 'same-origin' })
    .then(function(r) { return r.json(); })
    .then(function(s) {
      if (!s.admin) return null;
      return fetch('/api/blocks-sync', { credentials: 'same-origin' }).then(function(r) { return r.ok ? r.json() : null; });
    })
    .then(function(d) { badge.hidden = !(d && d.updateBeschikbaar); })
    .catch(function() {});
}
