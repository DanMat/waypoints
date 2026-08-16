import { describe, expect, it } from 'vitest';
import { haversineKm } from './haversine.js';

describe('haversineKm', () => {
	it('is zero for the same point', () => {
		expect(haversineKm({ lat: 51.5, lng: -0.12 }, { lat: 51.5, lng: -0.12 })).toBe(0);
	});

	it('matches a known distance (London ↔ Paris ≈ 344 km)', () => {
		const km = haversineKm({ lat: 51.5074, lng: -0.1278 }, { lat: 48.8566, lng: 2.3522 });
		expect(km).toBeGreaterThan(330);
		expect(km).toBeLessThan(360);
	});

	it('handles antipodal-ish spans without NaN', () => {
		const km = haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 180 });
		expect(Number.isFinite(km)).toBe(true);
		expect(km).toBeGreaterThan(20000);
	});
});
