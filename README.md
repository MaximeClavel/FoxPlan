# FoxPlan

Map-first, local-first travel planning dashboard. Plan trips on a single Google map:
search places, compare multi-stop routes across transport modes, and centralize
accommodation options next to restaurants, activities and airports.

The full architecture is documented in [docs/TECHNICAL_DESIGN.md](docs/TECHNICAL_DESIGN.md).

## Features (MVP)

- **Dark-first dashboard** — responsive desktop layout with a sidebar, central map and context panel.
- **Multiple trips** — created and stored locally; switch, duplicate or delete at any time.
- **Google map + places** — search cities, restaurants, activities, attractions, airports and stays.
- **Saved places & filters** — save places per trip, add notes, and filter the map by category.
- **Proximity** — straight-line distance (instant) and on-demand driving route between a stay and saved places.
- **Multi-stop itinerary** — ordered stops with reordering and a duration/distance comparison across
  driving, transit, cycling, walking and two-wheeler (where supported).
- **Accommodation** — open Airbnb, Booking and KAYAK searches with your criteria, and save options
  with a map location for comparison.
- **Local data** — everything is kept in the browser (IndexedDB) with JSON export/import.
- **Internationalization** — French (default) and English, EUR by default.

## Tech stack

React 18 · TypeScript · Vite · IndexedDB (`idb`) · Zod · Google Maps JavaScript API
(`@googlemaps/js-api-loader`) · Vitest.

## Prerequisites

- Node.js 18+ and npm.
- A Google Maps browser API key with the **Maps JavaScript API**, **Places API** and
  **Routes** enabled. Restrict the key by HTTP referrer and enable billing budgets/alerts in
  Google Cloud. Google Maps usage may incur charges.

## Getting started

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, then go to **Settings → Google Maps** and paste your API key.
The key is stored only in this browser, is never exported, and can be replaced or removed at any time.

### Optional fallback key

For managed deployments you may set a build-time fallback instead of the runtime Settings key:

```bash
cp .env.example .env.local
# then set VITE_GOOGLE_MAPS_API_KEY in .env.local
```

Never commit a real key. A runtime key entered in Settings always takes precedence.

## Scripts

| Script            | Description                         |
| ----------------- | ----------------------------------- |
| `npm run dev`     | Start the Vite dev server           |
| `npm run build`   | Type-check and build for production |
| `npm run preview` | Preview the production build        |
| `npm run test`    | Run the unit tests (Vitest)         |
| `npm run lint`    | Run ESLint                          |

## Deployment (GitHub Pages)

FoxPlan is a fully static SPA (no backend, data stored per browser), so it runs on GitHub Pages.

1. Push the project to a GitHub repository.
2. In the repository, open **Settings → Pages → Build and deployment** and set the source to
   **GitHub Actions**.
3. Push to `main`. The included workflow ([.github/workflows/deploy.yml](.github/workflows/deploy.yml))
   builds the app and publishes `dist/` automatically.

The build uses a relative base path (`base: './'`), so it works at
`https://<user>.github.io/<repo>/` without extra configuration.

> **Important:** add your Pages URL to the Google Maps key's allowed HTTP referrers, e.g.
> `https://<user>.github.io/*`. The app ships without a key — each visitor enters their own in
> **Settings → Google Maps**.

## Data & privacy

All planning data is stored in your browser via IndexedDB. Clearing browser data, using another
browser, or switching device can remove it unless you export first (**Data → Export**). Exports
never include your API key or any live third-party API responses.

## Accommodation providers

FoxPlan opens Airbnb, Booking and KAYAK searches in a new tab with your encoded criteria and lets
you save options manually. It does **not** scrape, embed, or display live provider prices or
availability — that would require each provider's authorised partner/affiliate API and a backend,
which is out of scope for this browser-only MVP.

## Attribution

Maps, places and routing data are provided by Google Maps Platform and are subject to its terms,
branding and attribution requirements.

## License

MIT — see [LICENSE](LICENSE).