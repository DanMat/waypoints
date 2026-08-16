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
}

export interface ResolvedConfig {
	home?: LatLng;
	homeRadiusKm: number;
	minStayMinutes: number;
	layoverMaxHours: number;
	airportRadiusKm: number;
}

export function resolveConfig(config: AggregateConfig = {}): ResolvedConfig {
	return {
		home: config.home,
		homeRadiusKm: config.homeRadiusKm ?? 25,
		minStayMinutes: config.minStayMinutes ?? 30,
		layoverMaxHours: config.layoverMaxHours ?? 4,
		airportRadiusKm: config.airportRadiusKm ?? 3,
	};
}
