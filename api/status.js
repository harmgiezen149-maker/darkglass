var http = require('./_lib/http');
var auth = require('./_lib/auth');
var fouten = require('./_lib/fouten');

// Status van de Claude API voor het lampje in de header, plus details voor het
// statusvenster. Alleen het onderdeel "Claude API (api.anthropic.com)" bepaalt
// of er een storing is; storingen bij andere onderdelen (claude.ai, Console,
// Claude Code) gaan de app niet aan en worden als "elders" gemeld.
//
// niveau: ok | elders | melding | storing | onbekend

var STATUS_URL = 'https://status.anthropic.com/api/v2/summary.json';
var PAGINA = 'https://status.anthropic.com';

function isApi(naam) {
  return /api\.anthropic\.com|claude api/i.test(String(naam || ''));
}

function relevant(naam) {
  return /claude|api|console|anthropic/i.test(String(naam || ''));
}

async function haalStatus() {
  var ctrl = new AbortController();
  var t = setTimeout(function() { ctrl.abort(); }, 5000);
  try {
    var r = await fetch(STATUS_URL, { signal: ctrl.signal });
    if (!r.ok) throw new Error('statuspagina gaf HTTP ' + r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

// Bepaalt het niveau op basis van de summary van de statuspagina.
function beoordeel(data) {
  var componenten = (data.components || []).filter(function(c) { return !c.group && relevant(c.name); });
  var api = componenten.find(function(c) { return isApi(c.name); }) || null;
  var incidenten = (data.incidents || []).filter(function(i) {
    return i.status !== 'resolved' && i.status !== 'postmortem';
  }).map(function(i) {
    var namen = (i.components || []).map(function(c) { return c.name; });
    var laatste = (i.incident_updates || [])[0] || {};
    return {
      naam: i.name,
      status: i.status,
      impact: i.impact || 'none',
      onderdelen: namen,
      raaktApi: namen.length ? namen.some(isApi) : /\bapi\b/i.test(i.name || ''),
      update: String(laatste.body || '').slice(0, 600),
      bijgewerkt: laatste.updated_at || laatste.created_at || i.updated_at || null,
      url: i.shortlink || PAGINA
    };
  });
  var apiStatus = api ? api.status : 'operational';
  var apiIncident = incidenten.filter(function(i) { return i.raaktApi; });
  var niveau = 'ok';
  if (apiStatus === 'major_outage' || apiStatus === 'partial_outage' || apiIncident.some(function(i) { return i.impact === 'major' || i.impact === 'critical'; })) niveau = 'storing';
  else if (apiStatus !== 'operational' || apiIncident.length) niveau = 'melding';
  else if (incidenten.length || componenten.some(function(c) { return c.status !== 'operational'; })) niveau = 'elders';
  return {
    niveau: niveau,
    api: api ? { naam: api.name, status: api.status } : null,
    onderdelen: componenten.map(function(c) { return { naam: c.name, status: c.status }; }),
    incidenten: incidenten,
    pagina: PAGINA
  };
}

module.exports = async function handler(req, res) {
  if (!http.vereisMethode(req, res, ['GET'])) return;
  // Bevat (voor gebruikers van de app) de eigen foutmeldingen; http.stuur zet no-store.
  var uit;
  try {
    uit = beoordeel(await haalStatus());
  } catch (e) {
    uit = { niveau: 'onbekend', api: null, onderdelen: [], incidenten: [], pagina: PAGINA, statusFout: 'Statuspagina niet bereikbaar: ' + e.message };
  }
  // De laatste fouten die deze app zelf van de API kreeg (alleen met toegang tot de app).
  uit.fouten = auth.heeftAppToegang(req) ? await fouten.laad(5) : [];
  return http.stuur(res, 200, uit);
};

module.exports.beoordeel = beoordeel;
