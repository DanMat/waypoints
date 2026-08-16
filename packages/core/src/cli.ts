#!/usr/bin/env node
// waypoints aggregate <export.json> [--out dir] [--home "lat,lng"] [--home-radius km]
//   [--min-stay min] [--layover-max hours] [--airport-radius km] [--overrides file.json]
//
// Reads a raw Google Timeline export locally, produces the sanitized
// places.json + stats.json. The raw file never leaves your machine.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { aggregateTimeline } from './aggregate.js';
import { AirportLayoverDetector } from './airports.js';
import { loadAirports, loadCities } from './data.js';
import { NearestCityGeocoder } from './geocode.js';
import type { AggregateConfig } from './types.js';
import { resolveConfig } from './types.js';

// pnpm's `--filter … exec` runs in the package dir, so resolve user-supplied
// paths against the directory the command was actually invoked from.
const baseDir = process.env.INIT_CWD ?? process.cwd();
const resolvePath = (p: string): string => (isAbsolute(p) ? p : join(baseDir, p));

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
			case '--overrides': {
				const o = JSON.parse(readFileSync(resolvePath(next()), 'utf8'));
				if (Array.isArray(o.excludeStates)) config.excludeStates = o.excludeStates;
				if (Array.isArray(o.includeStates)) config.includeStates = o.includeStates;
				break;
			}
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

	const raw = JSON.parse(readFileSync(resolvePath(input), 'utf8'));
	const { places, stats } = aggregateTimeline(raw, { geocoder, layoverDetector }, config);

	const outDir = resolvePath(out);
	mkdirSync(outDir, { recursive: true });
	writeFileSync(join(outDir, 'places.json'), JSON.stringify(places));
	writeFileSync(join(outDir, 'stats.json'), JSON.stringify(stats));

	const { totals } = stats;
	const aroundWorld = (totals.distanceKm / 40075).toFixed(1);
	console.log(
		`✓ ${places.length} cities · ${totals.countries} countries · ${totals.continents}/7 continents · ${totals.usStates}/50 US states · ${totals.nights} nights · ${aroundWorld}× around the world`,
	);
	console.log(`  wrote ${join(outDir, 'places.json')} and ${join(outDir, 'stats.json')}`);
	for (const p of places.slice(0, 8)) {
		console.log(`  · ${p.city}, ${p.country} — ${p.visits} visit(s)`);
	}
}

main();
