// Zet een oude preset in tekstformaat (## TONE ANALYSE, ### BLOK, - Param: waarde)
// om naar het JSON-formaat van de nieuwe analyse.
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Legacy = factory();
})(typeof self !== 'undefined' ? self : this, function() {

  function ketenLijst(regel) {
    return regel.replace(/→/g, '>').replace(/->/g, '>').split('>').map(function(x) { return x.trim(); }).filter(Boolean);
  }

  function naarScene(tekst, basId) {
    var scene = {
      bas_id: basId || 'spector', b_snaar_vereist: false, stemming: '', toneanalyse: '', routing: 'serieel',
      chain_a: [], chain_b: [], merge_naar: [], blokken: [], tips: [], legacy: true
    };
    var sectie = '', blok = null, analyse = [];
    String(tekst || '').split('\n').forEach(function(ruw) {
      var r = ruw.trim();
      if (!r) return;
      var laag = r.toLowerCase();
      if (laag.indexOf('b_snaar_vereist:') === 0) { scene.b_snaar_vereist = /ja|yes/.test(laag); return; }
      if (/^(ARTIEST|SONG):/.test(r) || /^==SCENE_/i.test(r)) return;
      if (r.indexOf('## ') === 0) { sectie = r.slice(3).trim().toUpperCase(); blok = null; return; }

      if (sectie === 'SIGNAALCHAIN' || sectie === 'SIGNAL CHAIN') {
        if (r === 'PARALLEL') scene.routing = 'parallel';
        else if (r.indexOf('CHAIN_A:') === 0 || r.indexOf('CHAIN:') === 0) scene.chain_a = ketenLijst(r.replace(/^CHAIN(_A)?:/, ''));
        else if (r.indexOf('CHAIN_B:') === 0) scene.chain_b = ketenLijst(r.replace('CHAIN_B:', ''));
        else if (r.indexOf('MERGE_NAAR:') === 0) scene.merge_naar = ketenLijst(r.replace('MERGE_NAAR:', ''));
        else if (!scene.chain_a.length && (r.indexOf('>') !== -1 || r.indexOf('→') !== -1)) scene.chain_a = ketenLijst(r);
        return;
      }
      if (sectie === 'BLOKKEN' || sectie === 'BLOCKS') {
        if (r.indexOf('### ') === 0) {
          var kop = r.slice(4).trim();
          var m = kop.match(/^(.*?)\s*\((.*)\)\s*$/);
          blok = { label: (m ? m[1] : kop).trim(), blok: (m ? m[1] : kop).trim(), origineel: m ? m[2].trim() : '', instellingen: [], uitleg: '' };
          scene.blokken.push(blok);
          return;
        }
        if (!blok) return;
        if (r.indexOf('- ') === 0) {
          var i = r.indexOf(':');
          if (i !== -1) blok.instellingen.push({ parameter: r.slice(2, i).trim(), waarde: r.slice(i + 1).trim() });
        } else if (/^(UITLEG|EXPLANATION):/.test(r)) {
          blok.uitleg = r.replace(/^(UITLEG|EXPLANATION):/, '').trim();
        }
        return;
      }
      if (sectie.indexOf('FINE-TUNE') === 0) { scene.tips.push(r.replace(/^\d+[.)]\s*/, '').replace(/^[-*]\s*/, '')); return; }
      if (sectie.indexOf('TONE') === 0) analyse.push(r);
    });
    scene.toneanalyse = analyse.join('\n');
    if (scene.routing === 'parallel' && !scene.chain_b.length) scene.routing = 'serieel';
    return scene;
  }

  // Oude opgeslagen preset (content / sceneSpector / scenes[].content) → scenes.
  function scenesUitPreset(p) {
    if (Array.isArray(p.scenes) && p.scenes.length) {
      return p.scenes.map(function(s) {
        if (s && Array.isArray(s.blokken)) return s;
        return naarScene(s.content, s.basId);
      });
    }
    if (p.isDual && p.sceneSpector && p.scenePbass) return [naarScene(p.sceneSpector, 'spector'), naarScene(p.scenePbass, 'pbass')];
    var basId = /precision|p-bass/i.test(p.bass || '') ? 'pbass' : 'spector';
    return [naarScene(p.content || '', basId)];
  }

  return { naarScene: naarScene, scenesUitPreset: scenesUitPreset };
});
