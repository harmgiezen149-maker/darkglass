var selectedBass = 'spector';
var chatHistory = [];
var context = '';

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
  document.getElementById('outputMeta').textContent = artist.toUpperCase() + ' — ' + song.toUpperCase() + ' · ' + bassLabel.toUpperCase();
  document.getElementById('outputContent').innerHTML = '<div class="loading"><div class="vu"><span></span><span></span><span></span><span></span><span></span><span></span></div><p>Bastone analyseren...</p></div>';
  document.getElementById('outputPanel').scrollIntoView({ behavior: 'smooth' });

 var system = 'Je bent een expert in bas-gitaar sound design voor de Darkglass Anagram (KosmOS v1.13). Gebruik ALTIJD de exacte officiële bloknamen van de Anagram, met tussen haakjes het originele apparaat/model waarop het gebaseerd is.\n\nOFFICIELE BLOKNAMEN:\nDRIVE: Microtubes B3K (Darkglass B3K pedaal), Vintage Microtubes (Darkglass Vintage Microtubes), Alpha Omicron (Darkglass Alpha Omicron), Duality Fuzz (Darkglass Duality Fuzz), Chinchilla (EHX Big Muff-stijl), Microtubes X (Darkglass Microtubes X), Atomic Sans (MXR Bass D.I.-stijl), Green PiRate Fuzz (EHX Green Russian Muff), Bee Kolme OD (Boss ODB-3-stijl), Arc Dreamer (Ibanez Tube Screamer-stijl), Mood Fuzz, Entropia (Darkglass multiband distortion plugin), Neural Pedal Loader (NAM pedaalmodellen)\nPREAMP/AMP: Harmonic Booster (Darkglass Harmonic Booster), Leo Bass (Fender Bassman), Jim Bass (Ampeg SVT), Gentle (Aguilar Tone Hammer-stijl), Peggy Bass (Ampeg SVT-stijl), SWIRL-900 (SWR SM-900), SWE TC650 (SWR/TC Elec.), Modern ISOBRICK 750 (Mesa Boogie M9), Fruity HB 500 (Hartke HA500), Neural Amp Loader (NAM ampmodellen)\nCABINET: IR Loader + specifiek kabinet bijv. Darkglass Neo 4x10, Jim Bass 8x10, Modern Bass 4x10\nCOMPRESSOR: Ignissor (Darkglass multiband compressor), FET Compressor (UA 1176-stijl), BUS Compressor (SSL G-Bus-stijl), Compressor/Limiter (algemeen)\nEQ/FILTER: Parametric EQ, Darkglass 6-Band EQ, Generic 6-Band EQ, Amp EQ, Hi-Pass Filter, Lo-Pass Filter, Gravitron (Mu-Tron III envelope filter), mo**erf***r (envelope filter), Wauwa (wah filter), Noise Suppressor (Boss NS-2-stijl)\nMODULATIE: Mint Chocolate Chorus (Boss CE-2-stijl), Flamingo Flanger (Boss BF-2-stijl), Pharos Phaser (MXR Phase 90-stijl), Tremora Tremolo (Boss TR-2-stijl), Vibralis Vibrato (Boss VB-2-stijl)\nPITCH: Sublime Octaver mono (Boss OC-2-stijl), Sublemon Octaver mono, Subcitri Octaver poly (EHX POG-stijl), Pitch Shifter poly, Pitch Bender\nDELAY: Digital Delay (Boss DD-3-stijl), Analog Delay (Boss DM-2-stijl), Modulation Delay (EHX Memory Man-stijl)\nREVERB: Room Reverb, Plate Reverb, Hall Reverb, Shimmer Reverb\nUTILITY: Gain, Split, Merge, Send, Return, FX Loop, Output, Volume Pedal\n\nStructureer je antwoord ALTIJD exact zo:\n\n## TONE ANALYSE\n[analyse]\n\n## SIGNAALCHAIN\nSERIEEL of PARALLEL\nCHAIN_A: Blok1 > Blok2 > Blok3\nCHAIN_B: Blok4 > Blok5 (alleen bij parallel, weglaten bij serieel)\nMERGE_NAAR: Blok6 > Blok7 (alleen bij parallel, bij serieel weglaten)\n\n## BLOKKEN\n### EXACTE BLOKNAAM (origineel model)\nINSTELLINGEN:\n- Parameter: waarde\nUITLEG: [één zin]\n\n## FINE-TUNE TIPS\n[3 tips]\n\nAntwoord in het Nederlands. Gebruik exacte bloknamen altijd.';
  
  var userMsg = 'Ik wil de bastone van "' + song + '" van ' + artist + ' namaken met mijn ' + bassLabel + ' en de Darkglass Anagram. Geef me een volledig preset-plan met blokken, volgorde, eventuele parallel routing, en per blok exacte instellingen met uitleg.';

  chatHistory = [{ role: 'user', content: userMsg }];
  context = artist + ' - ' + song + ' | ' + bassLabel;

  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: chatHistory, system: system })
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
    document.getElementById('outputContent').innerHTML = '<p style="color:var(--accent2)">Fout: ' + e.message + '</p>';
  })
  .finally(function() {
    btn.disabled = false;
    document.getElementById('btnText').textContent = 'ANALYSEER TONE';
  });
}

function sendChat() {
  var input = document.getElementById('chatInput');
  var msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  addMsg('user', msg);
  chatHistory.push({ role: 'user', content: msg });

  var tid = 'typing' + Date.now();
  addMsg('assistant', '...', tid);

  var system = 'Je bent een expert in bas-gitaar sound design voor de Darkglass Anagram. Context: ' + context + '. Help de gebruiker de preset verder verfijnen. Antwoord in het Nederlands, wees concreet en technisch.';

  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: chatHistory, system: system })
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (d.error) throw new Error(d.error);
    chatHistory.push({ role: 'assistant', content: d.content });
    var el = document.getElementById(tid);
    if (el) el.querySelector('.msg-bubble').innerHTML = toHtmlSimple(d.content);
  })
  .catch(function(e) {
    var el = document.getElementById(tid);
    if (el) el.querySelector('.msg-bubble').textContent = 'Fout: ' + e.message;
  })
  .finally(function() {
    var c = document.getElementById('chatMessages');
    c.scrollTop = c.scrollHeight;
  });
}

function addMsg(role, text, id) {
  var c = document.getElementById('chatMessages');
  var d = document.createElement('div');
  d.className = 'msg ' + role;
  if (id) d.id = id;
  d.innerHTML = '<span class="msg-role">' + (role === 'user' ? 'JIJ' : 'ANAGRAM AI') + '</span><div class="msg-bubble">' + toHtmlSimple(text) + '</div>';
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}

function toHtml(t) {
  var blokTeller = 0;
  var html = '';
  var regels = t.split('\n');
  var i = 0;
  var inBlok = false;
  var blokNaam = '';
  var blokSettings = [];
  var blokUitleg = '';

  function sluitBlok() {
    if (!inBlok) return;
    var settingsHtml = blokSettings.map(function(s) {
      var delen = s.split(':');
      var param = delen[0] ? delen[0].trim().replace(/^- /, '') : '';
      var waarde = delen.slice(1).join(':').trim();
      return '<div class="setting-item"><div class="setting-param">' + param + '</div><div class="setting-waarde">' + waarde + '</div></div>';
    }).join('');
    html += '<div class="blok-kaart">';
    html += '<div class="blok-titel"><span class="blok-nummer">' + blokTeller + '</span><span class="blok-naam">' + blokNaam + '</span></div>';
    html += '<div class="blok-body">';
    if (settingsHtml) html += '<div class="blok-settings">' + settingsHtml + '</div>';
    if (blokUitleg) html += '<div class="blok-uitleg">' + blokUitleg + '</div>';
    html += '</div></div>';
    inBlok = false; blokNaam = ''; blokSettings = []; blokUitleg = '';
  }

  while (i < regels.length) {
    var r = regels[i].trim();
    if (r.startsWith('## ')) {
      sluitBlok();
      html += '<div class="sectie-titel">' + r.replace('## ', '') + '</div>';
    } else if (r.startsWith('### ')) {
      sluitBlok();
      blokTeller++;
      inBlok = true;
      blokNaam = r.replace('### ', '');
    } else if (inBlok && r.startsWith('INSTELLINGEN:')) {
      // skip header
    } else if (inBlok && r.startsWith('- ') && !r.startsWith('UITLEG:')) {
      blokSettings.push(r);
    } else if (inBlok && r.startsWith('UITLEG:')) {
      blokUitleg = r.replace('UITLEG:', '').trim();
    } else if (r.startsWith('PARALLEL:')) {
      html += '<div class="parallel-badge">⇄ ' + r + '</div>';
    } else if (r.startsWith('## FINE-TUNE') || (!inBlok && r !== '')) {
      if (r.startsWith('## FINE-TUNE')) {
        html += '<div class="sectie-titel">FINE-TUNE TIPS</div><div class="tip-box">';
      } else if (!inBlok) {
        html += '<p>' + r.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') + '</p>';
      }
    }
    i++;
  }
  sluitBlok();
  // Sluit tip-box als die open is
  if (t.includes('## FINE-TUNE')) html += '</div>';
  return html;
}
function toHtmlSimple(t) {
  return t
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}
