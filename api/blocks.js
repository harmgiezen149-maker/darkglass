module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var url = process.env.UPSTASH_REDIS_REST_URL;
  var token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return res.status(200).json({ blocks: getDefaultBlocks() });
  }

  async function redisGet(key) {
    var r = await fetch(url + '/get/' + encodeURIComponent(key), {
      headers: { Authorization: 'Bearer ' + token }
    });
    return r.json();
  }

  async function redisSet(key, value) {
    var r = await fetch(url + '/set/' + encodeURIComponent(key), {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(value)
    });
    return r.json();
  }

  async function redisDel(key) {
    var r = await fetch(url + '/del/' + encodeURIComponent(key), {
      headers: { Authorization: 'Bearer ' + token }
    });
    return r.json();
  }

  // GET — haal blokdefinities op
  if (req.method === 'GET') {
    // Reset naar opgeslagen standaard (of hardcoded als die er niet is)
    var reset = (req.query && req.query.reset) || (req.url && req.url.includes('reset=1'));
    if (reset) {
      try {
        // Probeer eerst de opgeslagen standaard
        var savedDefault = await redisGet('anagram:blocks:default');
        if (savedDefault.result) {
          var defBlocks = JSON.parse(savedDefault.result);
          if (typeof defBlocks === 'string') defBlocks = JSON.parse(defBlocks);
          if (Array.isArray(defBlocks) && defBlocks.length > 0) {
            await redisSet('anagram:blocks', JSON.stringify(defBlocks));
            return res.status(200).json({ blocks: defBlocks, source: 'custom-default' });
          }
        }
      } catch(e) {}
      // Fallback naar hardcoded standaard
      var defaults = getDefaultBlocks();
      try { await redisSet('anagram:blocks', JSON.stringify(defaults)); } catch(e) {}
      return res.status(200).json({ blocks: defaults, source: 'hardcoded' });
    }

    try {
      var result = await redisGet('anagram:blocks');
      if (result.result) {
        var blocks = JSON.parse(result.result);
        // Als de opgeslagen lijst leeg is, geef standaard terug
        if (!blocks || blocks.length === 0) {
          return res.status(200).json({ blocks: getDefaultBlocks() });
        }
        return res.status(200).json({ blocks: blocks });
      } else {
        return res.status(200).json({ blocks: getDefaultBlocks() });
      }
    } catch(e) {
      return res.status(200).json({ blocks: getDefaultBlocks() });
    }
  }

  // POST — sla blokdefinities op
  if (req.method === 'POST') {
    var body = req.body || {};
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch(e) { body = {}; } }
    if (!body.blocks) return res.status(400).json({ error: 'Geen blokken opgegeven' });
    var setDefault = body.setDefault === true;
    try {
      await redisSet('anagram:blocks', JSON.stringify(body.blocks));
      if (setDefault) {
        await redisSet('anagram:blocks:default', JSON.stringify(body.blocks));
      }
      return res.status(200).json({ ok: true, savedAsDefault: setDefault });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

function getDefaultBlocks() {
  return [
    {
      sectie: 'DRIVE',
      blokken: [
        { naam: 'Microtubes B3K', basis: 'Darkglass B3K pedaal', parameters: 'Drive (0-100%), Blend (0-100%), Level (0-100%), Tone (3kHz-8kHz), Grunt (Off/Fat/Raw), Mid Boost (On/Off)' },
        { naam: 'Vintage Microtubes', basis: 'Darkglass VMT pedaal', parameters: 'Drive (0-100%), Blend (0-100%), Level (0-100%), Tone (0-100%), Grunt (On/Off)' },
        { naam: 'Alpha Omicron', basis: 'Darkglass Alpha Omicron pedaal', parameters: 'Drive (0-100%), Blend (0-100%), Level (0-100%), Voice (Alpha/Omega)' },
        { naam: 'Duality Fuzz', basis: 'Darkglass Duality Fuzz pedaal', parameters: 'Fuzz (0-100%), Blend (0-100%), Level (0-100%), Voice (Silicon/Germanium)' },
        { naam: 'Chinchilla', basis: 'EHX Big Muff Pi-stijl', parameters: 'Gain (0-100%), Blend (0-100%), Level (0-100%), Tone (0-100%)' },
        { naam: 'Microtubes X', basis: 'Darkglass Microtubes X', parameters: 'Drive (0-100%), Blend (0-100%), Level (0-100%), Bass (0-100%), Treble (0-100%)' },
        { naam: 'Bee Kolme OD', basis: 'Boss ODB-3-stijl', parameters: 'Gain (0-100%), Level (0-100%), Blend (0-100%), EQ Low (0-100%), EQ High (0-100%)' },
        { naam: 'Arc Dreamer', basis: 'Tube Screamer-stijl', parameters: 'Drive (0-100%), Tone (0-100%), Level (0-100%)' }
      ]
    },
    {
      sectie: 'COMPRESSOR',
      blokken: [
        { naam: 'Ignissor', basis: 'Darkglass multiband compressor', parameters: 'Low Threshold (-60 tot 0 dB), Mid Threshold (-60 tot 0 dB), High Threshold (-60 tot 0 dB), Ratio (1:1-20:1), Attack (1-100 ms), Release (10-500 ms), Gain (0-24 dB)' },
        { naam: 'Luminal FET Compressor', basis: 'UA 1176-stijl', parameters: 'Input (0-10), Output (0-10), Attack (0-10), Release (0-10), Ratio (4:1/8:1/12:1/20:1/All), Blend (0-100%)' },
        { naam: 'BUS Compressor', basis: 'SSL G-Bus-stijl', parameters: 'Threshold (-30 tot 0 dB), Ratio (2:1/4:1/10:1), Attack (1/3/10/30/100 ms), Release (100/200/400 ms of Auto), Makeup Gain (0-24 dB)' },
        { naam: 'Compressor/Limiter', basis: 'Algemeen', parameters: 'Threshold (-60 tot 0 dB), Ratio (1:1-20:1 of Limiter), Attack (0.1-100 ms), Release (10-2000 ms), Makeup Gain (0-24 dB)' }
      ]
    },
    {
      sectie: 'PREAMP / AMP',
      blokken: [
        { naam: 'Harmonic Booster', basis: 'Darkglass Harmonic Booster', parameters: 'Gain (0-100%), Level (0-100%), Bass (-15 tot +15 dB), Treble (-15 tot +15 dB)' },
        { naam: 'Leo Bass', basis: 'Fender Bassman-stijl', parameters: 'Gain (0-100%), Bass (0-100%), Mid (0-100%), Treble (0-100%), Presence (0-100%), Master (0-100%)' },
        { naam: 'Jim Bass', basis: 'Ampeg SVT-stijl', parameters: 'Gain (0-100%), Bass (0-100%), Mid (0-100%), Treble (0-100%), Master (0-100%), Bright (On/Off)' },
        { naam: 'Gentle', basis: 'Aguilar Tone Hammer-stijl', parameters: 'Gain (0-100%), Bass (0-100%), Mid (0-100%), Mid Freq (40Hz-1kHz), Treble (0-100%), Master (0-100%)' },
        { naam: 'Peggy Bass', basis: 'Ampeg SVT-VR-stijl', parameters: 'Gain (0-100%), Bass (0-100%), Mid (0-100%), Treble (0-100%), Master (0-100%)' },
        { naam: 'SWIRL-900', basis: 'SWR SM-900-stijl', parameters: 'Gain (0-100%), Bass (0-100%), Lo-Mid (0-100%), Hi-Mid (0-100%), Treble (0-100%), Master (0-100%)' }
      ]
    },
    {
      sectie: 'CABINET / IR',
      blokken: [
        { naam: 'IR Loader', basis: 'Darkglass IR Loader', parameters: 'IR File (Darkglass Neo 4x10 / Modern Bass 4x10 / Peggy 8x10 / Jim Bass 8x10 / Vintage 4x10 / Vintage 2x15), Level (0-100%), Low Cut (20-500 Hz), High Cut (2kHz-20kHz)' }
      ]
    },
    {
      sectie: 'EQ / FILTER',
      blokken: [
        { naam: 'Parametric EQ', basis: 'Parametrische equalizer', parameters: 'Low Freq (20-500 Hz), Low Gain (-15/+15 dB), Low-Mid Freq (100Hz-2kHz), Low-Mid Gain (-15/+15 dB), Low-Mid Q (0.5-10), Mid Freq (200Hz-5kHz), Mid Gain (-15/+15 dB), Mid Q (0.5-10), High-Mid Freq (500Hz-10kHz), High-Mid Gain (-15/+15 dB), High-Mid Q (0.5-10), High Freq (1kHz-20kHz), High Gain (-15/+15 dB)' },
        { naam: 'Darkglass 6-Band EQ', basis: 'Grafische equalizer', parameters: '40Hz (+/-15 dB), 150Hz (+/-15 dB), 500Hz (+/-15 dB), 2kHz (+/-15 dB), 5kHz (+/-15 dB), 12kHz (+/-15 dB)' },
        { naam: 'Hi-Pass Filter', basis: 'Hoogdoorlaatfilter', parameters: 'Frequency (20-500 Hz), Slope (6/12/18/24 dB/oct)' },
        { naam: 'Lo-Pass Filter', basis: 'Laagdoorlaatfilter', parameters: 'Frequency (1kHz-20kHz), Slope (6/12/18/24 dB/oct)' },
        { naam: 'Noise Suppressor', basis: 'Boss NS-2-stijl', parameters: 'Threshold (0-100%), Decay (0-100%)' }
      ]
    },
    {
      sectie: 'MODULATIE',
      blokken: [
        { naam: 'Mint Chocolate Chorus', basis: 'Boss CE-2-stijl', parameters: 'Rate (0-100%), Depth (0-100%), Blend (0-100%)' },
        { naam: 'Flamingo Flanger', basis: 'Boss BF-2-stijl', parameters: 'Rate (0-100%), Depth (0-100%), Resonance (0-100%), Manual (0-100%)' },
        { naam: 'Pharos Phaser', basis: 'MXR Phase 90-stijl', parameters: 'Rate (0-100%), Depth (0-100%), Blend (0-100%)' },
        { naam: 'Tremora Tremolo', basis: 'Boss TR-2-stijl', parameters: 'Rate (0-100%), Depth (0-100%), Wave (Sine/Square)' }
      ]
    },
    {
      sectie: 'PITCH / OCTAVE',
      blokken: [
        { naam: 'Sublime Octaver mono', basis: 'Boss OC-2-stijl', parameters: 'Oct 1 Level (0-100%), Oct 2 Level (0-100%), Direct Level (0-100%)' },
        { naam: 'Subcitri Octaver poly', basis: 'EHX POG-stijl', parameters: 'Sub Oct Level (0-100%), Oct Up Level (0-100%), Dry Level (0-100%), Detune (cents)' }
      ]
    },
    {
      sectie: 'DELAY',
      blokken: [
        { naam: 'Digital Delay', basis: 'Boss DD-3-stijl', parameters: 'Time (1-2000 ms of BPM-sync), Feedback (0-100%), Blend (0-100%), Mode (Normal/Hold)' },
        { naam: 'Analog Delay', basis: 'Boss DM-2-stijl', parameters: 'Time (20-600 ms), Feedback (0-100%), Blend (0-100%)' }
      ]
    },
    {
      sectie: 'REVERB',
      blokken: [
        { naam: 'Room Reverb', basis: 'Kameralmslag', parameters: 'Decay (0.1-10 s), Pre-delay (0-100 ms), Blend (0-100%), Damping (0-100%)' },
        { naam: 'Plate Reverb', basis: 'Plaatalmslag', parameters: 'Decay (0.1-10 s), Pre-delay (0-100 ms), Blend (0-100%), Damping (0-100%)' },
        { naam: 'Hall Reverb', basis: 'Zaalalmslag', parameters: 'Decay (0.5-20 s), Pre-delay (0-100 ms), Blend (0-100%), Damping (0-100%)' }
      ]
    },
    {
      sectie: 'UTILITY',
      blokken: [
        { naam: 'Gain', basis: 'Signaalniveau', parameters: 'Level (0-200%), Pad (-20 tot 0 dB)' },
        { naam: 'Split', basis: 'Signaalverdeler', parameters: 'Balance (0-100%)' },
        { naam: 'Merge', basis: 'Signaalsamenvoeger', parameters: 'Blend (0-100%), Pan A (L-R), Pan B (L-R)' }
      ]
    }
  ];
}
