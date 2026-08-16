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
	/** Population, used to prefer a metro over one of its districts. */
	population?: number;
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
 * Offline reverse-geocoder over a plain array of cities. A linear scan is fine
 * here — thousands of cities but only a handful of stays. The returned
 * coordinate is the *city's* centroid, so exact coordinates never leave the
 * pipeline.
 *
 * To avoid snapping to a district ("Eifuku") when the recognisable name is the
 * metro ("Tokyo"), any city within `preferLargerWithinKm` of the point is a
 * candidate and the highest-population one wins; otherwise the plain nearest
 * city is used, subject to `maxDistanceKm`.
 */
export class NearestCityGeocoder implements ReverseGeocoder {
	private readonly cities: readonly City[];
	private readonly maxDistanceKm: number;
	private readonly preferLargerWithinKm: number;

	constructor(
		cities: readonly City[],
		options: { maxDistanceKm?: number; preferLargerWithinKm?: number } = {},
	) {
		this.cities = cities;
		this.maxDistanceKm = options.maxDistanceKm ?? 250;
		this.preferLargerWithinKm = options.preferLargerWithinKm ?? 25;
	}

	lookup(point: LatLng): GeoResult | null {
		let nearest: City | null = null;
		let nearestKm = Number.POSITIVE_INFINITY;
		let largestNearby: City | null = null;
		let largestPop = -1;

		for (const city of this.cities) {
			const km = haversineKm(point, city);
			if (km < nearestKm) {
				nearestKm = km;
				nearest = city;
			}
			if (km <= this.preferLargerWithinKm) {
				const pop = city.population ?? 0;
				if (pop > largestPop) {
					largestPop = pop;
					largestNearby = city;
				}
			}
		}

		if (!nearest || nearestKm > this.maxDistanceKm) {
			return null;
		}

		const chosen = largestNearby ?? nearest;
		return {
			city: chosen.name,
			region: chosen.region,
			country: chosen.country,
			countryCode: chosen.countryCode,
			lat: chosen.lat,
			lng: chosen.lng,
		};
	}
}
