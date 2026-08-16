import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import type { Health } from '@waypoints/shared';

export const app = new Hono();

app.get('/api/health', (c) => {
	const body: Health = { ok: true, service: 'waypoints', uptime: process.uptime() };
	return c.json(body);
});

// In production the API also serves the built web app, so one process and
// one port covers the whole thing. In dev, Vite serves the app and proxies
// /api here instead (see apps/web/vite.config.ts).
if (process.env.NODE_ENV === 'production') {
	app.use('/*', serveStatic({ root: '../web/dist' }));
}
