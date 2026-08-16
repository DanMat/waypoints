import type { Stats } from '@waypoints/shared';

const EARTH_CIRCUMFERENCE_KM = 40075;
const MOON_DISTANCE_KM = 384400;

export function FunFacts({ stats }: { stats: Stats }) {
	const km = stats.totals.distanceKm;
	const aroundWorld = km / EARTH_CIRCUMFERENCE_KM;
	const moonRatio = km / MOON_DISTANCE_KM;

	const facts = [
		{ emoji: '✈️', big: `${km.toLocaleString()} km`, label: 'traveled between places' },
		{ emoji: '🌍', big: `${aroundWorld.toFixed(1)}×`, label: 'around the world' },
		moonRatio >= 1
			? { emoji: '🌙', big: `${moonRatio.toFixed(1)}×`, label: 'the distance to the Moon' }
			: { emoji: '🌙', big: `${Math.round(moonRatio * 100)}%`, label: 'of the way to the Moon' },
	];

	return (
		<section className="funfacts" aria-label="Just for fun">
			{facts.map((f) => (
				<div key={f.label} className="fun">
					<div className="fun-big">
						<span className="fun-emoji" aria-hidden="true">
							{f.emoji}
						</span>
						{f.big}
					</div>
					<div className="fun-label">{f.label}</div>
				</div>
			))}
		</section>
	);
}
