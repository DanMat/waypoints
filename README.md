# waypoints

Privacy-first travel log built from Google Timeline data

## Layout

```
apps/web       React + Vite front end
apps/server    Hono API (also serves the web build in production)
packages/shared  types and helpers both sides import
```

## Develop

```sh
pnpm install
pnpm dev     # web on :5173, api on :3000
```

Vite proxies `/api` to the server, so requests are same-origin in development exactly as they are in production — no CORS, no environment-specific base URL.

## Production

```sh
pnpm build
pnpm start   # one process serving the API and the built web app
```

`@waypoints/shared` is built before either app starts, so a change to a shared type surfaces as a type error on both sides rather than at runtime.

## License

MIT © DanMat
