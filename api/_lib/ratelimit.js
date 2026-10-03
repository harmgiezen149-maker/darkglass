// Tellers met een venster in Redis. Zonder Redis wordt er niet beperkt.
var redis = require('./redis');

async function tel(sleutel, max, vensterSec) {
  if (!redis.isGeconfigureerd()) return { ok: true, aantal: 0 };
  var key = 'limiet:' + sleutel;
  try {
    var r = await redis.pipeline([['INCR', key], ['EXPIRE', key, String(vensterSec), 'NX']]);
    var aantal = Number(r[0]);
    return { ok: aantal <= max, aantal: aantal, max: max };
  } catch (e) {
    // Een storing in Redis mag de app niet blokkeren.
    console.error('Rate limit mislukt:', e.message);
    return { ok: true, aantal: 0 };
  }
}

function getal(naam, standaard) {
  var v = parseInt(process.env[naam] || '', 10);
  return v > 0 ? v : standaard;
}

// Beperkt Claude-aanroepen: per IP per uur en globaal per dag.
// Beheerders tellen alleen mee voor de dagelijkse limiet.
async function claude(req, soort, isAdmin) {
  var ip = require('./http').clientIp(req);
  if (!isAdmin) {
    var perUur = soort === 'analyse' ? getal('LIMIET_ANALYSES_PER_UUR', 20) : getal('LIMIET_CHAT_PER_UUR', 60);
    var p = await tel(soort + ':' + ip, perUur, 3600);
    if (!p.ok) return { ok: false, melding: 'Limiet bereikt (' + perUur + ' per uur). Probeer het later opnieuw.' };
  }
  var dag = new Date().toISOString().slice(0, 10);
  var g = await tel('claude:dag:' + dag, getal('LIMIET_CLAUDE_PER_DAG', 300), 2 * 86400);
  if (!g.ok) return { ok: false, melding: 'Daglimiet van de app bereikt. Morgen weer beschikbaar.' };
  return { ok: true };
}

module.exports = { tel: tel, claude: claude };
