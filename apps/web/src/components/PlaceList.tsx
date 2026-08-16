import type { Place } from '@waypoints/shared';

const fmtMonth = (ym: string): string => {
	const [y, m] = ym.split('-').map(Number);
	if (!y || !m) return ym;
	return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en', {
		month: 'short',
		year: 'numeric',
	});
};

export function PlaceList({ places }: { places: readonly Place[] }) {
	const rows = [...places].sort((a, b) => b.visits - a.visits || a.city.localeCompare(b.city));

	return (
		<section className="places" aria-label="Places visited">
			<h2 className="section-label">Every place, most-visited first</h2>
			<div className="table-scroll">
				<table>
					<thead>
						<tr>
							<th>City</th>
							<th>Country</th>
							<th>Continent</th>
							<th className="num">Visits</th>
							<th className="num">Nights</th>
							<th>Last seen</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((p) => (
							<tr key={p.id}>
								<td className="city">{p.city}</td>
								<td>{p.country}</td>
								<td className="muted">{p.continent}</td>
								<td className="num">{p.visits}</td>
								<td className="num">{p.nights}</td>
								<td className="muted">{fmtMonth(p.lastVisit)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	);
}
