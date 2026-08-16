import { describe, expect, it } from 'vitest';
import { type Airport, AirportLayoverDetector, stayHours } from './airports.js';
import type { Stay } from './types.js';

// Heathrow, roughly.
const AIRPORTS: Airport[] = [{ lat: 51.47, lng: -0.4543 }];

const detector = new AirportLayoverDetector(AIRPORTS, { airportRadiusKm: 3, layoverMaxHours: 4 });

const stay = (lat: number, lng: number, hours: number): Stay => ({
	lat,
	lng,
	start: '2026-01-01T08:00:00Z',
	end: new Date(Date.parse('2026-01-01T08:00:00Z') + hours * 3600_000).toISOString(),
});

describe('stayHours', () => {
	it('measures duration in hours', () => {
		expect(stayHours(stay(0, 0, 2.5))).toBeCloseTo(2.5);
	});
});

describe('AirportLayoverDetector', () => {
	it('flags a short stop at the airport', () => {
		expect(detector.isLayover(stay(51.47, -0.4543, 2))).toBe(true);
	});

	it('does NOT flag a long stay at the airport (e.g. a hotel next to it)', () => {
		expect(detector.isLayover(stay(51.47, -0.4543, 30))).toBe(false);
	});

	it('does NOT flag a short stop away from any airport', () => {
		// Central London — short, but nowhere near the airport.
		expect(detector.isLayover(stay(51.5074, -0.1278, 2))).toBe(false);
	});
});
