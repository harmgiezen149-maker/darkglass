module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, system } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request: messages required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  // Laad blokken dynamisch uit Redis
  let blockPrompt = '';
  try {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (redisUrl && redisToken) {
      const r = await fetch(redisUrl + '/get/' + encodeURIComponent('anagram:blocks'), {
        headers: { Authorization: 'Bearer ' + redisToken }
      });
      const d = await r.json();
      if (d.result) {
        const blocks = JSON.parse(d.result);
        blockPrompt = '\n\n=== BESCHIKBARE ANAGRAM BLOKKEN ===\n';
        blocks.forEach(function(sectie) {
          blockPrompt += '\n--- ' + sectie.sectie + ' ---\n';
          (sectie.blokken || []).forEach(function(blok) {
            blockPrompt += blok.naam + ' (' + blok.basis + ')\n';
            blockPrompt += '  Parameters: ' + blok.parameters + '\n';
          });
        });
        blockPrompt += '\nGebruik ALLEEN bovenstaande bloknamen en parameters. Geef GEEN parameters op die niet vermeld zijn.';
      }
    }
  } catch(e) {
    console.error('Blokken laden mislukt:', e.message);
  }

  const finalSystem = (system || '') + blockPrompt;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 2048,
        system: finalSystem,
        messages: messages,
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Anthropic API error' });
    return res.status(200).json({ content: data.content?.[0]?.text || '' });

  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
