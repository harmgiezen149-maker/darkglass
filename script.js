var selectedBass = 'spector';
var chatHistory = [];
var context = '';

// Bass buttons
document.querySelectorAll('.bass-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.bass-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    selectedBass = btn.dataset.bass;
  });
});

// Enter keys
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

  var system = 'Je bent een expert in bas-gitaar sound design, specifiek voor de Darkglass Anagram multieffect pedaal. Je kent alle beschikbare blokken: Input Gain, Compressor (Threshold/Ratio/Attack/Release), High-Pass Filter, Low-Pass Filter, Envelope Filter, Parametric EQ (5-band), Graphic EQ, B3K Ultra drive, Microtubes B7K overdrive, Alpha-Omega Ultra (dual channel distortion), Cab Simulator/IR Loader, Chorus, Flanger, Phaser, Tremolo, Vibrato, Delay, Reverb, Octaver, Pitch Shifter, Noise Gate, Output Volume, Parallel Blend. Geef altijd: 1) Korte analyse van de bastone van het nummer, 2) Signaalchain met blokken in volgorde (of parallel waar nodig), 3) Concrete instellingen per blok met cijfers, 4) Uitleg van elke keuze, 5) Fine-tune tips. Antwoord in het Nederlands. Gebruik ## voor hoofdsecties en ### voor blok-titels.';

  var userMsg = 'Ik wil de bastone van "' + song + '" van ' + artist + ' namaken met mijn ' + bassLabel + ' en de Darkglass Anagram. Geef me een volledig preset-plan met blokken, volgorde, eventuele parallel routing, en per blok exacte instellingen met uitleg.';

  chatHistory = [{ role: 'user', content: userMsg }];
  context = artist + ' - ' + song + ' | ' + bassLabel;

  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: history, system: system })
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (d.error) throw new Error(d.error);
    chathistory.push({ role: 'assistant', content: d.content });
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
  chathistory.push({ role: 'user', content: msg });

  var tid = 'typing' + Date.now();
  addMsg('assistant', '...', tid);

  var system = 'Je bent een expert in bas-gitaar sound design voor de Darkglass Anagram. Context: ' + context + '. Help de gebruiker de preset verder verfijnen. Antwoord in het Nederlands, wees concreet en technisch.';

  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: chathistory, system: system })
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (d.error) throw new Error(d.error);
    chathistory.push({ role: 'assistant', content: d.content });
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
  return t
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, function(m) { return '<ul>' + m + '</ul>'; })
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/^(?!<[hup])/gm, '<p>')
    .replace(/<p><\/p>/g, '');
}

function toHtmlSimple(t) {
  return t
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}
