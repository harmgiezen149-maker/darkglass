// Wat Claude in darkglass mag (Harm, 2026-10-31): lezen, en setlists maken of
// aanpassen van presets die er al zijn. Niets verwijderen, geen presets
// bewerken, en nooit een analyse of chat starten (die kosten API-geld).

var redis = require('./redis');
var rig = require('./rig');
var mcp = require('./mcp');

var PRESETS = 'anagram:presets';
var SETLISTS = 'anagram:setlists';
var MAX_PRESET_TEKENS = 30000;

function tekst(v, max) { return String(v == null ? '' : v).trim().slice(0, max || 200); }
function geldigId(id) { return typeof id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(id); }

async function hash(naam) {
  var plat = await redis.cmd(['HGETALL', naam]) || [];
  var uit = {};
  for (var i = 0; i < plat.length; i += 2) { var v = redis.parseJson(plat[i + 1]); if (v && typeof v === 'object') uit[plat[i]] = v; }
  return uit;
}

function kort(p) {
  return { id: p.id, artist: p.artist || '', song: p.song || '', bass: p.bass || '', label: p.label || '', tags: p.tags || [],
    genre: (p.onderzoek && p.onderzoek.genre) || '', score: p.feedback ? p.feedback.score : null };
}

function maak(opties) {
  opties = opties || {};
  var nieuwId = opties.nieuwId || function() { return Date.now().toString(); };
  var vandaag = opties.vandaag || function() { return new Date().toLocaleDateString('nl-NL', { timeZone: 'Europe/Amsterdam' }); };

  return [
    { name: 'list_presets', title: 'Presets bekijken', alleenLezen: true,
      description: "List Harm's saved Darkglass Anagram presets (artist, song, bass, label, tags, genre, thumbs up/down). Optional query filters on any of those.",
      inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number', description: 'default 50' } } },
      run: async function(a) {
        var q = tekst(a.query).toLowerCase();
        var lijst = Object.values(await hash(PRESETS)).filter(function(p) { return p && p.artist && p.song; }).map(kort)
          .filter(function(p) { return !q || [p.artist, p.song, p.bass, p.label, p.tags.join(' '), p.genre].join(' ').toLowerCase().indexOf(q) !== -1; })
          .sort(function(x, y) { return (x.artist + x.song).localeCompare(y.artist + y.song); });
        return { aantal: lijst.length, presets: lijst.slice(0, Math.min(200, Math.max(1, Number(a.limit) || 50))) };
      } },
    { name: 'get_preset', title: 'Preset lezen', alleenLezen: true,
      description: 'Read one preset in full: scenes, blocks and their settings, research notes and feedback.',
      inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      run: async function(a) {
        var id = tekst(a.id, 64);
        if (!geldigId(id)) throw new mcp.McpFout('Geen geldig preset-id.');
        var p = redis.parseJson(await redis.cmd(['HGET', PRESETS, id]));
        if (!p) throw new mcp.McpFout('Die preset bestaat niet (meer).');
        var json = JSON.stringify(p);
        if (json.length > MAX_PRESET_TEKENS) { var kopie = Object.assign({}, p); delete kopie.onderzoek; delete kopie.versies; return kopie; }
        return p;
      } },
    { name: 'list_setlists', title: 'Setlists bekijken', alleenLezen: true,
      description: 'List the setlists: name, note, date and the presets in order (artist and song).',
      inputSchema: { type: 'object', properties: {} },
      run: async function() {
        var presets = await hash(PRESETS), setlists = await hash(SETLISTS);
        return { setlists: Object.values(setlists).map(function(s) {
          return { id: s.id, naam: s.naam, notitie: s.notitie || '', datum: s.datum || '',
            items: (s.items || []).map(function(id) { var p = presets[id]; return p ? { id: id, artist: p.artist, song: p.song } : { id: id, ontbreekt: true }; }) };
        }) };
      } },
    { name: 'get_rig', title: 'Rig bekijken', alleenLezen: true,
      description: "Read Harm's rig: basses (strings, tuning, pickups, electronics), output, playing style and wishes.",
      inputSchema: { type: 'object', properties: {} },
      run: async function() { return { rig: await rig.laad() }; } },
    { name: 'save_setlist', title: 'Setlist opslaan', alleenLezen: false,
      description: 'Create a setlist, or change an existing one (give its id): name, note and the presets in order. Only presets that exist can go in. Nothing is deleted.',
      inputSchema: { type: 'object', properties: {
        id: { type: 'string', description: 'existing setlist id to change; leave out for a new one' },
        name: { type: 'string' }, note: { type: 'string' },
        presetIds: { type: 'array', items: { type: 'string' }, maxItems: 100 }
      }, required: ['name', 'presetIds'] },
      run: async function(a) {
        var presets = await hash(PRESETS);
        var ids = (Array.isArray(a.presetIds) ? a.presetIds : []).map(function(x) { return tekst(x, 64); }).filter(geldigId);
        var onbekend = ids.filter(function(id) { return !presets[id]; });
        if (onbekend.length) throw new mcp.McpFout('Deze presets bestaan niet: ' + onbekend.join(', ') + '. Zoek ze op met list_presets.');
        if (!ids.length) throw new mcp.McpFout('Een setlist heeft minstens één preset nodig.');
        var oud = null;
        if (a.id) {
          if (!geldigId(tekst(a.id, 64))) throw new mcp.McpFout('Geen geldig setlist-id.');
          oud = redis.parseJson(await redis.cmd(['HGET', SETLISTS, tekst(a.id, 64)]));
          if (!oud) throw new mcp.McpFout('Die setlist bestaat niet; laat id weg voor een nieuwe.');
        }
        var sl = {
          id: oud ? oud.id : nieuwId(),
          naam: tekst(a.name, 80) || (oud && oud.naam) || 'Setlist',
          notitie: a.note != null ? tekst(a.note, 1000) : (oud ? oud.notitie || '' : ''),
          items: ids.slice(0, 100),
          datum: oud ? oud.datum || vandaag() : vandaag()
        };
        await redis.cmd(['HSET', SETLISTS, sl.id, JSON.stringify(sl)]);
        return { gedaan: true, nieuw: !oud, id: sl.id, naam: sl.naam,
          items: sl.items.map(function(id) { return presets[id].artist + ' – ' + presets[id].song; }) };
      } }
  ];
}

module.exports = { maak: maak };
