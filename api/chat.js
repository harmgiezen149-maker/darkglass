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
        let blocks = d.result;
        if (typeof blocks === 'string') blocks = JSON.parse(blocks);
        if (typeof blocks === 'string') blocks = JSON.parse(blocks);
        if (Array.isArray(blocks) && blocks.length > 0) {
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
        max_tokens: 4096,
        stream: true,
        system: finalSystem,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'API error' });
    }

    // Stream door naar de client als Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // bewaar onvolledige regel

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              res.write('data: ' + JSON.stringify({ text: parsed.delta.text }) + '\n\n');
            }
            if (parsed.type === 'message_stop') {
              res.write('data: [DONE]\n\n');
            }
          } catch(e) {}
        }
      }
    }

    res.end();

  } catch (err) {
    console.error('API error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.end();
  }
};
