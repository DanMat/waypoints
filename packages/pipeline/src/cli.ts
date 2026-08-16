#!/usr/bin/env node
// waypoints aggregate <export.json> [--out dir] [--home "lat,lng"] [--home-radius km]
//   [--min-stay min] [--layover-max hours] [--airport-radius km]
//
// Reads a raw Google Timeline export locally, produces the sanitized
// places.json + stats.json. The raw file never leaves your machine.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { aggregateTimeline } from './aggregate.js';
import { AirportLayoverDetector } from './airports.js';
import { loadAirports, loadCities } from './data.js';
import { NearestCityGeocoder } from './geocode.js';
import type { AggregateConfig } from './types.js';
import { resolveConfig } from './types.js';

function parseArgs(argv: string[]): { input?: string; out: string; config: AggregateConfig } {
	const config: AggregateConfig = {};
	let input: string | undefined;
	let out = '.';
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		const next = () => argv[++i];
		switch (arg) {
			case '--out':
				out = next();
				break;
			case '--home': {
				const [lat, lng] = next().split(',').map(Number);
				config.home = { lat, lng };
				break;
			}
			case '--home-radius':
				config.homeRadiusKm = Number(next());
				break;
			case '--min-stay':
				config.minStayMinutes = Number(next());
				break;
			case '--layover-max':
				config.layoverMaxHours = Number(next());
				break;
			case '--airport-radius':
				config.airportRadiusKm = Number(next());
				break;
			default:
				if (!arg.startsWith('--')) input = arg;
		}
	}
	return { input, out, config };
}

function main() {
	const { input, out, config } = parseArgs(process.argv.slice(2));
	if (!input) {
		console.error('Usage: waypoints <export.json> [--out dir] [--home "lat,lng"] ...');
		process.exit(1);
	}

	const cfg = resolveConfig(config);
	const geocoder = new NearestCityGeocoder(loadCities());
	const layoverDetector = new AirportLayoverDetector(loadAirports(), cfg);

	const raw = JSON.parse(readFileSync(input, 'utf8'));
	const { places, stats } = aggregateTimeline(raw, { geocoder, layoverDetector }, config);

	mkdirSync(out, { recursive: true });
	writeFileSync(join(out, 'places.json'), JSON.stringify(places));
	writeFileSync(join(out, 'stats.json'), JSON.stringify(stats));

	const { totals } = stats;
	console.log(
		`✓ ${places.length} cities · ${totals.countries} countries · ${totals.continents}/7 continents · ${totals.nights} nights`,
	);
	console.log(`  wrote ${join(out, 'places.json')} and ${join(out, 'stats.json')}`);
	for (const p of places.slice(0, 8)) {
		console.log(`  · ${p.city}, ${p.country} — ${p.visits} visit(s)`);
	}
}

main();
