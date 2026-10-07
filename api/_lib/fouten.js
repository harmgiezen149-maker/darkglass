// Fouten van de Claude API (en andere fouten tijdens analyse/chat/sync):
// uitleggen in gewone taal en de laatste 10 bewaren, zodat je in de app ziet
// wát er misging en niet alleen dát er iets misging.
var redis = require('./redis');
var claude = require('./claude');

var KEY = 'stats:fouten';
var MAX = 10;

// Leesbare uitleg per fouttype (zie de foutcodes van de Claude API).
function uitlegVan(status, type, bericht) {
  var b = String(bericht || '');
  if (type === 'overloaded_error' || status === 529) return 'Anthropic is tijdelijk overbelast. Dit ligt niet aan de app; probeer het over een paar minuten opnieuw.';
  if (/usage limit|spend limit|enforced_spend_limit/i.test(b)) return 'De (maand)limiet van je Anthropic-account is bereikt. Verhoog de limiet bij platform.claude.com → Settings → Billing, of wacht tot de limiet weer vrijkomt.';
  if (/credit balance/i.test(b)) return 'Er staat geen tegoed meer op je Anthropic-account. Koop tegoed bij platform.claude.com → Settings → Billing.';
  if (type === 'rate_limit_error' || status === 429) return 'Te veel verzoeken in korte tijd. Wacht een minuut en probeer het opnieuw.';
  if (type === 'authentication_error' || status === 401) return 'De API-sleutel wordt niet geaccepteerd. Controleer ANTHROPIC_API_KEY bij Vercel en doe een redeploy.';
  if (type === 'permission_error' || status === 403) return 'De API-sleutel heeft geen toegang tot dit model of deze functie.';
  if (type === 'not_found_error' || status === 404) return 'Het gevraagde model of onderdeel bestaat niet (meer) bij Anthropic.';
  if (type === 'request_too_large' || status === 413) return 'Het verzoek is te groot voor de API.';
  if (type === 'api_error' || (status >= 500 && status < 600)) return 'Interne fout bij Anthropic. Meestal van korte duur; probeer het opnieuw en kijk anders bij de API-status.';
  if (type === 'invalid_request_error' || status === 400) return 'De API weigerde het verzoek. Zie de foutmelding hieronder.';
  if (type === 'verbinding') return 'Geen verbinding met de Claude API (netwerkfout of time-out). Probeer het opnieuw.';
  return '';
}

// Zet een fout om naar { status, type, bericht, requestId, uitleg }.
function beschrijf(e) {
  e = e || {};
  var A = claude.Anthropic;
  var body = e.error && typeof e.error === 'object' ? e.error : null;
  var inner = body && body.error && typeof body.error === 'object' ? body.error : null;
  var status = typeof e.status === 'number' ? e.status : null;
  var type = (inner && inner.type) || (typeof e.type === 'string' && e.type) || null;
  if (!type && A && e instanceof A.APIConnectionError) type = 'verbinding';
  if (!type && status == null) type = e.name && e.name !== 'Error' ? e.name : 'app';
  var bericht = (inner && inner.message) || String(e.message || e || 'Onbekende fout');
  return {
    status: status,
    type: type,
    bericht: bericht.slice(0, 500),
    requestId: e.requestID || (body && body.request_id) || null,
    uitleg: status != null || type === 'verbinding' ? uitlegVan(status, type, bericht) : ''
  };
}

// Eén regel voor in de foutmelding van de app.
function korteMelding(e) {
  var d = beschrijf(e);
  if (d.status == null && d.type !== 'verbinding') return d.bericht;
  var kop = 'Claude API-fout' + (d.status ? ' ' + d.status : '') + (d.type && d.type !== 'app' ? ' (' + d.type + ')' : '') + ': ' + d.bericht.slice(0, 200);
  return d.uitleg ? kop + ' — ' + d.uitleg : kop;
}

async function registreer(waar, e) {
  if (!redis.isGeconfigureerd()) return;
  var regel = Object.assign({ tijd: new Date().toISOString(), waar: String(waar || '') }, beschrijf(e));
  try {
    await redis.pipeline([['LPUSH', KEY, JSON.stringify(regel)], ['LTRIM', KEY, '0', String(MAX - 1)]]);
  } catch (err) {
    console.error('Fout registreren mislukt:', err.message);
  }
}

async function laad(n) {
  if (!redis.isGeconfigureerd()) return [];
  try {
    var lijst = (await redis.cmd(['LRANGE', KEY, '0', String((n || MAX) - 1)])) || [];
    return lijst.map(redis.parseJson).filter(Boolean);
  } catch (e) {
    return [];
  }
}

module.exports = { KEY: KEY, beschrijf: beschrijf, korteMelding: korteMelding, uitlegVan: uitlegVan, registreer: registreer, laad: laad };
