import type { Health } from '@danmat/waypoints-core';
import { Hono } from 'hono';

/** Minimal structural types for the Cloudflare bindings we use (no extra dep). */
interface R2ObjectBody {
	body: ReadableStream;
}
export interface Bindings {
	/** R2 bucket holding the aggregated places.json / stats.json. */
	DATA: { get(key: string): Promise<R2ObjectBody | null> };
	/** Static-assets binding serving the built web app. */
	ASSETS: { fetch(request: Request): Promise<Response> };
}

export const app = new Hono<{ Bindings: Bindings }>();

app.get('/api/health', (c) => {
	const body: Health = { ok: true, service: 'waypoints', uptime: 0 };
	return c.json(body);
});

/** Stream a JSON object straight from R2, with edge + browser caching. */
async function serveJson(bucket: Bindings['DATA'], key: string): Promise<Response> {
	const object = await bucket.get(key);
	if (!object) {
		return new Response(JSON.stringify({ error: 'not generated yet' }), {
			status: 404,
			headers: { 'content-type': 'application/json; charset=utf-8' },
		});
	}
	return new Response(object.body, {
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'cache-control': 'public, max-age=300, s-maxage=300',
		},
	});
}

app.get('/api/places', (c) => serveJson(c.env.DATA, 'places.json'));
app.get('/api/stats', (c) => serveJson(c.env.DATA, 'stats.json'));

// Everything else is the web app (served by the static-assets binding).
app.get('*', (c) => c.env.ASSETS.fetch(c.req.raw));
