import type { Continent, Place, Stats, TravelData } from '@waypoints/shared';
import { type LayoverDetector, noLayovers, stayHours } from './airports.js';
import { continentForCountry } from './continents.js';
import type { GeoResult, ReverseGeocoder } from './geocode.js';
import { haversineKm } from './haversine.js';
import { parseTimeline } from './timeline.js';
import {
	type AggregateConfig,
	HOME_LABELS,
	type LatLng,
	type ResolvedConfig,
	resolveConfig,
	type Stay,
} from './types.js';

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
	const homePoints = deriveHomePoints(stays, cfg);

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
		if (stay.label && cfg.dropLabels.includes(stay.label)) continue;
		if (homePoints.some((h) => haversineKm(stay, h) <= cfg.homeRadiusKm)) continue;
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

	const excluded = new Set(cfg.excludeStates);
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
		.filter((p) => !(p.countryCode === 'US' && p.region && excluded.has(p.region)))
		.sort((a, b) => b.visits - a.visits || a.city.localeCompare(b.city));

	return { places, stats: computeStats(places, deps.now ?? new Date(), cfg.includeStates) };
}

/** Parse a raw Google export and aggregate it in one step. */
export function aggregateTimeline(
	json: unknown,
	deps: AggregateDeps,
	config: AggregateConfig = {},
): TravelData {
	return aggregate(parseTimeline(json), deps, config);
}

/**
 * Home locations to scrub: any explicit `home`, plus the distinct locations of
 * "Inferred Home" visits (deduped to ~1 km). Handles moving house over the
 * years — every home in the history is dropped, no coordinates required.
 */
function deriveHomePoints(stays: readonly Stay[], cfg: ResolvedConfig): LatLng[] {
	const points = new Map<string, LatLng>();
	if (cfg.home) points.set('explicit', cfg.home);
	for (const s of stays) {
		if (s.label && HOME_LABELS.includes(s.label) && cfg.dropLabels.includes(s.label)) {
			const key = `${s.lat.toFixed(2)},${s.lng.toFixed(2)}`;
			if (!points.has(key)) points.set(key, { lat: s.lat, lng: s.lng });
		}
	}
	return [...points.values()];
}

function computeStats(
	places: readonly Place[],
	now: Date,
	includeStates: readonly string[] = [],
): Stats {
	const continents = new Set<Continent>();
	const countries = new Set<string>();
	const regions = new Set<string>();
	const usStates = new Set<string>(includeStates);
	let totalNights = 0;

	for (const p of places) {
		continents.add(p.continent);
		countries.add(p.countryCode);
		if (p.region) regions.add(`${p.countryCode}/${p.region}`);
		// DC isn't a state, so it doesn't count toward "/50".
		if (p.countryCode === 'US' && p.region && p.region !== 'District of Columbia') {
			usStates.add(p.region);
		}
		totalNights += p.nights;
	}

	// Great-circle length of the trip, in first-visit order — the basis for the
	// "× around the world" fun stat.
	const ordered = [...places].sort((a, b) => a.firstVisit.localeCompare(b.firstVisit));
	let distanceKm = 0;
	for (let i = 1; i < ordered.length; i++) {
		distanceKm += haversineKm(ordered[i - 1], ordered[i]);
	}

	return {
		generatedAt: now.toISOString().slice(0, 7),
		totals: {
			continents: continents.size,
			countries: countries.size,
			regions: regions.size,
			usStates: usStates.size,
			cities: places.length,
			nights: totalNights,
			distanceKm: Math.round(distanceKm),
		},
		continents: [...continents].sort(),
		countries: [...countries].sort(),
		usStates: [...usStates].sort(),
	};
}
