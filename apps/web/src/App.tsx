import { useEffect, useState } from 'react';
import { FunFacts } from './components/FunFacts.js';
import { PlaceList } from './components/PlaceList.js';
import { StatTiles } from './components/StatTiles.js';
import { WorldMap } from './components/WorldMap.js';
import { type LoadedData, loadTravelData } from './data.js';

export function App() {
	const [loaded, setLoaded] = useState<LoadedData | null>(null);

	useEffect(() => {
		loadTravelData().then(setLoaded);
	}, []);

	if (!loaded) {
		return (
			<main className="wrap">
				<p className="loading">Charting the map…</p>
			</main>
		);
	}

	const { data, live } = loaded;

	return (
		<main className="wrap">
			<header className="hero">
				<p className="eyebrow">Travel log</p>
				<h1>Waypoints</h1>
				<p className="lede">
					Everywhere I've been, aggregated from my own location history —{' '}
					<strong>cities, never coordinates</strong>. Airport layovers don't count.
				</p>
				{live ? null : <span className="badge">Demo data · live once my history is uploaded</span>}
			</header>

			<StatTiles stats={data.stats} />
			<WorldMap places={data.places} />
			<FunFacts stats={data.stats} />
			<PlaceList places={data.places} />

			<footer>
				Aggregated {fmtGeneratedAt(data.stats.generatedAt)} · privacy-first: raw location data never
				leaves a private, ephemeral store.
			</footer>
		</main>
	);
}

function fmtGeneratedAt(ym: string): string {
	const [y, m] = ym.split('-').map(Number);
	if (!y || !m) return ym;
	return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en', {
		month: 'long',
		year: 'numeric',
	});
}
