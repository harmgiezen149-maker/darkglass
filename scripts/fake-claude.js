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
  // Testhaak: een artiest "FOUT529" laat de API een overbelasting-fout geven.
  if (/FOUT529/.test(JSON.stringify(params.messages))) {
    var Anthropic = require('@anthropic-ai/sdk');
    throw Anthropic.APIError.generate(529, { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' }, request_id: 'req_nep529' }, undefined, new Headers({ 'request-id': 'req_nep529' }));
  }
  module.exports.gezien.push({
    model: params.model, effort: params.output_config && params.output_config.effort,
    display: params.thinking && params.thinking.display,
    tools: (params.tools || []).map(function(t) { return t.name + ':' + (t.max_uses || '') + (t.max_content_tokens ? ':' + t.max_content_tokens : ''); })
  });
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
  if (params.thinking && params.thinking.display === 'summarized') {
    events.push({ type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'Ik kijk eerst welke versterker op de opname is gebruikt. ' } });
    events.push({ type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'Daarna kies ik de blokken die daar het dichtst bij komen.' } });
  }
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
  _laatsteParams: null,
  gezien: []
};

// ---------- sync (stap 2) ----------
function schemaVan(params) {
  return params.output_config && params.output_config.format && params.output_config.format.schema;
}

registreer(function(params, ctx) {
  var schema = schemaVan(params);
  if (schema && schema.properties && schema.properties.secties && schema.properties.kosmos) {
    return [{ type: 'text', text: JSON.stringify({
      kosmos: '1.18',
      secties: [
        { sectie: 'DRIVE', blokken: [{ naam: 'Microtubes B3K', pagina: 40 }, { naam: 'Vintage Microtubes', pagina: 41 }] },
        { sectie: 'AMP', blokken: [{ naam: 'Peggy Fliptop', pagina: 60 }] }
      ]
    }) }];
  }
  if (schema && schema.properties && schema.properties.blokken && schema.required.length === 1) {
    var b = /"Peggy Fliptop"/.test(ctx.user)
      ? [{ naam: 'Peggy Fliptop', basis: 'Ampeg B-15', pagina: 60, parameters: [
          { naam: 'Volume', type: 'knop', min: 0, max: 10, eenheid: '', opties: [], standaard: null, omschrijving: '' },
          { naam: 'Channel', type: 'keuze', min: null, max: null, eenheid: '', opties: ['1', '2'], standaard: null, omschrijving: '' }] }]
      : [{ naam: 'Microtubes B3K', basis: 'Darkglass B3K', pagina: 40, parameters: [
          { naam: 'Drive', type: 'knop', min: 0, max: 100, eenheid: '%', opties: [], standaard: null, omschrijving: '' },
          { naam: 'Blend', type: 'knop', min: 0, max: 100, eenheid: '%', opties: [], standaard: null, omschrijving: '' },
          { naam: 'Level', type: 'knop', min: -12, max: 12, eenheid: 'dB', opties: [], standaard: null, omschrijving: '' },
          { naam: 'Grunt', type: 'keuze', min: null, max: null, eenheid: '', opties: ['Off', 'Fat', 'Raw'], standaard: null, omschrijving: '' }] },
        { naam: 'Vintage Microtubes', basis: 'Darkglass VMT', pagina: 41, parameters: [
          { naam: 'Drive', type: 'knop', min: 0, max: 100, eenheid: '%', opties: [], standaard: null, omschrijving: '' },
          { naam: 'Blend', type: 'knop', min: 0, max: 100, eenheid: '%', opties: [], standaard: null, omschrijving: '' },
          { naam: 'Level', type: 'knop', min: 0, max: 100, eenheid: '%', opties: [], standaard: null, omschrijving: '' },
          { naam: 'Tone', type: 'knop', min: 0, max: 100, eenheid: '%', opties: [], standaard: null, omschrijving: '' },
          { naam: 'Grunt', type: 'schakelaar', min: null, max: null, eenheid: '', opties: [], standaard: null, omschrijving: '' }] }];
    return [{ type: 'text', text: JSON.stringify({ blokken: b }) }];
  }
  if ((params.tools || []).some(function(t) { return t.name === 'rapporteer_kosmos'; })) {
    return [
      { type: 'server_tool_use', id: 'srvtoolu_1', name: 'web_search', input: { query: 'Darkglass KosmOS release notes' } },
      { type: 'web_search_tool_result', tool_use_id: 'srvtoolu_1', content: [] },
      { type: 'tool_use', id: 'toolu_1', name: 'rapporteer_kosmos', input: {
        nieuwste_versie: '1.18', releasedatum: '2026-09', bronnen: ['https://www.darkglass.com/'],
        blokken: [{ naam: 'Neural Amp', sectie: 'NEURAL', basis: 'NAM A2', versie: '1.16', bron_url: 'https://www.darkglass.com/', parameters: [] },
          { naam: 'Peggy Classic', sectie: 'AMP', basis: 'Ampeg SVT', versie: '1.16', bron_url: 'https://www.darkglass.com/', parameters: [] }]
      } }
    ];
  }
  return null;
});

// ---------- analyse (stap 3) ----------
function nepScene(basId, fout) {
  return {
    bas_id: basId, b_snaar_vereist: basId !== 'spector', stemming: 'Drop D',
    toneanalyse: 'Justin Chancellor speelt met plectrum op een **Wal** bas met veel hoog-mid.',
    routing: 'serieel', chain_a: ['Compressor/Limiter', 'Microtubes B3K', 'Jim Bass', 'Gain'], chain_b: [], merge_naar: [],
    blokken: [
      { label: 'Compressor/Limiter', blok: 'Compressor/Limiter', origineel: 'compressie', instellingen: [{ parameter: 'Threshold', waarde: '-20 dB' }, { parameter: 'Ratio', waarde: '4:1' }], uitleg: 'Egaliseert de aanslag.' },
      { label: 'Microtubes B3K', blok: 'Microtubes B3K', origineel: 'Darkglass B3K', instellingen: [{ parameter: 'Drive', waarde: fout ? '140%' : '40%' }, { parameter: 'Blend', waarde: '50%' }, { parameter: 'Grunt', waarde: 'Fat' }, { parameter: 'Mid Boost', waarde: 'On' }, { parameter: 'Tone', waarde: '5 kHz' }].concat(fout ? [{ parameter: 'Fuzz', waarde: '10%' }] : []), uitleg: 'Grommende drive.' },
      { label: 'Jim Bass', blok: 'Jim Bass', origineel: 'Ampeg SVT', instellingen: [{ parameter: 'Gain', waarde: '45%' }, { parameter: 'Bright', waarde: 'Off' }], uitleg: 'Ampeg-basis.' },
      { label: 'Gain', blok: 'Gain', origineel: 'volume', instellingen: [{ parameter: 'Level', waarde: '100%' }], uitleg: 'Volumeregelaar.' }
    ],
    tips: ['Stem naar Drop D.', 'Speel met plectrum.', 'Draai de mid-boost terug als het te nasaal wordt.'],
    songdelen: [
      { deel: 'Intro', omschrijving: 'Clean en strak.', footswitch: '', wijzigingen: [{ label: 'Microtubes B3K', actie: 'uit', parameter: '', waarde: '' }] },
      { deel: 'Refrein', omschrijving: 'Drive erbij, iets zachter om het volume gelijk te houden.', footswitch: 'FS2', wijzigingen: [{ label: 'Microtubes B3K', actie: 'aan', parameter: '', waarde: '' }, { label: 'Gain', actie: 'wijzig', parameter: 'Level', waarde: '90%' }] }
    ],
    nam_suggestie: { versterker: 'Ampeg SVT-CL', zoekterm: 'Ampeg SVT bass', waarom: 'De opname gebruikt een SVT.' }
  };
}

registreer(function(params, ctx) {
  if ((params.tools || []).some(function(t) { return t.name === 'lever_toneprofiel'; })) {
    var blokkenUit = [];
    if ((params.tools || []).some(function(t) { return t.name === 'web_search'; })) {
      blokkenUit.push({ type: 'server_tool_use', id: 'srvtoolu_a', name: 'web_search', input: { query: 'Justin Chancellor Schism bass rig' } });
      blokkenUit.push({ type: 'web_search_tool_result', tool_use_id: 'srvtoolu_a', content: [] });
      blokkenUit.push({ type: 'server_tool_use', id: 'srvtoolu_b', name: 'web_fetch', input: { url: 'https://equipboard.com/pros/justin-chancellor' } });
    }
    blokkenUit.push({ type: 'tool_use', id: 'toolu_p', name: 'lever_toneprofiel', input: {
      artiest: 'Tool', song: 'Schism', opname: 'Lateralus (2001)', bassist: 'Justin Chancellor', genre: 'Progressive metal',
      samenvatting: 'Plectrum op een Wal bas, door een Ampeg SVT met wat drive.', b_snaar_vereist: false, stemming: 'Drop D',
      speeltechniek: 'Plectrum', klank: { karakter: 'Grommend en helder', eq: 'Veel hoog-mid', compressie: 'Licht', distortion: 'Lichte drive', effecten: 'Geen' },
      bevindingen: [
        { onderwerp: 'Bas', waarde: 'Wal Mk1', zekerheid: 'hoog', bron_urls: ['https://equipboard.com/pros/justin-chancellor'] },
        { onderwerp: 'Versterker', waarde: 'Ampeg SVT', zekerheid: 'middel', bron_urls: [] },
        { onderwerp: 'Pedaal', waarde: '<script>alert(1)</script>', zekerheid: 'laag', bron_urls: ['javascript:alert(1)'] }
      ],
      bronnen: [{ titel: 'Equipboard', url: 'https://equipboard.com/pros/justin-chancellor' }, { titel: 'kwaadaardig', url: 'javascript:alert(1)' }],
      zekerheid: { algemeen: 'middel', toelichting: 'Gear goed gedocumenteerd, instellingen niet.' }
    } });
    return blokkenUit;
  }
  var schema = schemaVan(params);
  if (!schema || !schema.properties) return null;
  if (schema.properties.teksten) {
    var lijst = JSON.parse(ctx.user);
    return [{ type: 'text', text: JSON.stringify({ teksten: lijst.map(function(x) { return '[EN] ' + x; }) }) }];
  }
  if (schema.properties.scenes) {
    var ids = schema.properties.scenes.items.properties.bas_id.enum;
    return [{ type: 'text', text: JSON.stringify({ artiest: 'Tool', song: 'Schism', scenes: ids.map(function(id, i) { return nepScene(id, i === 0); }) }) }];
  }
  if (schema.properties.antwoord) {
    var id = schema.properties.scene.properties.bas_id.enum[0];
    var s = nepScene(id, false);
    s.blokken[1].instellingen[0].waarde = '25%';
    return [{ type: 'text', text: JSON.stringify({ antwoord: 'Drive teruggezet naar 25% voor minder vervorming.', scene: s }) }];
  }
  if (schema.properties.bas_id) {
    return [{ type: 'text', text: JSON.stringify(nepScene(schema.properties.bas_id.enum[0], false)) }];
  }
  return null;
});
