// De sleutel waarmee Claude (Harms AI-dorp op claude.ai) bij darkglass mag.
//
//   anagram:claude:sleutel        -> de huidige sleutel
//   anagram:auth:claude:<sleutel> -> "1" zolang hij geldig is
//
// Hij zit in het adres van de connector (…/api/mcp/<sleutel>), want claude.ai
// bewaart dat adres en stuurt geen eigen inlog mee. Alleen een beheerder kan
// hem maken of intrekken (beheer.html). Een nieuwe sleutel laat de oude meteen
// vervallen.

var crypto = require('crypto');
var redis = require('./redis');

var HUIDIG = 'anagram:claude:sleutel';
function geldigKey(s) { return 'anagram:auth:claude:' + s; }

async function huidige() { return (await redis.cmd(['GET', HUIDIG])) || null; }

async function maak() {
  var oud = await huidige();
  var sleutel = crypto.randomBytes(32).toString('base64url');
  await redis.cmd(['SET', geldigKey(sleutel), '1']);
  await redis.cmd(['SET', HUIDIG, sleutel]);
  if (oud) await redis.cmd(['DEL', geldigKey(oud)]);
  return sleutel;
}

async function wis() {
  var oud = await huidige();
  if (oud) await redis.cmd(['DEL', geldigKey(oud)]);
  await redis.cmd(['DEL', HUIDIG]);
}

async function geldig(sleutel) {
  var s = String(sleutel || '').trim();
  if (s.length < 30 || s.length > 100 || !/^[A-Za-z0-9_-]+$/.test(s)) return false;
  return (await redis.cmd(['GET', geldigKey(s)])) !== null;
}

module.exports = { huidige: huidige, maak: maak, wis: wis, geldig: geldig };
