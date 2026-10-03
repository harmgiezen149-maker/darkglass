# Darkglass Anagram Tone Architect

AI-powered tool die op basis van artiest + song een preset-plan genereert voor de Darkglass Anagram.

## Structuur

```
/
├── index.html          Hoofdpagina (app)
├── blocks.html         Blok editor (parameters beheren)
├── stats.html          Gebruiksstatistieken (wachtwoord)
├── script.js           App logica
├── style.css           Styling
├── manifest.json       PWA manifest
├── service-worker.js   PWA service worker (offline + caching)
├── icon-192.png        PWA icoon
├── icon-512.png        PWA icoon
├── vercel.json         Vercel config
├── package.json
└── api/
    ├── chat.js         Anthropic streaming endpoint
    ├── presets.js      Preset opslag (Upstash Redis)
    ├── blocks.js       Blok definities (Upstash Redis)
    ├── status.js       Anthropic API status check
    └── stats.js        Gebruiksstatistieken (Upstash Redis)
```

## Environment Variables (Vercel)

| Naam | Omschrijving |
|------|--------------|
| `ANTHROPIC_API_KEY` | Anthropic API-sleutel |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `ADMIN_WACHTWOORD` | Wachtwoord voor beheer: blokken, rig, presets verwijderen, stats. Valt terug op `STATS_WACHTWOORD`. Zonder een van beide is beheer uitgeschakeld. |
| `APP_WACHTWOORD` | *(optioneel)* Als gezet moet je inloggen om de app te gebruiken. Aanrader als de URL publiek is. |
| `SESSION_SECRET` | *(optioneel)* Extra geheim voor de sessie-cookies. |
| `LIMIET_ANALYSES_PER_UUR` | *(optioneel)* Analyses per IP per uur, standaard 20. |
| `LIMIET_CHAT_PER_UUR` | *(optioneel)* Chat/vertaal-verzoeken per IP per uur, standaard 60. |
| `LIMIET_CLAUDE_PER_DAG` | *(optioneel)* Maximaal aantal Claude-aanroepen per dag voor de hele app, standaard 300. |
| `CLAUDE_MODEL` | *(optioneel)* Ander model dan `claude-opus-5-5`. |
| `CLAUDE_GEEN_FALLBACK` | *(optioneel)* `1` schakelt de server-side fallback uit (bij een weigering door de veiligheidsfilters probeert de API anders zelf een passend model). |

## Lokaal draaien

```bash
npm install
npm run dev        # http://localhost:3000, geheugen-Redis en nep-Claude zonder API-sleutel
npm test           # unit-tests
npm run test:ui    # UI-rooktest met Playwright (vereist Playwright)
```

## Deploy via Git Bash

```bash
# Eerste keer: repo klonen
git clone https://github.com/<gebruiker>/<repo>.git
cd <repo>

# Bestanden uit deze zip in de repo-map plaatsen, daarna:
git add .
git commit -m "Update app"
git push

# Vercel deployt automatisch bij elke push naar main
```

## Features

- AI tone-analyse met visuele preset (knobs, toggles, signaalchain)
- Dual-scene mode (Spector + P-Bass tegelijk)
- Fine-tune chat met live streaming
- Cloud preset-opslag (Upstash Redis)
- Blok editor met samenvouwbare secties
- NL/EN vertaling
- PWA (installeerbaar op startscherm)
- Gebruiksstatistieken + Vercel Analytics
