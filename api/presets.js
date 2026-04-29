module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var url = process.env.UPSTASH_REDIS_REST_URL;
  var token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return res.status(500).json({ error: 'Upstash niet geconfigureerd' });
  }

  async function redis(command) {
    var r = await fetch(url + '/' + command.map(encodeURIComponent).join('/'), {
      headers: { Authorization: 'Bearer ' + token }
    });
    return r.json();
  }

  // GET — laad alle presets
  if (req.method === 'GET') {
    try {
      var keys = await redis(['KEYS', 'preset:*']);
      if (!keys.result || keys.result.length === 0) {
        return res.status(200).json({ presets: {} });
      }
      var presets = {};
      for (var i = 0; i < keys.result.length; i++) {
        var key = keys.result[i];
        var val = await redis(['GET', key]);
        if (val.result) {
          try {
            var id = key.replace('preset:', '');
            presets[id] = JSON.parse(val.result);
          } catch(e) {}
        }
      }
      return res.status(200).json({ presets: presets });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST — sla preset op
  if (req.method === 'POST') {
    var body = req.body || {};
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch(e) { body = {}; } }
    var preset = body.preset;
    if (!preset || !preset.id) return res.status(400).json({ error: 'Geen geldige preset' });
    try {
      await redis(['SET', 'preset:' + preset.id, JSON.stringify(preset)]);
      return res.status(200).json({ ok: true });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // DELETE — verwijder preset
  if (req.method === 'DELETE') {
    var body = req.body || {};
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch(e) { body = {}; } }
    var id = body.id;
    if (!id) return res.status(400).json({ error: 'Geen id opgegeven' });
    try {
      await redis(['DEL', 'preset:' + id]);
      return res.status(200).json({ ok: true });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
