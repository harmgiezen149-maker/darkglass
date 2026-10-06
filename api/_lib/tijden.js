// Doorlooptijd per analyse (onderzoek, ontwerp, controle) voor het stats-dashboard.
// De laatste 50 analyses worden bewaard.
var redis = require('./redis');

var KEY = 'stats:tijden';
var MAX = 50;

async function registreer(r) {
  if (!redis.isGeconfigureerd() || !r || !r.tijden) return;
  var t = r.tijden;
  var regel = {
    datum: new Date().toISOString(),
    totaal: t.totaal || 0, onderzoek: t.onderzoek || 0, ontwerp: t.ontwerp || 0, controle: t.controle || 0,
    diepte: r.diepte || '', model: (r.ai && r.ai.model) || '', effort: (r.ai && r.ai.effort) || '',
    scenes: (r.scenes || []).length, dollar: Math.round(((r.kosten && r.kosten.dollar) || 0) * 1000) / 1000
  };
  try {
    await redis.pipeline([['LPUSH', KEY, JSON.stringify(regel)], ['LTRIM', KEY, '0', String(MAX - 1)]]);
  } catch (e) {
    console.error('Tijden registreren mislukt:', e.message);
  }
}

async function laad() {
  if (!redis.isGeconfigureerd()) return [];
  var lijst = (await redis.cmd(['LRANGE', KEY, '0', String(MAX - 1)])) || [];
  return lijst.map(redis.parseJson).filter(Boolean);
}

module.exports = { KEY: KEY, registreer: registreer, laad: laad };
