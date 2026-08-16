import type { Place } from '@danmat/waypoints-core';
import { type GeoSphere, geoGraticule10, geoInterpolate, geoNaturalEarth1, geoPath } from 'd3-geo';
import type { FeatureCollection, Geometry } from 'geojson';
import { useMemo } from 'react';
import { feature } from 'topojson-client';
import worldRaw from './assets/countries-110m.json';

const WIDTH = 960;
const HEIGHT = 480;
const SPHERE: GeoSphere = { type: 'Sphere' };

// The TopoJSON shape varies by version; treat the import structurally and let
// topojson-client validate it at runtime.
const topology = worldRaw as unknown as { objects: Record<string, unknown> };
const land = feature(
	topology as never,
	topology.objects.countries as never,
) as unknown as FeatureCollection<Geometry>;

export function WorldMap({ places }: { places: readonly Place[] }) {
	const { landPaths, graticule, spherePath, arcs, dots } = useMemo(() => {
		const projection = geoNaturalEarth1().fitExtent(
			[
				[12, 12],
				[WIDTH - 12, HEIGHT - 12],
			],
			SPHERE,
		);
		const path = geoPath(projection);

		const dots = places
			.map((p) => {
				const xy = projection([p.lng, p.lat]);
				return xy ? { place: p, x: xy[0], y: xy[1] } : null;
			})
			.filter((d): d is NonNullable<typeof d> => d !== null);

		// Connect places in the order they were first visited — a travel path.
		const ordered = [...places].sort((a, b) => a.firstVisit.localeCompare(b.firstVisit));
		const arcs: Array<{ key: string; d: string }> = [];
		for (let i = 1; i < ordered.length; i++) {
			const from = ordered[i - 1];
			const to = ordered[i];
			const interp = geoInterpolate([from.lng, from.lat], [to.lng, to.lat]);
			const coordinates = Array.from({ length: 33 }, (_, k) => interp(k / 32));
			const d = path({ type: 'LineString', coordinates });
			if (d) arcs.push({ key: `${from.id}->${to.id}`, d });
		}

		return {
			landPaths: land.features.map((f, i) => ({ key: String(f.id ?? i), d: path(f) ?? '' })),
			graticule: path(geoGraticule10()) ?? '',
			spherePath: path(SPHERE) ?? '',
			arcs,
			dots,
		};
	}, [places]);

	const maxVisits = Math.max(1, ...places.map((p) => p.visits));

	return (
		<figure className="map">
			<svg
				viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
				role="img"
				aria-label={`World map with ${places.length} visited cities marked`}
			>
				<title>Places visited</title>
				<path className="map-sphere" d={spherePath} />
				<path className="map-graticule" d={graticule} />
				{landPaths.map((p) => (
					<path key={p.key} className="map-land" d={p.d} />
				))}
				{arcs.map((a) => (
					<path key={a.key} className="map-arc" d={a.d} />
				))}
				{dots.map(({ place, x, y }) => {
					const r = 2.5 + Math.sqrt(place.visits / maxVisits) * 5;
					return (
						<circle
							key={place.id}
							className={place.visits >= maxVisits ? 'map-dot map-dot-major' : 'map-dot'}
							cx={x}
							cy={y}
							r={r}
						>
							<title>{`${place.city}, ${place.country} · ${place.visits} visit${place.visits === 1 ? '' : 's'}`}</title>
						</circle>
					);
				})}
			</svg>
		</figure>
	);
}
