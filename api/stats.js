module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var url = process.env.UPSTASH_REDIS_REST_URL;
  var token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return res.status(500).json({ error: 'Redis niet geconfigureerd' });

  async function redisCmd(cmd) {
    var r = await fetch(url + '/' + cmd.map(encodeURIComponent).join('/'), {
      headers: { Authorization: 'Bearer ' + token }
    });
    return r.json();
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // POST — verhoog tellers
  if (req.method === 'POST') {
    var body = req.body || {};
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch(e) { body = {}; } }
    var event = body.event;
    var meta = body.meta || {};

    if (!event) return res.status(400).json({ error: 'Geen event' });

    try {
      var datum = today();
      // Totaal teller
      await redisCmd(['INCR', 'stats:' + event + ':total']);
      // Per dag
      await redisCmd(['INCR', 'stats:' + event + ':day:' + datum]);
      // Per meta (bijv. bas-keuze)
      if (meta.bass) await redisCmd(['INCR', 'stats:bass:' + meta.bass]);
      // Laatste activiteit
      await redisCmd(['SET', 'stats:lastEvent', JSON.stringify({ event: event, meta: meta, ts: Date.now() })]);
      return res.status(200).json({ ok: true });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // GET — haal stats op (wachtwoord verplicht)
  if (req.method === 'GET') {
    var pw = (req.query && req.query.pw) || '';
    if (req.url && req.url.indexOf('pw=') !== -1) {
      pw = req.url.split('pw=')[1].split('&')[0];
    }
    var expectedPw = process.env.STATS_WACHTWOORD || 'darkglass';
    if (pw !== expectedPw) return res.status(401).json({ error: 'Geen toegang' });

    try {
      // Totalen
      var analysesTotal = await redisCmd(['GET', 'stats:analyse:total']);
      var savesTotal = await redisCmd(['GET', 'stats:save:total']);
      var visitsTotal = await redisCmd(['GET', 'stats:visit:total']);
      var bassSpector = await redisCmd(['GET', 'stats:bass:spector']);
      var bassPbass = await redisCmd(['GET', 'stats:bass:pbass']);
      var bassBeide = await redisCmd(['GET', 'stats:bass:beide']);
      var lastEvent = await redisCmd(['GET', 'stats:lastEvent']);

      // Afgelopen 30 dagen analyses
      var dagen = [];
      for (var i = 29; i >= 0; i--) {
        var d = new Date();
        d.setDate(d.getDate() - i);
        var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        var val = await redisCmd(['GET', 'stats:analyse:day:' + key]);
        dagen.push({ datum: key, aantal: parseInt(val.result || '0', 10) });
      }

      // Laatste event parsen
      var laatst = null;
      if (lastEvent.result) {
        try { laatst = JSON.parse(lastEvent.result); } catch(e) {}
      }

      return res.status(200).json({
        ok: true,
        totalen: {
          analyses: parseInt(analysesTotal.result || '0', 10),
          saves: parseInt(savesTotal.result || '0', 10),
          visits: parseInt(visitsTotal.result || '0', 10)
        },
        bassen: {
          spector: parseInt(bassSpector.result || '0', 10),
          pbass: parseInt(bassPbass.result || '0', 10),
          beide: parseInt(bassBeide.result || '0', 10)
        },
        dagen: dagen,
        laatsteEvent: laatst
      });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
