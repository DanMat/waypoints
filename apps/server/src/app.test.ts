import { describe, expect, it } from 'vitest';
import { app, type Bindings } from './app.js';

/** A fake R2 bucket backed by an in-memory map. */
function mockEnv(objects: Record<string, string>): Bindings {
	return {
		DATA: {
			async get(key) {
				if (!(key in objects)) return null;
				return { body: new Response(objects[key]).body as ReadableStream };
			},
		},
		ASSETS: { fetch: async () => new Response('index', { status: 200 }) },
	};
}

describe('worker', () => {
	it('reports health', async () => {
		const res = await app.request('/api/health', {}, mockEnv({}));
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ ok: true, service: 'waypoints' });
	});

	it('serves places.json from R2 with cache headers', async () => {
		const res = await app.request(
			'/api/places',
			{},
			mockEnv({ 'places.json': '[{"city":"Paris"}]' }),
		);
		expect(res.status).toBe(200);
		expect(res.headers.get('cache-control')).toContain('s-maxage');
		expect(await res.json()).toEqual([{ city: 'Paris' }]);
	});

	it('404s when the aggregate has not been generated', async () => {
		const res = await app.request('/api/stats', {}, mockEnv({}));
		expect(res.status).toBe(404);
	});

	it('falls back to static assets for non-API routes', async () => {
		const res = await app.request('/', {}, mockEnv({}));
		expect(await res.text()).toBe('index');
	});
});
