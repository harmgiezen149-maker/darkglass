module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Debug: stuur terug wat we ontvangen
  return res.status(200).json({
    content: 'DEBUG: body=' + JSON.stringify(req.body) + ' | type=' + typeof req.body
  });
};
