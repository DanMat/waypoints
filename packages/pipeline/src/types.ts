/**
 * A single dwell at one location, already extracted from a raw export.
 * Coordinates are exact here — a `Stay` only ever lives inside the pipeline,
 * never in published output.
 */
export interface Stay {
	lat: number;
	lng: number;
	/** ISO-8601 datetime. */
	start: string;
	/** ISO-8601 datetime. */
	end: string;
	/** Google's `semanticType` for the visit, e.g. "Inferred Home", when present. */
	label?: string;
}

/** A point on Earth, in decimal degrees. */
export interface LatLng {
	lat: number;
	lng: number;
}

/** Knobs for the aggregation. Every field has a sensible default. */
export interface AggregateConfig {
	/**
	 * Home location. Any stay within `homeRadiusKm` of it is dropped entirely,
	 * so home never appears on the map or in the counts.
	 */
	home?: LatLng;
	/** Radius around `home` to treat as home. Default 25 km. */
	homeRadiusKm?: number;
	/** Stays shorter than this are noise and are ignored. Default 30 minutes. */
	minStayMinutes?: number;
	/** A stay at/near an airport shorter than this is a layover. Default 4 hours. */
	layoverMaxHours?: number;
	/** How close to an airport counts as "at the airport". Default 3 km. */
	airportRadiusKm?: number;
	/**
	 * Visit labels (Google `semanticType`) to exclude entirely, and — for the
	 * home labels — to drop anything within `homeRadiusKm` of. This scrubs home
	 * and work without needing coordinates. Default: Home + Work (inferred too).
	 */
	dropLabels?: string[];
	/**
	 * US states to force-exclude — dropped from places and the states stat.
	 * For pass-throughs the data counts as a stop but you don't count as a visit.
	 */
	excludeStates?: string[];
	/**
	 * US states to force-include in the states stat even with no recorded stop
	 * (e.g. drive-throughs Timeline logged as movement only).
	 */
	includeStates?: string[];
}

/** Labels treated as "home" for the radius-based scrub. */
export const HOME_LABELS: readonly string[] = ['Home', 'Inferred Home'];

export interface ResolvedConfig {
	home?: LatLng;
	homeRadiusKm: number;
	minStayMinutes: number;
	layoverMaxHours: number;
	airportRadiusKm: number;
	dropLabels: string[];
	excludeStates: string[];
	includeStates: string[];
}

export function resolveConfig(config: AggregateConfig = {}): ResolvedConfig {
	return {
		home: config.home,
		homeRadiusKm: config.homeRadiusKm ?? 25,
		minStayMinutes: config.minStayMinutes ?? 30,
		layoverMaxHours: config.layoverMaxHours ?? 4,
		airportRadiusKm: config.airportRadiusKm ?? 3,
		dropLabels: config.dropLabels ?? ['Home', 'Inferred Home', 'Work', 'Inferred Work'],
		excludeStates: config.excludeStates ?? [],
		includeStates: config.includeStates ?? [],
	};
}
