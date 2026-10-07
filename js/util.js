// Algemene helpers: SSE-verzoeken, tracking en API-status.

// POST naar een SSE-endpoint. onEvent krijgt elk event-object; de promise
// geeft het "resultaat" terug of wordt afgewezen bij een "fout".
function sseVerzoek(url, payload, onEvent) {
  return apiFetch(url, { json: payload }).then(function(r) {
    if (!r.ok) {
      return r.json().catch(function() { return {}; }).then(function(d) { throw metDetail(new Error(d.error || ('HTTP ' + r.status)), d.foutDetail); });
    }
    var reader = r.body.getReader();
    var decoder = new TextDecoder();
    var buffer = '', resultaat = null, fout = null, foutDetail = null;
    function lees() {
      return reader.read().then(function(x) {
        if (x.done) {
          if (fout) { checkApiStatus(); throw metDetail(new Error(fout), foutDetail); }
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
          if (ev.foutDetail) foutDetail = ev.foutDetail;
          if (onEvent) onEvent(ev);
        });
        return lees();
      });
    }
    return lees();
  });
}

function metDetail(err, detail) {
  if (detail) err.detail = detail;
  return err;
}

// Uitklapbaar blok met de technische details van een fout (status, type,
// request-id) en een link naar het API-statusvenster.
function foutDetailHtml(d) {
  if (!d) return '';
  var regels = [];
  if (d.status) regels.push(['HTTP-status', d.status]);
  if (d.type) regels.push(['Type', d.type]);
  if (d.bericht) regels.push(['Melding', d.bericht]);
  if (d.requestId) regels.push(['Request-id', d.requestId]);
  if (d.tijd) regels.push(['Tijd', new Date(d.tijd).toLocaleString()]);
  return '<div class="fout-detail">' + (d.uitleg ? '<p>' + esc(d.uitleg) + '</p>' : '')
    + '<details><summary>' + esc(t('foutDetails')) + '</summary><table>'
    + regels.map(function(r) { return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>'; }).join('')
    + '</table></details><button type="button" class="actie-btn" onclick="openApiStatus()">' + esc(t('bekijkStatus')) + '</button></div>';
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

// ---------- API-status: lampje in de header en statusvenster ----------
var API_STATUS = null;

var STATUS_NL = { operational: 'werkt normaal', degraded_performance: 'trager dan normaal', partial_outage: 'gedeeltelijke storing', major_outage: 'storing', under_maintenance: 'onderhoud' };
var INCIDENT_NL = { investigating: 'wordt onderzocht', identified: 'oorzaak gevonden', monitoring: 'hersteld, wordt gevolgd', scheduled: 'gepland', in_progress: 'bezig', verifying: 'wordt gecontroleerd' };

// Een fout van de afgelopen 15 minuten die op de API zelf wijst (geen
// sleutel- of tegoedprobleem): dan meldt het lampje "API FOUT".
function recenteApiFout(d) {
  var f = (d.fouten || [])[0];
  if (!f || Date.now() - new Date(f.tijd).getTime() > 15 * 60000) return null;
  return f.status >= 500 || f.status === 429 || f.type === 'verbinding' ? f : null;
}

function zetLampje(el, klasse, tekst, titel) {
  el.className = 'api-status ' + klasse;
  el.innerHTML = '<span class="api-status-dot"></span> ' + esc(tekst);
  el.title = titel || '';
}

function checkApiStatus() {
  var el = document.getElementById('apiStatus');
  if (!el) return;
  if (!el.dataset.klik) {
    el.dataset.klik = '1';
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.addEventListener('click', openApiStatus);
    el.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openApiStatus(); } });
  }
  fetch('/api/status', { credentials: 'same-origin' })
    .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function(d) {
      API_STATUS = d;
      var eigen = recenteApiFout(d);
      var incident = (d.incidenten || [])[0];
      if (d.niveau === 'storing') zetLampje(el, 'err', 'API STORING', incident ? incident.naam : '');
      else if (d.niveau === 'melding') zetLampje(el, 'warn', 'API MELDING', incident ? incident.naam : '');
      else if (eigen) zetLampje(el, 'warn', 'API FOUT', eigen.bericht);
      else if (d.niveau === 'elders') zetLampje(el, 'ok elders', 'API OK ⓘ', t('statusElders') + (incident ? ': ' + incident.naam : ''));
      else if (d.niveau === 'onbekend') zetLampje(el, 'onbekend', 'API ?', d.statusFout || '');
      else zetLampje(el, 'ok', 'API OK', '');
      if (document.getElementById('apiStatusVenster')) vulApiStatus();
    })
    .catch(function(e) {
      API_STATUS = { niveau: 'onbekend', statusFout: e.message, onderdelen: [], incidenten: [], fouten: [] };
      zetLampje(el, 'onbekend', 'API ?', e.message);
    });
}

function tijdTekst(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  var min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return t('zojuist');
  if (min < 60) return min + ' min ' + t('geleden');
  return d.toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function vulApiStatus() {
  var box = document.querySelector('#apiStatusVenster .status-inhoud');
  if (!box) return;
  var d = API_STATUS || { niveau: 'onbekend', onderdelen: [], incidenten: [], fouten: [] };
  var api = d.api;
  var kop = { ok: t('statusOk'), elders: t('statusEldersKop'), melding: t('statusMelding'), storing: t('statusStoring'), onbekend: t('statusOnbekend') }[d.niveau] || '';
  var h = '<p class="status-kop status-' + esc(d.niveau) + '">' + esc(kop) + '</p>';
  if (d.statusFout) h += '<p class="status-klein">' + esc(d.statusFout) + '</p>';
  if (api) h += '<p class="status-klein">' + esc(api.naam) + ': <strong>' + esc(STATUS_NL[api.status] || api.status) + '</strong></p>';

  if ((d.incidenten || []).length) {
    h += '<div class="status-sectie">' + esc(t('statusIncidenten')) + '</div>';
    d.incidenten.forEach(function(i) {
      h += '<div class="status-incident' + (i.raaktApi ? ' raakt-api' : '') + '"><strong>' + esc(i.naam) + '</strong>'
        + '<div class="status-klein">' + esc(INCIDENT_NL[i.status] || i.status) + (i.onderdelen.length ? ' · ' + esc(i.onderdelen.join(', ')) : '')
        + ' · ' + esc(i.raaktApi ? t('raaktApi') : t('raaktApiNiet')) + '</div>'
        + (i.update ? '<p>' + esc(i.update) + '</p>' : '')
        + '<div class="status-klein">' + esc(tijdTekst(i.bijgewerkt)) + ' · <a href="' + esc(/^https:\/\//.test(i.url) ? i.url : d.pagina) + '" target="_blank" rel="noopener noreferrer">status.anthropic.com ↗</a></div></div>';
    });
  }

  if ((d.onderdelen || []).length) {
    h += '<div class="status-sectie">' + esc(t('statusOnderdelen')) + '</div><table class="status-tabel">'
      + d.onderdelen.map(function(c) {
        return '<tr><td>' + esc(c.naam) + '</td><td class="st-' + esc(c.status) + '">' + esc(STATUS_NL[c.status] || c.status) + '</td></tr>';
      }).join('') + '</table>';
  }

  h += '<div class="status-sectie">' + esc(t('statusEigenFouten')) + '</div>';
  if (!(d.fouten || []).length) h += '<p class="status-klein">' + esc(t('geenFouten')) + '</p>';
  (d.fouten || []).forEach(function(f) {
    h += '<div class="status-fout"><div class="status-klein">' + esc(tijdTekst(f.tijd)) + ' · ' + esc(f.waar)
      + (f.status ? ' · HTTP ' + esc(f.status) : '') + (f.type ? ' · ' + esc(f.type) : '') + '</div>'
      + '<div>' + esc(f.bericht) + '</div>'
      + (f.uitleg ? '<div class="status-klein">' + esc(f.uitleg) + '</div>' : '')
      + (f.requestId ? '<div class="status-klein">request-id: ' + esc(f.requestId) + '</div>' : '') + '</div>';
  });
  box.innerHTML = h;
}

function openApiStatus() {
  if (document.getElementById('apiStatusVenster')) return;
  var overlay = document.createElement('div');
  overlay.id = 'apiStatusVenster';
  overlay.className = 'status-overlay';
  overlay.innerHTML = '<div class="status-modal" role="dialog" aria-modal="true"><div class="status-titel">' + esc(t('statusTitel')) + '</div>'
    + '<div class="status-inhoud"></div><div class="status-knoppen">'
    + '<a class="actie-btn" href="https://status.anthropic.com" target="_blank" rel="noopener noreferrer">STATUS.ANTHROPIC.COM ↗</a>'
    + '<button type="button" class="actie-btn" id="statusVernieuw">' + esc(t('vernieuwen')) + '</button>'
    + '<button type="button" class="actie-btn actie-primair" id="statusSluit">' + esc(t('sluiten')) + '</button></div></div>';
  document.body.appendChild(overlay);
  function sluit() { overlay.remove(); document.removeEventListener("keydown", opEscape); }
  function opEscape(e) { if (e.key === "Escape") sluit(); }
  overlay.addEventListener('click', function(e) { if (e.target === overlay) sluit(); });
  document.getElementById('statusSluit').onclick = sluit;
  document.getElementById('statusVernieuw').onclick = function() { checkApiStatus(); };
  document.addEventListener("keydown", opEscape);
  vulApiStatus();
  checkApiStatus();
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
