// =====================
// STATE
// =====================
var selectedBass = 'spector';
var chatHistory = [];
var chatContext = '';

// =====================
// BASS SELECTIE
// =====================
document.querySelectorAll('.bass-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.bass-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    selectedBass = btn.dataset.bass;
  });
});

document.getElementById('artistInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') document.getElementById('songInput').focus();
});
document.getElementById('songInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') analyzeTone();
});

// =====================
// SYSTEEM PROMPT
// =====================
var SYSTEM_ANALYZE = 'Je bent een expert in bas-gitaar sound design voor de Darkglass Anagram (KosmOS v1.13). '
  + 'Gebruik ALTIJD de exacte officiële bloknamen van de Anagram, met tussen haakjes het originele apparaat waarop het gebaseerd is.\n\n'
  + 'OFFICIËLE BLOKNAMEN:\n'
  + 'DRIVE: Microtubes B3K (Darkglass B3K pedaal), Vintage Microtubes (Darkglass Vintage Microtubes), Alpha Omicron (Darkglass Alpha Omicron), Duality Fuzz (Darkglass Duality Fuzz), Chinchilla (EHX Big Muff-stijl), Microtubes X (Darkglass Microtubes X), Green PiRate Fuzz (EHX Green Russian Big Muff), Bee Kolme OD (Boss ODB-3-stijl), Arc Dreamer (Ibanez Tube Screamer-stijl), Mood Fuzz, Entropia (Darkglass multiband distortion), Neural Pedal Loader\n'
  + 'PREAMP/AMP: Harmonic Booster (Darkglass Harmonic Booster), Leo Bass (Fender Bassman), Jim Bass (Ampeg SVT), Gentle (Aguilar Tone Hammer-stijl), Peggy Bass (Ampeg SVT-stijl), SWIRL-900 (SWR SM-900), Modern ISOBRICK 750 (Mesa Boogie M9-stijl), Fruity HB 500 (Hartke HA500-stijl), Neural Amp Loader\n'
  + 'CABINET: IR Loader + specifiek kabinet bijv. Darkglass Neo 4x10, Modern Bass 4x10, Peggy 8x10\n'
  + 'COMPRESSOR: Ignissor (Darkglass multiband compressor), FET Compressor (UA 1176-stijl), BUS Compressor (SSL G-Bus-stijl), Compressor/Limiter\n'
  + 'EQ/FILTER: Parametric EQ, Darkglass 6-Band EQ, Generic 6-Band EQ, Amp EQ, Hi-Pass Filter, Lo-Pass Filter, Gravitron (Mu-Tron III envelope filter), Noise Suppressor (Boss NS-2-stijl), Wauwa (wah filter)\n'
  + 'MODULATIE: Mint Chocolate Chorus (Boss CE-2-stijl), Flamingo Flanger (Boss BF-2-stijl), Pharos Phaser (MXR Phase 90-stijl), Tremora Tremolo (Boss TR-2-stijl), Vibralis Vibrato (Boss VB-2-stijl)\n'
  + 'PITCH: Sublime Octaver mono (Boss OC-2-stijl), Sublemon Octaver mono, Subcitri Octaver poly (EHX POG-stijl), Pitch Shifter poly\n'
  + 'DELAY: Digital Delay (Boss DD-3-stijl), Analog Delay (Boss DM-2-stijl), Modulation Delay (EHX Memory Man-stijl)\n'
  + 'REVERB: Room Reverb, Plate Reverb, Hall Reverb, Shimmer Reverb\n'
  + 'UTILITY: Gain, Split, Merge, Output, Volume Pedal\n\n'
  + 'BELANGRIJK: Zet ALTIJD als absolute eerste regel van je antwoord:\n'
  + 'B_SNAAR_VEREIST: ja\n'
  + 'of\n'
  + 'B_SNAAR_VEREIST: nee\n'
  + 'Geef "ja" als het nummer een lage B-snaar (5e snaar, onder de E-snaar) vereist of sterk aanbeveelt voor het originele geluid. Geen andere tekst voor deze regel.\n\n'
  + 'Daarna structureer je antwoord ALTIJD exact zo:\n\n'
  + '## TONE ANALYSE\n[analyse]\n\n'
  + '## SIGNAALCHAIN\n'
  + 'SERIEEL of PARALLEL\n'
  + 'CHAIN_A: Blok1 > Blok2 > Blok3\n'
  + 'CHAIN_B: Blok4 > Blok5 (alleen bij parallel)\n'
  + 'MERGE_NAAR: Blok6 (alleen bij parallel)\n\n'
  + '## BLOKKEN\n\n'
  + '### EXACTE BLOKNAAM (origineel model)\n'
  + 'INSTELLINGEN:\n- Parameter: waarde\n'
  + 'UITLEG: één zin\n\n'
  + '## FINE-TUNE TIPS\n[3 tips]\n\n'
  + 'Antwoord in het Nederlands.';

// =====================
// ANALYSEER TONE
// =====================
function analyzeTone() {
  var artist = document.getElementById('artistInput').value.trim();
  var song = document.getElementById('songInput').value.trim();
  if (!artist || !song) { alert('Vul artiest en songtitel in.'); return; }

  var bassLabel = selectedBass === 'spector'
    ? 'Spector NS Ethos 5 (actief, 5-snarig, EMG-Hz pickup)'
    : 'Fender Precision Bass (passief, 4-snarig, Split-P pickup)';

  var btn = document.getElementById('analyzeBtn');
  btn.disabled = true;
  document.getElementById('btnText').textContent = 'ANALYSEREN...';

  document.getElementById('outputPanel').classList.remove('hidden');
  document.getElementById('chatPanel').classList.add('hidden');
  document.getElementById('outputMeta').textContent =
    artist.toUpperCase() + ' — ' + song.toUpperCase() + ' · ' + bassLabel.toUpperCase();
  document.getElementById('outputContent').innerHTML =
    '<div class="loading"><div class="vu"><span></span><span></span><span></span><span></span><span></span><span></span></div><p>Bastone analyseren...</p></div>';
  document.getElementById('outputPanel').scrollIntoView({ behavior: 'smooth' });

  var extra = document.getElementById('extraInput').value.trim();

  var userMsg = 'Ik wil de bastone van "' + song + '" van ' + artist
    + ' namaken met mijn ' + bassLabel + ' en de Darkglass Anagram. Geef me een volledig preset-plan.'
    + (extra ? '\n\nExtra wensen van de speler: ' + extra : '');

  chatHistory = [{ role: 'user', content: userMsg }];
  chatContext = artist + ' - ' + song + ' | ' + bassLabel;

  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: chatHistory, system: SYSTEM_ANALYZE })
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (d.error) throw new Error(d.error);
    chatHistory.push({ role: 'assistant', content: d.content });
    document.getElementById('outputContent').innerHTML = toHtml(d.content);
    document.getElementById('chatPanel').classList.remove('hidden');
    document.getElementById('chatMessages').innerHTML = '';
    addMsg('assistant', 'Preset klaar! Heb je vragen of wil je de sound verder verfijnen?');
    document.getElementById('chatPanel').scrollIntoView({ behavior: 'smooth' });
  })
  .catch(function(e) {
    document.getElementById('outputContent').innerHTML =
      '<p style="color:var(--accent2)">Fout: ' + e.message + '</p>';
  })
  .finally(function() {
    btn.disabled = false;
    document.getElementById('btnText').textContent = 'ANALYSEER TONE';
  });
}

// =====================
// CHAT
// =====================
function sendChat() {
  var input = document.getElementById('chatInput');
  var msg = input.value.trim();
  if (!msg) return;
  input.value = '';

  // Toon gebruikersbericht in chat
  addMsg('user', msg);

  // Voeg toe aan geschiedenis als extra wens
  chatHistory.push({ role: 'user', content: msg });

  // Laadmelding in chat
  var tid = 'typing' + Date.now();
  addMsg('assistant', 'Preset wordt bijgewerkt...');

  // Laadanimatie in panel 02
  document.getElementById('outputContent').innerHTML =
    '<div class="loading"><div class="vu"><span></span><span></span><span></span><span></span><span></span><span></span></div><p>Preset bijwerken...</p></div>';
  document.getElementById('outputPanel').scrollIntoView({ behavior: 'smooth' });

  // Vraag een volledig nieuwe preset op basis van de volledige geschiedenis
  var systemChat = SYSTEM_ANALYZE
    + '\n\nDe gebruiker heeft de volgende aanvullende wens opgegeven. '
    + 'Genereer een VOLLEDIG NIEUW en BIJGEWERKT preset-plan in exact hetzelfde formaat als hiervoor. '
    + 'Verwerk de aanpassing in de nieuwe preset. Geef geen uitleg in tekst — alleen het volledige preset-plan.';

  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: chatHistory, system: systemChat })
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (d.error) throw new Error(d.error);
    chatHistory.push({ role: 'assistant', content: d.content });

    // Vernieuw panel 02 met nieuwe preset
    document.getElementById('outputContent').innerHTML = toHtml(d.content);

    // Bevestiging in chat (vervang laadmelding)
    var lastMsg = document.getElementById('chatMessages').lastElementChild;
    if (lastMsg) {
      var bubble = lastMsg.querySelector('.msg-bubble');
      if (bubble) bubble.innerHTML = '✓ Preset bijgewerkt op basis van je wens.';
    }

    document.getElementById('outputPanel').scrollIntoView({ behavior: 'smooth' });
  })
  .catch(function(e) {
    document.getElementById('outputContent').innerHTML =
      '<p style="color:var(--accent2)">Fout: ' + e.message + '</p>';
    var lastMsg = document.getElementById('chatMessages').lastElementChild;
    if (lastMsg) {
      var bubble = lastMsg.querySelector('.msg-bubble');
      if (bubble) bubble.textContent = 'Fout: ' + e.message;
    }
  });
}

function addMsg(role, text, id) {
  var c = document.getElementById('chatMessages');
  var d = document.createElement('div');
  d.className = 'msg ' + role;
  if (id) d.id = id;
  d.innerHTML = '<span class="msg-role">'
    + (role === 'user' ? 'JIJ' : 'ANAGRAM AI')
    + '</span><div class="msg-bubble">' + toHtmlSimple(text) + '</div>';
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}

// =====================
// B-SNAAR DETECTIE
// =====================
function checkBSnaar(tekst) {
  var t = tekst.toLowerCase();

  // 1. Gestructureerde flag check
  var regels = t.split('\n');
  for (var i = 0; i < regels.length; i++) {
    var r = regels[i].trim();
    if (r.startsWith('b_snaar_vereist:')) {
      return r.indexOf('ja') !== -1;
    }
  }

  // 2. Keyword fallback als de AI de flag vergeet
  var keywords = [
    'lage b-snaar', 'lage b snaar', 'b-snaar nodig', 'b-snaar vereist',
    'b-snaar wordt', 'b snaar wordt', 'vijfde snaar', '5e snaar',
    'low b string', 'low-b', 'sub-lage', 'onder de e-snaar',
    'b-snaar is noodzakelijk', 'b-snaar is vereist'
  ];
  for (var j = 0; j < keywords.length; j++) {
    if (t.indexOf(keywords[j]) !== -1) return true;
  }

  return false;
}

// =====================
// SIGNAALCHAIN RENDERER
// =====================
function renderChainRegel(chainStr) {
  // Ondersteun zowel > als → als scheidingsteken
  var normalized = chainStr.replace(/→/g, '>').replace(/\->/g, '>');
  var blokken = normalized.split('>').map(function(b) { return b.trim(); }).filter(Boolean);
  var html = '';
  blokken.forEach(function(b, idx) {
    html += '<span class="chain-block">' + b + '</span>';
    if (idx < blokken.length - 1) html += '<span class="chain-arrow">→</span>';
  });
  return html;
}

// =====================
// HTML RENDERER (output)
// =====================
function toHtml(t) {
  var regels = t.split('\n');
  var html = '';
  var inBlok = false;
  var blokNaam = '';
  var blokSettings = [];
  var blokUitleg = '';
  var blokTeller = 0;
  var inChain = false;
  var chainHtml = '';
  var inTips = false;

  // B-snaar waarschuwing bovenaan
  if (selectedBass === 'pbass' && checkBSnaar(t)) {
    html += '<div class="bsnaar-warning">'
      + '<span class="bsnaar-icon">⚠</span>'
      + '<div><strong>Let op: 4-snarige bas</strong><br>'
      + 'Dit nummer maakt waarschijnlijk gebruik van een lage B-snaar. '
      + 'Met je Fender Precision Bass (4-snarig) kun je mogelijk niet alle noten spelen zoals in het origineel. '
      + 'Overweeg de Spector NS Ethos 5 te gebruiken.</div>'
      + '</div>';
  }

  function sluitBlok() {
    if (!inBlok) return;
    var settingsHtml = blokSettings.map(function(s) {
      var idx = s.indexOf(':');
      if (idx === -1) return '';
      var param = s.substring(0, idx).replace(/^-\s*/, '').trim();
      var waarde = s.substring(idx + 1).trim();
      return '<div class="setting-item">'
        + '<div class="setting-param">' + param + '</div>'
        + '<div class="setting-waarde">' + waarde + '</div>'
        + '</div>';
    }).join('');
    html += '<div class="blok-kaart">'
      + '<div class="blok-titel">'
      + '<span class="blok-nummer">' + blokTeller + '</span>'
      + '<span class="blok-naam">' + blokNaam + '</span>'
      + '</div><div class="blok-body">';
    if (settingsHtml) html += '<div class="blok-settings">' + settingsHtml + '</div>';
    if (blokUitleg) html += '<div class="blok-uitleg">' + blokUitleg + '</div>';
    html += '</div></div>';
    inBlok = false; blokNaam = ''; blokSettings = []; blokUitleg = '';
  }

  function sluitChain() {
    if (!inChain) return;
    html += '<div class="chain-container">' + chainHtml + '</div>';
    chainHtml = ''; inChain = false;
  }

  function sluitTips() {
    if (!inTips) return;
    html += '</div>';
    inTips = false;
  }

  for (var i = 0; i < regels.length; i++) {
    var r = regels[i].trim();
    if (!r) continue;

    // Sla B_SNAAR regel over
    if (r.toLowerCase().startsWith('b_snaar_vereist:')) continue;

    if (r.startsWith('## ')) {
      sluitBlok(); sluitChain(); sluitTips();
      var sectie = r.replace('## ', '');
      if (sectie === 'SIGNAALCHAIN') {
        html += '<div class="sectie-titel">SIGNAALCHAIN</div>';
        inChain = true; chainHtml = '';
      } else if (sectie === 'FINE-TUNE TIPS') {
        html += '<div class="sectie-titel">FINE-TUNE TIPS</div><div class="tip-box">';
        inTips = true;
      } else {
        html += '<div class="sectie-titel">' + sectie + '</div>';
      }
      continue;
    }

    if (inChain) {
      if (r === 'SERIEEL') {
        chainHtml += '<div class="chain-row"><span class="parallel-badge" style="border-color:var(--accent);color:var(--accent)">→ SERIEEL</span></div>';
      } else if (r === 'PARALLEL') {
        chainHtml += '<div class="chain-row"><span class="parallel-badge">⇄ PARALLEL ROUTING</span></div>';
      } else if (r.startsWith('CHAIN_A:')) {
        chainHtml += '<div class="chain-row"><span class="chain-label">A</span>' + renderChainRegel(r.replace('CHAIN_A:', '').trim()) + '</div>';
      } else if (r.startsWith('CHAIN_B:')) {
        chainHtml += '<div class="chain-row"><span class="chain-label">B</span>' + renderChainRegel(r.replace('CHAIN_B:', '').trim()) + '</div>';
      } else if (r.startsWith('CHAIN:')) {
        chainHtml += '<div class="chain-row">' + renderChainRegel(r.replace('CHAIN:', '').trim()) + '</div>';
      } else if (r.startsWith('MERGE_NAAR:')) {
        chainHtml += '<div class="chain-row"><span class="chain-merge">⇣ MERGE</span>' + renderChainRegel(r.replace('MERGE_NAAR:', '').trim()) + '</div>';
      } else if (r.indexOf('→') !== -1 || r.indexOf('>') !== -1) {
        // Fallback: gewone tekstregel met pijlen = chain
        chainHtml += '<div class="chain-row">' + renderChainRegel(r) + '</div>';
      } else if (r === 'SERIEEL:' || r === 'PARALLEL:') {
        var isParallel = r.startsWith('PARALLEL');
        chainHtml += '<div class="chain-row"><span class="parallel-badge" style="' + (isParallel ? '' : 'border-color:var(--accent);color:var(--accent)') + '">' + (isParallel ? '⇄ PARALLEL ROUTING' : '→ SERIEEL') + '</span></div>';
      } else {
        chainHtml += '<p style="font-size:0.75rem;color:var(--text-dim);margin:0.25rem 0">' + r + '</p>';
      }
      continue;
    }

    if (r.startsWith('### ')) {
      sluitBlok();
      blokTeller++; inBlok = true;
      blokNaam = r.replace('### ', '');
      continue;
    }

    if (inBlok) {
      if (r === 'INSTELLINGEN:') continue;
      if (r.startsWith('- ')) { blokSettings.push(r); }
      else if (r.startsWith('UITLEG:')) { blokUitleg = r.replace('UITLEG:', '').trim(); }
      continue;
    }

    if (inTips) {
      html += '<p style="margin-bottom:0.5rem">' + r.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') + '</p>';
      continue;
    }

    html += '<p>' + r.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') + '</p>';
  }

  sluitBlok(); sluitChain(); sluitTips();
  return html;
}

// =====================
// SIMPELE HTML (chat)
// =====================
function toHtmlSimple(t) {
  return t
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}
