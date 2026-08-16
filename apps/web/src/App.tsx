import { useEffect, useState } from 'react';
import { describeHealth, type Health } from '@waypoints/shared';

export function App() {
	const [health, setHealth] = useState<Health | null>(null);

	useEffect(() => {
		fetch('/api/health')
			.then((r) => r.json() as Promise<Health>)
			.then(setHealth)
			.catch(() => setHealth({ ok: false, service: 'waypoints', uptime: 0 }));
	}, []);

	return (
		<main>
			<h1>waypoints</h1>
			<p>{health ? describeHealth(health) : 'Checking…'}</p>
		</main>
	);
}
