/** The shape the server returns and the web app renders. Change it once. */
export interface Health {
	ok: boolean;
	service: string;
	uptime: number;
}

export function describeHealth(h: Health): string {
	return h.ok ? `${h.service} is up (${Math.round(h.uptime)}s)` : `${h.service} is down`;
}

/** The seven continents, as the stat tiles count them. */
export type Continent =
	| 'Africa'
	| 'Antarctica'
	| 'Asia'
	| 'Europe'
	| 'North America'
	| 'Oceania'
	| 'South America';

export const CONTINENTS: readonly Continent[] = [
	'Africa',
	'Antarctica',
	'Asia',
	'Europe',
	'North America',
	'Oceania',
	'South America',
];

/**
 * A visited place, aggregated to city level. This is the *published* shape:
 * it deliberately carries a city centroid, never the user's exact ping, and
 * only month-precision dates.
 */
export interface Place {
	/** Stable key: `${countryCode}/${region ?? ''}/${city}`. */
	id: string;
	city: string;
	/** Admin-1 (state / province / region), when known. */
	region?: string;
	country: string;
	/** ISO 3166-1 alpha-2. */
	countryCode: string;
	continent: Continent;
	/** City centroid (coarse), NOT a raw coordinate. */
	lat: number;
	lng: number;
	/** Number of distinct visit episodes. */
	visits: number;
	/** Total nights stayed (approximate). */
	nights: number;
	/** `YYYY-MM` of the first visit. */
	firstVisit: string;
	/** `YYYY-MM` of the most recent visit. */
	lastVisit: string;
}

/** Headline counters + the sets behind them. */
export interface Stats {
	/** `YYYY-MM` the aggregate was produced. */
	generatedAt: string;
	totals: {
		continents: number;
		countries: number;
		regions: number;
		/** Distinct US states (+ DC) visited, out of 50. */
		usStates: number;
		cities: number;
		nights: number;
		/** Great-circle distance across the trip, in km (basis for fun stats). */
		distanceKm: number;
	};
	/** Which continents (so the UI can show "5 / 7" and highlight a globe). */
	continents: Continent[];
	/** ISO alpha-2 codes of countries visited. */
	countries: string[];
	/** Names of US states (+ DC) visited. */
	usStates: string[];
}

/** The full public payload: what the Worker serves and the page renders. */
export interface TravelData {
	places: Place[];
	stats: Stats;
}
