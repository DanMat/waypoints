# Waypoints

A privacy-first travel log built from my own Google Timeline location history — a
world map, stat tiles (continents / countries / US states / cities / regions /
nights), an "× around the world" fun stat, and a sortable most-visited table. All
**aggregated to city level so exact coordinates are never published**; home & work
are scrubbed automatically and airport layovers don't count.

Live: **[waypoints.danmat.workers.dev](https://waypoints.danmat.workers.dev)** ·
Make your own: **[droppinmap.com](https://droppinmap.com)**

## 🔄 Refresh my data (the whole workflow)

Whenever I travel again — or any time I want to update the map:

1. **Export** on the phone: Google Maps → profile → **Your Timeline → ⋯ → Export Timeline data** → get a `location-history.json`.
2. **Drop** that file into [`private/`](private/) (gitignored — it never gets committed).
3. **Run one command:**
   ```sh
   pnpm update:data
   ```

That aggregates the newest export in `private/` (home/work scrubbed, layovers
dropped, `overrides.json` applied), uploads the sanitized `places.json` +
`stats.json` to R2, and stashes the raw export in the private bucket. The live
site updates within ~5 minutes. **Nothing sensitive is committed or uploaded
anywhere but my own R2.**

First time on a new machine: `pnpm install`, then `npx wrangler login` once (so
the upload is authenticated). The very first `update:data` also downloads the
offline gazetteer (~1 min); after that it's cached.

### Manual corrections — `overrides.json`

Timeline can't tell a pass-through stop from a real visit, or catch states I only
drove through. [`overrides.json`](overrides.json) fixes the US-states stat:

- `excludeStates` — pass-through stops that aren't real visits (e.g. a layover city)
- `includeStates` — states I drove through with no recorded stop

Edit it, then re-run `pnpm update:data`.

## How it works

```
Phone (Timeline export)  →  private/  →  pnpm update:data
   → aggregate (offline geocode · drop home/work · drop layovers · stats)
   → R2: places.json + stats.json   (raw export → private bucket)
   → Cloudflare Worker /api/*  →  the web page (map + stats)
```

Raw location data stays on my machine + a private, ephemeral R2 bucket and
**never touches git**. Only sanitized, city-level aggregates are published, and
reverse-geocoding runs offline so coordinates are never sent to a third party.

The aggregation engine and UI are the reusable packages
[`@danmat/waypoints-core`](https://www.npmjs.com/package/@danmat/waypoints-core)
and [`@danmat/waypoints-ui`](https://www.npmjs.com/package/@danmat/waypoints-ui)
(from [waypoints-kit](https://github.com/DanMat/waypoints-kit)).

## Layout

```
apps/web       React + Vite front end — consumes @danmat/waypoints-ui
apps/server    Cloudflare Worker: /api/* from R2 + serves the web build
packages/cli   private: offline dataset prep + the aggregate CLI (uses @danmat/waypoints-core)
scripts/       update-data.mjs — the `pnpm update:data` refresh
```

## Develop

```sh
pnpm install
pnpm dev        # web on :5173 (proxies /api → `wrangler dev` on :8787)
```

## Deploy

```sh
pnpm deploy     # builds the web app, then `wrangler deploy` the Worker
```

One-time R2 setup: `npx wrangler r2 bucket create waypoints-data` and
`waypoints-raw` (a lifecycle rule to auto-delete `waypoints-raw` after ~7 days is
recommended).

## Hands-off quarterly refresh (optional)

[`.github/workflows/aggregate.yml`](.github/workflows/aggregate.yml) runs on the
1st of each quarter (and on demand) — it reads the raw export from the private
bucket and republishes the aggregates, so the site refreshes even if I forget.
Repo secrets: `CLOUDFLARE_API_TOKEN` (R2 read/write), `CLOUDFLARE_ACCOUNT_ID`,
and optional `HOME_LATLNG`.

## License

MIT © DanMat
