// Nep-Claude voor lokale ontwikkeling en tests: geeft voorspelbare antwoorden
// in dezelfde vorm als de SDK (stream-events + finalMessage).

function systeemTekst(params) {
  var s = params.system;
  if (Array.isArray(s)) return s.map(function(b) { return b.text || ''; }).join('\n');
  return String(s || '');
}

function laatsteUser(params) {
  var m = params.messages[params.messages.length - 1];
  if (typeof m.content === 'string') return m.content;
  return m.content.filter(function(b) { return b.type === 'text'; }).map(function(b) { return b.text; }).join('\n');
}

function tekstPreset(bas) {
  return 'B_SNAAR_VEREIST: ' + (bas === 'pbass' ? 'ja' : 'nee') + '\n'
    + 'ARTIEST: Tool\nSONG: Schism\n\n'
    + '## TONE ANALYSE\nJustin Chancellor speelt met plectrum door een **Wal** bas.\n\n'
    + '## SIGNAALCHAIN\nSERIEEL\nCHAIN_A: Compressor/Limiter > Microtubes B3K > Jim Bass > Gain\n\n'
    + '## BLOKKEN\n\n'
    + '### Compressor/Limiter (algemeen)\nINSTELLINGEN:\n- Threshold: -20 dB\n- Ratio: 4:1\nUITLEG: Egaliseert de aanslag.\n\n'
    + '### Microtubes B3K (Darkglass B3K)\nINSTELLINGEN:\n- Drive: 40%\n- Blend: 50%\n- Grunt: Fat\n- Mid Boost: On\nUITLEG: Grommende drive.\n\n'
    + '### Gain (volume)\nINSTELLINGEN:\n- Level: 100%\nUITLEG: Volumeregelaar.\n\n'
    + '## FINE-TUNE TIPS\n1. Stem naar Drop D.\n2. Speel met plectrum.\n3. Draai de mid-boost terug als het te nasaal wordt.';
}

// Bepaalt de inhoud van het antwoord. Latere stappen (JSON-modi) haken hier in.
var aangepast = [];
function registreer(fn) { aangepast.push(fn); }

function inhoud(params) {
  for (var i = 0; i < aangepast.length; i++) {
    var r = aangepast[i](params, { systeem: systeemTekst(params), user: laatsteUser(params) });
    if (r) return r;
  }
  var sys = systeemTekst(params);
  var user = laatsteUser(params);
  if (/preset-document/.test(sys)) return [{ type: 'text', text: user.replace('Justin Chancellor speelt', 'Justin Chancellor plays') }];
  var scenes = sys.match(/==SCENE_[A-Z0-9_-]+==/g);
  if (scenes) {
    var uniek = Array.from(new Set(scenes));
    return [{ type: 'text', text: uniek.map(function(m) { return m + '\n' + tekstPreset(m.slice(8, -2).toLowerCase()); }).join('\n\n') }];
  }
  return [{ type: 'text', text: tekstPreset(/Precision/.test(user) ? 'pbass' : 'spector') }];
}

function maakBericht(params) {
  var content = inhoud(params);
  var tekst = content.filter(function(b) { return b.type === 'text'; }).map(function(b) { return b.text; }).join('');
  return {
    id: 'msg_fake', type: 'message', role: 'assistant', model: params.model, content: content,
    stop_reason: content.some(function(b) { return b.type === 'tool_use'; }) ? 'tool_use' : 'end_turn',
    usage: { input_tokens: 1200, output_tokens: Math.ceil(tekst.length / 4) + 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 800, server_tool_use: { web_search_requests: content.filter(function(b) { return b.type === 'server_tool_use'; }).length } }
  };
}

function stream(params) {
  var msg = maakBericht(params);
  var events = [{ type: 'message_start', message: Object.assign({}, msg, { content: [] }) }];
  events.push({ type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '' } });
  events.push({ type: 'content_block_stop', index: 0 });
  msg.content.forEach(function(b, i) {
    var idx = i + 1;
    if (b.type === 'text') {
      events.push({ type: 'content_block_start', index: idx, content_block: { type: 'text', text: '' } });
      for (var p = 0; p < b.text.length; p += 40) events.push({ type: 'content_block_delta', index: idx, delta: { type: 'text_delta', text: b.text.slice(p, p + 40) } });
    } else {
      events.push({ type: 'content_block_start', index: idx, content_block: b });
    }
    events.push({ type: 'content_block_stop', index: idx });
  });
  events.push({ type: 'message_delta', delta: { stop_reason: msg.stop_reason }, usage: msg.usage });
  events.push({ type: 'message_stop' });
  return {
    [Symbol.asyncIterator]: async function* () {
      for (var e of events) { await new Promise(function(r) { setTimeout(r, 2); }); yield e; }
    },
    finalMessage: function() { return Promise.resolve(msg); },
    on: function() { return this; }
  };
}

var messages = {
  stream: stream,
  create: function(params) { return Promise.resolve(maakBericht(params)); }
};

module.exports = {
  messages: messages,
  beta: { messages: messages },
  files: { upload: function() { return Promise.resolve({ id: 'file_fake' }); } },
  registreer: registreer,
  _laatsteParams: null
};
