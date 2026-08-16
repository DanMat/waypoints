# Waypoints

A privacy-first travel log built from my own Google Timeline location history. A
world map, fun stat tiles (continents / countries / cities / regions / nights),
and a most-visited table — all from raw location data, **aggregated to city
level so exact coordinates are never published**. Airport layovers don't count.

## How it works

Two data planes with a privacy boundary between them:

```
Phone (Timeline export)
   │  manual, ~quarterly
   ▼
Private R2  (raw/, auto-deletes)  ──►  GitHub Action  ──►  Public R2 (aggregates)
                                       aggregate pipeline        │
                                       · cluster stays           ▼
                                       · reverse-geocode      Cloudflare Worker  ──►  Web page
                                         (offline)            /api/places,/stats      map + stats
                                       · drop layovers
                                       · scrub (home, dates)
                                       · compute stats
```

Raw location data stays in a private, ephemeral store and **never touches git**.
Only sanitized, city-level aggregates (`places.json`, `stats.json`) are
published. Reverse-geocoding runs offline, so exact coordinates are never sent to
any third party.

## Layout

```
apps/web           React + Vite front end (world map, stat tiles, table)
apps/server        Cloudflare Worker: /api/* from R2 + serves the web build
packages/pipeline  aggregation core + `waypoints` CLI + dataset prep
packages/shared    the published contract (Place, Stats, TravelData)
```

## Develop

```sh
pnpm install
pnpm dev        # web on :5173 (proxies /api → wrangler on :8787)
```

## Generate the data (locally)

Your raw export never leaves your machine.

```sh
pnpm prep:data                                   # download offline datasets (GeoNames + OurAirports)
pnpm aggregate -- ~/Downloads/timeline.json \
  --out apps/web/public --home "51.5,-0.12"      # → places.json + stats.json
```

Flags: `--home "lat,lng"` (dropped from output), `--home-radius`, `--min-stay`,
`--layover-max`, `--airport-radius`.

## Deploy (Cloudflare)

One-time setup, using your existing Cloudflare account:

```sh
npx wrangler r2 bucket create waypoints-data          # aggregates (Worker reads)
npx wrangler r2 bucket create waypoints-raw           # raw exports (private)
# recommended: a lifecycle rule to auto-delete raw/ after ~7 days
```

Then, to ship:

```sh
pnpm deploy     # builds the web app, then `wrangler deploy` the Worker
```

## Quarterly refresh

`.github/workflows/aggregate.yml` runs on the 1st of each quarter (and on
demand). It reads the raw export from the private R2 bucket, runs the pipeline,
and writes the aggregates to the public bucket. Set these repo secrets:

| Secret | Purpose |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | R2 read/write |
| `CLOUDFLARE_ACCOUNT_ID` | account id |
| `HOME_LATLNG` | optional, e.g. `51.5,-0.12` — dropped from output |

Upload a fresh export any time with:

```sh
npx wrangler r2 object put waypoints-raw/timeline.json --file ~/Downloads/timeline.json --remote
```

## License

MIT © DanMat
