import { describe, expect, it } from 'vitest';
import { describeHealth } from './index.js';

describe('example', () => {
	it('works', () => {
		expect(describeHealth({ ok: true, service: 'api', uptime: 12 })).toBe('api is up (12s)');
	});
});
