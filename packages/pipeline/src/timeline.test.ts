import { describe, expect, it } from 'vitest';
import { parseTimeline } from './timeline.js';

describe('parseTimeline', () => {
	it('parses the on-device Timeline export (semanticSegments)', () => {
		const json = {
			semanticSegments: [
				{
					startTime: '2026-03-01T10:00:00Z',
					endTime: '2026-03-01T14:00:00Z',
					visit: { topCandidate: { placeLocation: { latLng: 'geo:48.8566,2.3522' } } },
				},
				// An activity/path segment with no visit — ignored.
				{ startTime: '2026-03-01T14:00:00Z', endTime: '2026-03-01T15:00:00Z', timelinePath: [] },
			],
		};
		const stays = parseTimeline(json);
		expect(stays).toHaveLength(1);
		expect(stays[0]).toMatchObject({ lat: 48.8566, lng: 2.3522 });
	});

	it('parses the older Takeout format (timelineObjects + E7)', () => {
		const json = {
			timelineObjects: [
				{
					placeVisit: {
						location: { latitudeE7: 515074000, longitudeE7: -1278000 },
						duration: {
							startTimestamp: '2026-02-01T09:00:00Z',
							endTimestamp: '2026-02-03T09:00:00Z',
						},
					},
				},
			],
		};
		const stays = parseTimeline(json);
		expect(stays).toHaveLength(1);
		expect(stays[0].lat).toBeCloseTo(51.5074);
		expect(stays[0].lng).toBeCloseTo(-0.1278);
	});

	it('handles the "51.5°, -0.12°" latLng variant', () => {
		const json = {
			semanticSegments: [
				{
					startTime: '2026-01-01T00:00:00Z',
					endTime: '2026-01-01T02:00:00Z',
					visit: { topCandidate: { placeLocation: { latLng: '35.6762°, 139.6503°' } } },
				},
			],
		};
		expect(parseTimeline(json)[0]).toMatchObject({ lat: 35.6762, lng: 139.6503 });
	});

	it('skips malformed entries and sorts by start time', () => {
		const json = {
			semanticSegments: [
				{
					startTime: '2026-05-01T00:00:00Z',
					endTime: '2026-05-01T02:00:00Z',
					visit: { topCandidate: { placeLocation: { latLng: 'geo:1,1' } } },
				},
				{ startTime: 'not-a-date', endTime: 'x', visit: { topCandidate: { placeLocation: {} } } },
				{
					startTime: '2026-04-01T00:00:00Z',
					endTime: '2026-04-01T02:00:00Z',
					visit: { topCandidate: { placeLocation: { latLng: 'geo:2,2' } } },
				},
			],
		};
		const stays = parseTimeline(json);
		expect(stays).toHaveLength(2);
		expect(stays[0].start < stays[1].start).toBe(true);
	});

	it('returns [] for unrecognised input', () => {
		expect(parseTimeline({ nonsense: true })).toEqual([]);
		expect(parseTimeline(null)).toEqual([]);
	});
});
