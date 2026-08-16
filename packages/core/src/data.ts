import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Airport } from './airports.js';
import type { City } from './geocode.js';

// Node-only: reads the datasets built by `scripts/prep-data.mjs`. Deliberately
// not re-exported from index.ts so the library stays free of `node:fs` for the
// Worker/web consumers, which only use the types.
const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');

function read<T>(file: string): T {
	const path = join(dataDir, file);
	try {
		return JSON.parse(readFileSync(path, 'utf8')) as T;
	} catch {
		throw new Error(`Missing dataset ${path}. Run \`pnpm prep:data\` first.`);
	}
}

export const loadCities = (): City[] => read<City[]>('cities.json');
export const loadAirports = (): Airport[] => read<Airport[]>('airports.json');
