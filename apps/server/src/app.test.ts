import { describe, expect, it } from 'vitest';
import { app } from './app.js';

describe('api', () => {
	it('reports health', async () => {
		const res = await app.request('/api/health');
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ ok: true });
	});
});
