import { haversineKm } from './haversine.js';
import type { LatLng } from './types.js';

/** One entry in the offline gazetteer (e.g. a GeoNames cities15000 row). */
export interface City {
	name: string;
	/** Admin-1 (state / province / region), when known. */
	region?: string;
	country: string;
	/** ISO 3166-1 alpha-2. */
	countryCode: string;
	lat: number;
	lng: number;
}

/** A resolved location: a city centroid, never the querying coordinate. */
export interface GeoResult {
	city: string;
	region?: string;
	country: string;
	countryCode: string;
	/** City centroid (coarse) — safe to publish. */
	lat: number;
	lng: number;
}

export interface ReverseGeocoder {
	/** Nearest known city to a point, or `null` if nothing is close enough. */
	lookup(point: LatLng): GeoResult | null;
}

/**
 * Offline reverse-geocoder: nearest city by great-circle distance. A linear
 * scan is fine here — there are thousands of cities but only a handful of
 * stays, and it keeps the data dependency to a plain array. The returned
 * coordinate is the *city's* centroid, so exact coordinates never leave the
 * pipeline.
 */
export class NearestCityGeocoder implements ReverseGeocoder {
	private readonly cities: readonly City[];
	private readonly maxDistanceKm: number;

	constructor(cities: readonly City[], options: { maxDistanceKm?: number } = {}) {
		this.cities = cities;
		this.maxDistanceKm = options.maxDistanceKm ?? 250;
	}

	lookup(point: LatLng): GeoResult | null {
		let best: City | null = null;
		let bestKm = Number.POSITIVE_INFINITY;

		for (const city of this.cities) {
			const km = haversineKm(point, city);
			if (km < bestKm) {
				bestKm = km;
				best = city;
			}
		}

		if (!best || bestKm > this.maxDistanceKm) {
			return null;
		}

		return {
			city: best.name,
			region: best.region,
			country: best.country,
			countryCode: best.countryCode,
			lat: best.lat,
			lng: best.lng,
		};
	}
}
