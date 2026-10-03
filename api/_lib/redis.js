// Upstash Redis REST client. Commando's gaan als JSON-body (geen lengtelimiet
// van de URL). Zonder Upstash-config en met DG_DEV=1 draait een geheugen-store
// zodat de app lokaal en in tests werkt.

function isGeconfigureerd() {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) || process.env.DG_DEV === '1';
}

async function upstash(pad, body) {
  var r = await fetch(process.env.UPSTASH_REDIS_REST_URL + pad, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.UPSTASH_REDIS_REST_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  var d = await r.json();
  if (!r.ok && d && d.error) throw new Error('Redis: ' + d.error);
  return d;
}

// ---------- geheugen-store (alleen DG_DEV=1) ----------
var mem = { data: new Map(), verloopt: new Map() };

function memGet(key) {
  var exp = mem.verloopt.get(key);
  if (exp && exp < Date.now()) { mem.data.delete(key); mem.verloopt.delete(key); }
  return mem.data.get(key);
}

function memCmd(cmd) {
  var op = String(cmd[0]).toUpperCase();
  var k = cmd[1];
  var v, h, i;
  switch (op) {
    case 'GET': v = memGet(k); return typeof v === 'string' ? v : null;
    case 'SET':
      mem.data.set(k, String(cmd[2]));
      mem.verloopt.delete(k);
      for (i = 3; i < cmd.length; i++) {
        if (String(cmd[i]).toUpperCase() === 'EX') mem.verloopt.set(k, Date.now() + Number(cmd[i + 1]) * 1000);
      }
      return 'OK';
    case 'DEL': return cmd.slice(1).reduce(function(n, key) { return n + (mem.data.delete(key) ? 1 : 0); }, 0);
    case 'MGET': return cmd.slice(1).map(function(key) { var x = memGet(key); return typeof x === 'string' ? x : null; });
    case 'INCR': case 'INCRBY':
      v = parseInt(memGet(k) || '0', 10) + (op === 'INCR' ? 1 : parseInt(cmd[2], 10));
      mem.data.set(k, String(v)); return v;
    case 'EXPIRE':
      if (String(cmd[3] || '').toUpperCase() === 'NX' && mem.verloopt.has(k)) return 0;
      mem.verloopt.set(k, Date.now() + Number(cmd[2]) * 1000); return 1;
    case 'HSET':
      h = memGet(k); if (!(h instanceof Map)) { h = new Map(); mem.data.set(k, h); }
      var n = 0;
      for (i = 2; i < cmd.length; i += 2) { if (!h.has(cmd[i])) n++; h.set(String(cmd[i]), String(cmd[i + 1])); }
      return n;
    case 'HGET': h = memGet(k); return h instanceof Map && h.has(cmd[2]) ? h.get(cmd[2]) : null;
    case 'HDEL': h = memGet(k); return h instanceof Map ? cmd.slice(2).filter(function(f) { return h.delete(f); }).length : 0;
    case 'HGETALL':
      h = memGet(k); if (!(h instanceof Map)) return [];
      var out = []; h.forEach(function(val, f) { out.push(f, val); }); return out;
    case 'KEYS':
      var re = new RegExp('^' + String(k).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
      return Array.from(mem.data.keys()).filter(function(key) { return re.test(key); });
    case 'LPUSH':
      h = memGet(k); if (!Array.isArray(h)) { h = []; mem.data.set(k, h); }
      cmd.slice(2).forEach(function(x) { h.unshift(String(x)); }); return h.length;
    case 'LRANGE':
      h = memGet(k); if (!Array.isArray(h)) return [];
      var eind = Number(cmd[3]); return h.slice(Number(cmd[2]), eind === -1 ? undefined : eind + 1);
    case 'LTRIM':
      h = memGet(k); if (!Array.isArray(h)) return 'OK';
      var e2 = Number(cmd[3]); mem.data.set(k, h.slice(Number(cmd[2]), e2 === -1 ? undefined : e2 + 1)); return 'OK';
    default: throw new Error('Geheugen-store kent ' + op + ' niet');
  }
}

function useMem() {
  return process.env.DG_DEV === '1' && !process.env.UPSTASH_REDIS_REST_URL;
}

// ---------- publieke API ----------
async function cmd(command) {
  if (useMem()) return memCmd(command);
  var d = await upstash('', command);
  if (d.error) throw new Error('Redis: ' + d.error);
  return d.result;
}

async function pipeline(commands) {
  if (!commands.length) return [];
  if (useMem()) return commands.map(memCmd);
  var d = await upstash('/pipeline', commands);
  return d.map(function(x) {
    if (x.error) throw new Error('Redis: ' + x.error);
    return x.result;
  });
}

// Ontrafelt waarden die (historisch) dubbel als JSON-string zijn opgeslagen.
function parseJson(raw) {
  var v = raw;
  for (var i = 0; i < 3 && typeof v === 'string'; i++) {
    try { v = JSON.parse(v); } catch (e) { return null; }
  }
  return v;
}

async function getJson(key) {
  var raw = await cmd(['GET', key]);
  return raw == null ? null : parseJson(raw);
}

async function setJson(key, value, exSeconden) {
  var c = ['SET', key, JSON.stringify(value)];
  if (exSeconden) c.push('EX', String(exSeconden));
  return cmd(c);
}

function _resetMem() { mem.data.clear(); mem.verloopt.clear(); }

module.exports = { isGeconfigureerd: isGeconfigureerd, cmd: cmd, pipeline: pipeline, getJson: getJson, setJson: setJson, parseJson: parseJson, _resetMem: _resetMem };
