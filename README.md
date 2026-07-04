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
| `ANTHROPIC_API_KEY` | Anthropic API sleutel |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `STATS_WACHTWOORD` | Wachtwoord voor stats.html dashboard |

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
