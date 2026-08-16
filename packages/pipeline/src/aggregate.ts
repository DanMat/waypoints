import type { Continent, Place, Stats, TravelData } from '@waypoints/shared';
import { type LayoverDetector, noLayovers, stayHours } from './airports.js';
import { continentForCountry } from './continents.js';
import type { GeoResult, ReverseGeocoder } from './geocode.js';
import { haversineKm } from './haversine.js';
import { parseTimeline } from './timeline.js';
import { type AggregateConfig, resolveConfig, type Stay } from './types.js';

export interface AggregateDeps {
	geocoder: ReverseGeocoder;
	/** Optional; when omitted, nothing is treated as a layover. */
	layoverDetector?: LayoverDetector;
	/** Injectable clock, for deterministic `generatedAt` in tests. */
	now?: Date;
}

/** `YYYY-MM` from an ISO datetime string. */
const month = (iso: string): string => iso.slice(0, 7);

const nights = (stay: Stay): number => Math.max(0, Math.round(stayHours(stay) / 24));

/**
 * Turn raw stays into the published, sanitized travel data:
 * filter noise → drop home → drop layovers → reverse-geocode to city level →
 * group by city → compute stats. Exact coordinates never reach the output.
 */
export function aggregate(
	stays: readonly Stay[],
	deps: AggregateDeps,
	config: AggregateConfig = {},
): TravelData {
	const cfg = resolveConfig(config);
	const layovers = deps.layoverDetector ?? noLayovers;

	type Group = {
		geo: GeoResult;
		continent: Continent;
		visits: number;
		nights: number;
		first: string;
		last: string;
	};
	const groups = new Map<string, Group>();

	for (const stay of stays) {
		if (stayHours(stay) * 60 < cfg.minStayMinutes) continue;
		if (cfg.home && haversineKm(stay, cfg.home) <= cfg.homeRadiusKm) continue;
		if (layovers.isLayover(stay)) continue;

		const geo = deps.geocoder.lookup(stay);
		if (!geo) continue;

		const continent = continentForCountry(geo.countryCode);
		if (!continent) continue;

		const id = `${geo.countryCode}/${geo.region ?? ''}/${geo.city}`;
		const existing = groups.get(id);
		if (existing) {
			existing.visits += 1;
			existing.nights += nights(stay);
			if (stay.start < existing.first) existing.first = stay.start;
			if (stay.end > existing.last) existing.last = stay.end;
		} else {
			groups.set(id, {
				geo,
				continent,
				visits: 1,
				nights: nights(stay),
				first: stay.start,
				last: stay.end,
			});
		}
	}

	const places: Place[] = [...groups.entries()]
		.map(([id, g]) => ({
			id,
			city: g.geo.city,
			region: g.geo.region,
			country: g.geo.country,
			countryCode: g.geo.countryCode,
			continent: g.continent,
			lat: g.geo.lat,
			lng: g.geo.lng,
			visits: g.visits,
			nights: g.nights,
			firstVisit: month(g.first),
			lastVisit: month(g.last),
		}))
		.sort((a, b) => b.visits - a.visits || a.city.localeCompare(b.city));

	return { places, stats: computeStats(places, deps.now ?? new Date()) };
}

/** Parse a raw Google export and aggregate it in one step. */
export function aggregateTimeline(
	json: unknown,
	deps: AggregateDeps,
	config: AggregateConfig = {},
): TravelData {
	return aggregate(parseTimeline(json), deps, config);
}

function computeStats(places: readonly Place[], now: Date): Stats {
	const continents = new Set<Continent>();
	const countries = new Set<string>();
	const regions = new Set<string>();
	let totalNights = 0;

	for (const p of places) {
		continents.add(p.continent);
		countries.add(p.countryCode);
		if (p.region) regions.add(`${p.countryCode}/${p.region}`);
		totalNights += p.nights;
	}

	return {
		generatedAt: now.toISOString().slice(0, 7),
		totals: {
			continents: continents.size,
			countries: countries.size,
			regions: regions.size,
			cities: places.length,
			nights: totalNights,
		},
		continents: [...continents].sort(),
		countries: [...countries].sort(),
	};
}
