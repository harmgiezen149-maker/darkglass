var http = require('./_lib/http');

// Status van de Anthropic API (statuspagina), voor het lampje in de header.
module.exports = async function handler(req, res) {
  if (!http.vereisMethode(req, res, ['GET'])) return;
  res.setHeader('Cache-Control', 'public, max-age=60');

  try {
    var r = await fetch('https://status.anthropic.com/api/v2/summary.json');
    var data = await r.json();

    var incidents = (data.incidents || []).filter(function(i) {
      return i.status !== 'resolved' && i.status !== 'postmortem';
    });
    var components = (data.components || []).filter(function(c) {
      var n = (c.name || '').toLowerCase();
      return n.includes('api') || n.includes('claude') || n.includes('opus') || n.includes('sonnet');
    });
    var degraded = components.some(function(c) { return c.status && c.status !== 'operational'; });

    return res.status(200).json({
      ok: !degraded && incidents.length === 0,
      degraded: degraded,
      hasIncident: incidents.length > 0,
      incidents: incidents.map(function(i) { return { name: i.name, status: i.status }; }),
      components: components.map(function(c) { return { name: c.name, status: c.status }; })
    });
  } catch (e) {
    // Als de statuscheck faalt, neem aan dat alles OK is
    return res.status(200).json({ ok: true, error: e.message });
  }
};
