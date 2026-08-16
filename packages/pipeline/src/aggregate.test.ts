import { describe, expect, it } from 'vitest';
import { type AggregateDeps, aggregate, aggregateTimeline } from './aggregate.js';
import { type Airport, AirportLayoverDetector } from './airports.js';
import { type City, NearestCityGeocoder } from './geocode.js';
import type { Stay } from './types.js';

const CITIES: City[] = [
	{
		name: 'London',
		region: 'England',
		country: 'United Kingdom',
		countryCode: 'GB',
		lat: 51.5074,
		lng: -0.1278,
	},
	{
		name: 'Paris',
		region: 'Île-de-France',
		country: 'France',
		countryCode: 'FR',
		lat: 48.8566,
		lng: 2.3522,
	},
	{
		name: 'Tokyo',
		region: 'Tokyo',
		country: 'Japan',
		countryCode: 'JP',
		lat: 35.6762,
		lng: 139.6503,
	},
];
const HEATHROW: Airport = { lat: 51.47, lng: -0.4543 };

const deps: AggregateDeps = {
	geocoder: new NearestCityGeocoder(CITIES),
	layoverDetector: new AirportLayoverDetector([HEATHROW], {
		airportRadiusKm: 3,
		layoverMaxHours: 4,
	}),
	now: new Date('2026-08-16T00:00:00Z'),
};

const stay = (lat: number, lng: number, start: string, hours: number): Stay => ({
	lat,
	lng,
	start,
	end: new Date(Date.parse(start) + hours * 3600_000).toISOString(),
});

describe('aggregate', () => {
	const stays: Stay[] = [
		// Home (Tokyo) — dropped, never appears.
		stay(35.6762, 139.6503, '2026-01-01T20:00:00Z', 8),
		stay(35.6762, 139.6503, '2026-01-05T20:00:00Z', 8),
		// London — two real visits.
		stay(51.5074, -0.1278, '2026-03-01T10:00:00Z', 5),
		stay(51.5074, -0.1278, '2026-06-10T10:00:00Z', 5),
		// Heathrow layover — short + at airport → dropped (would otherwise snap to London).
		stay(51.47, -0.4543, '2026-06-11T06:00:00Z', 2),
		// Paris — one real multi-day visit …
		stay(48.8566, 2.3522, '2026-04-01T09:00:00Z', 48),
		// … plus a 10-minute blip → dropped by min-stay.
		stay(48.8566, 2.3522, '2026-04-15T09:00:00Z', 10 / 60),
	];

	const { places, stats } = aggregate(stays, deps, { home: { lat: 35.6762, lng: 139.6503 } });

	it('drops home, layovers, and sub-threshold blips', () => {
		expect(places.map((p) => p.city)).toEqual(['London', 'Paris']);
		expect(places.find((p) => p.city === 'Tokyo')).toBeUndefined();
	});

	it('counts visits per city, ignoring the Heathrow layover', () => {
		expect(places.find((p) => p.city === 'London')?.visits).toBe(2);
		expect(places.find((p) => p.city === 'Paris')?.visits).toBe(1);
	});

	it('publishes city centroids and month-precision dates, not raw data', () => {
		const london = places.find((p) => p.city === 'London');
		expect(london).toMatchObject({
			lat: 51.5074,
			lng: -0.1278,
			firstVisit: '2026-03',
			lastVisit: '2026-06',
		});
		const paris = places.find((p) => p.city === 'Paris');
		expect(paris?.nights).toBe(2);
	});

	it('rolls up headline stats', () => {
		expect(stats.totals).toMatchObject({
			continents: 1,
			countries: 2,
			regions: 2,
			usStates: 0,
			cities: 2,
			nights: 2,
		});
		// London → Paris great-circle ≈ 344 km.
		expect(stats.totals.distanceKm).toBeGreaterThan(330);
		expect(stats.totals.distanceKm).toBeLessThan(360);
		expect(stats.continents).toEqual(['Europe']);
		expect(stats.countries).toEqual(['FR', 'GB']);
		expect(stats.usStates).toEqual([]);
		expect(stats.generatedAt).toBe('2026-08');
	});

	it('sorts places by visit count', () => {
		expect(places[0].city).toBe('London');
	});

	it('scrubs home/work by Google label and drops anything within the home radius', () => {
		const labelled: Stay[] = [
			// A "Home" visit at London coords → dropped, and defines the home point.
			{ ...stay(51.5074, -0.1278, '2026-01-01T00:00:00Z', 10), label: 'Home' },
			// An unlabelled London visit ~2 km away → dropped by the home radius.
			stay(51.51, -0.1, '2026-02-01T00:00:00Z', 5),
			// A "Work" visit elsewhere → dropped by label.
			{ ...stay(35.6762, 139.6503, '2026-02-15T00:00:00Z', 8), label: 'Work' },
			// Paris → kept.
			stay(48.8566, 2.3522, '2026-03-01T00:00:00Z', 48),
		];
		const { places: p } = aggregate(labelled, deps, {});
		expect(p.map((x) => x.city)).toEqual(['Paris']);
	});
});

describe('aggregateTimeline', () => {
	it('parses a raw export and aggregates it', () => {
		const json = {
			semanticSegments: [
				{
					startTime: '2026-02-01T10:00:00Z',
					endTime: '2026-02-01T15:00:00Z',
					visit: { topCandidate: { placeLocation: { latLng: 'geo:48.8566,2.3522' } } },
				},
			],
		};
		const { places } = aggregateTimeline(json, deps, {});
		expect(places).toHaveLength(1);
		expect(places[0].city).toBe('Paris');
	});
});
