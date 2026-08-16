import { FunFacts, PlaceList, StatTiles, WorldMap } from '@danmat/waypoints-ui';
import { useEffect, useState } from 'react';
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

			<p style={{ margin: '0 0 1.5rem' }}>
				<a
					href="https://droppinmap.com"
					target="_blank"
					rel="noreferrer"
					style={{
						display: 'inline-block',
						color: 'var(--accent)',
						background: 'var(--accent-soft)',
						border: '1px solid var(--accent)',
						borderRadius: '999px',
						padding: '0.4rem 0.9rem',
						textDecoration: 'none',
						fontWeight: 600,
						fontSize: '0.9rem',
					}}
				>
					📍 Map your own travels at droppinmap.com →
				</a>
			</p>

			<StatTiles stats={data.stats} />
			<WorldMap places={data.places} />
			<FunFacts stats={data.stats} />
			<PlaceList places={data.places} />

			<footer>
				Aggregated {fmtGeneratedAt(data.stats.generatedAt)} · privacy-first: raw location data never
				leaves a private, ephemeral store.
				<br />
				Made with{' '}
				<a
					href="https://droppinmap.com"
					target="_blank"
					rel="noreferrer"
					style={{ color: 'var(--accent)' }}
				>
					droppin
				</a>{' '}
				— map your own travels at{' '}
				<a
					href="https://droppinmap.com"
					target="_blank"
					rel="noreferrer"
					style={{ color: 'var(--accent)' }}
				>
					droppinmap.com
				</a>
				.
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
