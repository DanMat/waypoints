# private/

Drop your **Google Timeline export** (`location-history.json`, or any `*.json`)
into this folder, then run:

```sh
pnpm update:data
```

That aggregates the newest `.json` here and publishes your refreshed travel
data. Everything in this folder (except this README and `.gitkeep`) is
**gitignored** — your raw location data never gets committed.
