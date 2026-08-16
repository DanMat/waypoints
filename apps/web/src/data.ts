import type { TravelData } from '@danmat/waypoints-core';
import { sampleData } from './sample.js';

export interface LoadedData {
	data: TravelData;
	/** True when served by the live API; false when falling back to demo data. */
	live: boolean;
}

/**
 * Load travel data from the Worker API, falling back to bundled demo data when
 * the API isn't reachable (e.g. before real data is uploaded, or offline).
 */
export async function loadTravelData(): Promise<LoadedData> {
	try {
		const [placesRes, statsRes] = await Promise.all([fetch('/api/places'), fetch('/api/stats')]);
		if (placesRes.ok && statsRes.ok) {
			const [places, stats] = await Promise.all([placesRes.json(), statsRes.json()]);
			return { data: { places, stats }, live: true };
		}
	} catch {
		// fall through to demo data
	}
	return { data: sampleData, live: false };
}
