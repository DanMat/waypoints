import type { Stats } from '@waypoints/shared';

export function StatTiles({ stats }: { stats: Stats }) {
	const t = stats.totals;
	const tiles = [
		{ k: 'Continents', n: String(t.continents), sub: '/ 7', hl: true },
		{ k: 'Countries', n: String(t.countries), sub: '/ 195' },
		{ k: 'US states', n: String(t.usStates), sub: '/ 50' },
		{ k: 'Cities', n: String(t.cities) },
		{ k: 'Regions', n: String(t.regions) },
		{ k: 'Nights away', n: String(t.nights) },
	];

	return (
		<section className="stats" aria-label="Travel totals">
			{tiles.map((tile) => (
				<div key={tile.k} className={tile.hl ? 'stat stat-hl' : 'stat'}>
					<div className="stat-n">
						{tile.n}
						{tile.sub ? <small> {tile.sub}</small> : null}
					</div>
					<div className="stat-k">{tile.k}</div>
				</div>
			))}
		</section>
	);
}
