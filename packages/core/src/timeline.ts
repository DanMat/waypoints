import type { Stay } from './types.js';

/**
 * Parse a Google location-history export into `Stay`s (place visits only;
 * movement/activity segments are ignored — we care where you *were*, not the
 * path between).
 *
 * Two shapes are handled, because Google's export has changed:
 *  - on-device Timeline export: `{ semanticSegments: [{ startTime, endTime,
 *    visit: { topCandidate: { placeLocation: { latLng } } } }] }`
 *  - older Takeout Semantic Location History: `{ timelineObjects: [{ placeVisit:
 *    { location: { latitudeE7, longitudeE7 }, duration: { startTimestamp,
 *    endTimestamp } } }] }`
 *
 * Unknown/malformed entries are skipped rather than throwing, so a format tweak
 * degrades gracefully instead of losing the whole run.
 */
export function parseTimeline(json: unknown): Stay[] {
	const root = json as Record<string, unknown> | unknown[];
	const stays: Stay[] = [];

	const segments = Array.isArray(root)
		? root
		: ((root as Record<string, unknown>)?.semanticSegments as unknown[] | undefined);
	if (Array.isArray(segments)) {
		for (const seg of segments) {
			const stay = fromSemanticSegment(seg);
			if (stay) stays.push(stay);
		}
	}

	const timelineObjects = Array.isArray(root)
		? undefined
		: ((root as Record<string, unknown>)?.timelineObjects as unknown[] | undefined);
	if (Array.isArray(timelineObjects)) {
		for (const obj of timelineObjects) {
			const stay = fromTimelineObject(obj);
			if (stay) stays.push(stay);
		}
	}

	return stays.sort((a, b) => a.start.localeCompare(b.start));
}

function fromSemanticSegment(seg: unknown): Stay | null {
	const s = seg as Record<string, unknown>;
	const visit = s?.visit as Record<string, unknown> | undefined;
	const candidate = visit?.topCandidate as Record<string, unknown> | undefined;
	if (!candidate) return null;
	// `placeLocation` is a "geo:lat,lng" string in the on-device export, or a
	// `{ latLng }` object in older exports.
	const placeLocation = candidate.placeLocation;
	const latLng =
		typeof placeLocation === 'string'
			? parseLatLng(placeLocation)
			: parseLatLng((placeLocation as Record<string, unknown> | undefined)?.latLng);
	const start = asIso(s?.startTime);
	const end = asIso(s?.endTime);
	if (!latLng || !start || !end) return null;
	const label = typeof candidate.semanticType === 'string' ? candidate.semanticType : undefined;
	return { ...latLng, start, end, ...(label ? { label } : {}) };
}

function fromTimelineObject(obj: unknown): Stay | null {
	const o = obj as Record<string, unknown>;
	const placeVisit = o?.placeVisit as Record<string, unknown> | undefined;
	if (!placeVisit) return null;
	const location = placeVisit.location as Record<string, unknown> | undefined;
	const duration = placeVisit.duration as Record<string, unknown> | undefined;
	const lat = e7(location?.latitudeE7);
	const lng = e7(location?.longitudeE7);
	const start = asIso(duration?.startTimestamp);
	const end = asIso(duration?.endTimestamp);
	if (lat === null || lng === null || !start || !end) return null;
	return { lat, lng, start, end };
}

/** Parse a `latLng` string: `"geo:51.5,-0.12"`, `"51.5°, -0.12°"`, or `"51.5, -0.12"`. */
function parseLatLng(value: unknown): { lat: number; lng: number } | null {
	if (typeof value !== 'string') return null;
	const cleaned = value.replace(/^geo:/i, '').replace(/°/g, '');
	const parts = cleaned.split(',').map((p) => Number.parseFloat(p.trim()));
	if (parts.length !== 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null;
	return { lat: parts[0], lng: parts[1] };
}

function e7(value: unknown): number | null {
	if (typeof value !== 'number' || !Number.isFinite(value)) return null;
	return value / 1e7;
}

function asIso(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const t = Date.parse(value);
	return Number.isNaN(t) ? null : new Date(t).toISOString();
}
