import { haversineKm } from './haversine.js';
import type { ResolvedConfig, Stay } from './types.js';

/** A point-of-interest airport (e.g. a large/medium OurAirports row). */
export interface Airport {
	lat: number;
	lng: number;
}

const MS_PER_HOUR = 1000 * 60 * 60;

export function stayHours(stay: Stay): number {
	return (new Date(stay.end).getTime() - new Date(stay.start).getTime()) / MS_PER_HOUR;
}

export interface LayoverDetector {
	/** True when a stay is a transit stop at an airport, not a real visit. */
	isLayover(stay: Stay): boolean;
}

/**
 * A stay counts as a layover when it is (a) short and (b) at/near an airport.
 * Both conditions matter: a two-week trip that happens to start at an airport
 * is not a layover, and a short stop downtown is not one either.
 */
export class AirportLayoverDetector implements LayoverDetector {
	private readonly airports: readonly Airport[];
	private readonly radiusKm: number;
	private readonly maxHours: number;

	constructor(
		airports: readonly Airport[],
		config: Pick<ResolvedConfig, 'airportRadiusKm' | 'layoverMaxHours'>,
	) {
		this.airports = airports;
		this.radiusKm = config.airportRadiusKm;
		this.maxHours = config.layoverMaxHours;
	}

	isLayover(stay: Stay): boolean {
		if (stayHours(stay) > this.maxHours) {
			return false;
		}
		return this.airports.some((airport) => haversineKm(stay, airport) <= this.radiusKm);
	}
}

/** A detector that never flags anything — the default when no airport data is supplied. */
export const noLayovers: LayoverDetector = { isLayover: () => false };
