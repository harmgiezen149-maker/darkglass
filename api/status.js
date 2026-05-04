module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const r = await fetch('https://status.anthropic.com/api/v2/summary.json');
    const data = await r.json();

    // Kijk naar incidents en component status
    const incidents = (data.incidents || []).filter(function(i) {
      return i.status !== 'resolved' && i.status !== 'postmortem';
    });

    const components = (data.components || []).filter(function(c) {
      // Filter op API-gerelateerde componenten
      return c.name && (
        c.name.toLowerCase().includes('api') ||
        c.name.toLowerCase().includes('claude') ||
        c.name.toLowerCase().includes('opus') ||
        c.name.toLowerCase().includes('sonnet')
      );
    });

    const degraded = components.some(function(c) {
      return c.status && c.status !== 'operational';
    });

    const hasIncident = incidents.length > 0;
    const isOk = !degraded && !hasIncident;

    return res.status(200).json({
      ok: isOk,
      degraded: degraded,
      hasIncident: hasIncident,
      incidents: incidents.map(function(i) {
        return { name: i.name, status: i.status };
      }),
      components: components.map(function(c) {
        return { name: c.name, status: c.status };
      })
    });

  } catch(e) {
    // Als statuscheck faalt, neem aan dat alles OK is
    return res.status(200).json({ ok: true, error: e.message });
  }
};
