import { describe, expect, it } from 'vitest';
import { type City, NearestCityGeocoder } from './geocode.js';

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

describe('NearestCityGeocoder', () => {
	const geo = new NearestCityGeocoder(CITIES);

	it('snaps a nearby point to the city centroid, not the query point', () => {
		const result = geo.lookup({ lat: 51.52, lng: -0.1 });
		expect(result?.city).toBe('London');
		// Returned coordinate is London's centroid, not the queried 51.52/-0.1.
		expect(result?.lat).toBe(51.5074);
		expect(result?.lng).toBe(-0.1278);
	});

	it('picks the genuinely nearest city', () => {
		expect(geo.lookup({ lat: 48.9, lng: 2.3 })?.city).toBe('Paris');
		expect(geo.lookup({ lat: 35.7, lng: 139.7 })?.city).toBe('Tokyo');
	});

	it('returns null when nothing is within range', () => {
		// Middle of the Pacific — nearest listed city is thousands of km away.
		expect(geo.lookup({ lat: -30, lng: -140 })).toBeNull();
	});

	it('prefers the larger metro over an adjacent district', () => {
		const withDistrict: City[] = [
			{
				name: 'Eifuku',
				country: 'Japan',
				countryCode: 'JP',
				lat: 35.6755,
				lng: 139.6399,
				population: 20000,
			},
			{
				name: 'Tokyo',
				country: 'Japan',
				countryCode: 'JP',
				lat: 35.6762,
				lng: 139.6503,
				population: 8000000,
			},
		];
		const g = new NearestCityGeocoder(withDistrict);
		// Query sits nearest to Eifuku, but Tokyo is within the metro radius.
		expect(g.lookup({ lat: 35.6756, lng: 139.6402 })?.city).toBe('Tokyo');
	});
});
