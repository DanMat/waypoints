import type { Place } from '@danmat/waypoints-core';
import { useMemo, useState } from 'react';

const fmtMonth = (ym: string): string => {
	const [y, m] = ym.split('-').map(Number);
	if (!y || !m) return ym;
	return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en', {
		month: 'short',
		year: 'numeric',
	});
};

type SortKey = 'city' | 'country' | 'continent' | 'visits' | 'nights' | 'lastVisit';
type SortDir = 'asc' | 'desc';

const COLUMNS: Array<{ key: SortKey; label: string; numeric: boolean }> = [
	{ key: 'city', label: 'City', numeric: false },
	{ key: 'country', label: 'Country', numeric: false },
	{ key: 'continent', label: 'Continent', numeric: false },
	{ key: 'visits', label: 'Visits', numeric: true },
	{ key: 'nights', label: 'Nights', numeric: true },
	{ key: 'lastVisit', label: 'Last seen', numeric: true },
];

export function PlaceList({ places }: { places: readonly Place[] }) {
	const [sortKey, setSortKey] = useState<SortKey>('visits');
	const [sortDir, setSortDir] = useState<SortDir>('desc');

	const rows = useMemo(() => {
		const sign = sortDir === 'asc' ? 1 : -1;
		return [...places].sort((a, b) => {
			let cmp: number;
			if (sortKey === 'visits' || sortKey === 'nights') {
				cmp = a[sortKey] - b[sortKey];
			} else {
				cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
			}
			// Stable tiebreak on city so equal values keep a predictable order.
			return (cmp || a.city.localeCompare(b.city)) * sign;
		});
	}, [places, sortKey, sortDir]);

	function toggle(col: (typeof COLUMNS)[number]) {
		if (col.key === sortKey) {
			setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
		} else {
			setSortKey(col.key);
			setSortDir(col.numeric ? 'desc' : 'asc');
		}
	}

	return (
		<section className="places" aria-label="Places visited">
			<h2 className="section-label">Every place — click a column to sort</h2>
			<div className="table-scroll">
				<table>
					<thead>
						<tr>
							{COLUMNS.map((col) => {
								const active = col.key === sortKey;
								return (
									<th
										key={col.key}
										className={col.numeric ? 'num' : undefined}
										aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
									>
										<button
											type="button"
											className={active ? 'sort-btn active' : 'sort-btn'}
											onClick={() => toggle(col)}
										>
											{col.label}
											<span className="sort-caret" aria-hidden="true">
												{active ? (sortDir === 'asc' ? '▲' : '▼') : ''}
											</span>
										</button>
									</th>
								);
							})}
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
								<td className="muted num">{fmtMonth(p.lastVisit)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	);
}
