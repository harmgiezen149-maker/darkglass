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

  var system = 'Je bent een expert in bas-gitaar sound design voor de Darkglass Anagram. Structureer je antwoord ALTIJD exact zo:\n\n## TONE ANALYSE\n[korte analyse van de bastone]\n\n## SIGNAALCHAIN\n[beschrijf de volgorde, en geef aan als er parallel routing nodig is met: PARALLEL: ja/nee en uitleg]\n\n## BLOKKEN\n\nGeef elk blok in dit exacte formaat:\n### BLOKNAAM\nINSTELLINGEN:\n- Parameter: waarde\n- Parameter: waarde\nUITLEG: [één zin waarom deze instelling]\n\n## FINE-TUNE TIPS\n[3 concrete tips]\n\nAntwoord in het Nederlands. Wees specifiek met cijfers en percentages.';
 
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
