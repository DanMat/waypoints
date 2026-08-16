#!/usr/bin/env node
// Downloads the offline gazetteer + airport datasets the pipeline needs and
// writes them as compact JSON into ../data. These files are large and
// third-party, so they are gitignored — run `pnpm prep:data` to (re)build them.
//
//   cities  → GeoNames cities15000 (CC-BY 4.0)          ~25k cities
//   airports → OurAirports large/medium airports (PD)   ~5k airports

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, '..');
const dataDir = join(pkgRoot, 'data');
const tmpDir = join(pkgRoot, '.tmp-data');

const GEONAMES = 'https://download.geonames.org/export/dump';
const OURAIRPORTS = 'https://davidmegginson.github.io/ourairports-data/airports.csv';

function download(url, dest) {
	console.log(`↓ ${url}`);
	execSync(`curl -fsSL --max-time 120 -o ${JSON.stringify(dest)} ${JSON.stringify(url)}`, {
		stdio: ['ignore', 'ignore', 'inherit'],
	});
}

/** Minimal RFC-4180-ish CSV row parser (handles quoted fields + "" escapes). */
function parseCsvLine(line) {
	const out = [];
	let field = '';
	let inQuotes = false;
	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (inQuotes) {
			if (ch === '"') {
				if (line[i + 1] === '"') {
					field += '"';
					i++;
				} else {
					inQuotes = false;
				}
			} else {
				field += ch;
			}
		} else if (ch === '"') {
			inQuotes = true;
		} else if (ch === ',') {
			out.push(field);
			field = '';
		} else {
			field += ch;
		}
	}
	out.push(field);
	return out;
}

function buildCities() {
	// Country code → country name.
	const countries = new Map();
	for (const line of readFileSync(join(tmpDir, 'countryInfo.txt'), 'utf8').split('\n')) {
		if (!line || line.startsWith('#')) continue;
		const cols = line.split('\t');
		if (cols[0] && cols[4]) countries.set(cols[0], cols[4]);
	}

	// `${CC}.${admin1}` → region name.
	const admin1 = new Map();
	for (const line of readFileSync(join(tmpDir, 'admin1CodesASCII.txt'), 'utf8').split('\n')) {
		if (!line) continue;
		const cols = line.split('\t');
		if (cols[0] && cols[1]) admin1.set(cols[0], cols[1]);
	}

	const cities = [];
	for (const line of readFileSync(join(tmpDir, 'cities15000.txt'), 'utf8').split('\n')) {
		if (!line) continue;
		const c = line.split('\t');
		const name = c[1];
		const lat = Number.parseFloat(c[4]);
		const lng = Number.parseFloat(c[5]);
		const countryCode = c[8];
		const region = admin1.get(`${countryCode}.${c[10]}`);
		const population = Number.parseInt(c[14], 10) || 0;
		if (!name || !countryCode || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
		cities.push({
			name,
			...(region ? { region } : {}),
			country: countries.get(countryCode) ?? countryCode,
			countryCode,
			lat: round(lat),
			lng: round(lng),
			population,
		});
	}
	return cities;
}

function buildAirports() {
	const rows = readFileSync(join(tmpDir, 'airports.csv'), 'utf8').split('\n');
	const header = parseCsvLine(rows[0]);
	const idx = (name) => header.indexOf(name);
	const iType = idx('type');
	const iLat = idx('latitude_deg');
	const iLng = idx('longitude_deg');

	const airports = [];
	for (let i = 1; i < rows.length; i++) {
		if (!rows[i]) continue;
		const cols = parseCsvLine(rows[i]);
		const type = cols[iType];
		if (type !== 'large_airport' && type !== 'medium_airport') continue;
		const lat = Number.parseFloat(cols[iLat]);
		const lng = Number.parseFloat(cols[iLng]);
		if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
		airports.push({ lat: round(lat), lng: round(lng) });
	}
	return airports;
}

const round = (n) => Math.round(n * 10000) / 10000;

function main() {
	rmSync(tmpDir, { recursive: true, force: true });
	mkdirSync(tmpDir, { recursive: true });
	if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

	download(`${GEONAMES}/cities15000.zip`, join(tmpDir, 'cities15000.zip'));
	download(`${GEONAMES}/admin1CodesASCII.txt`, join(tmpDir, 'admin1CodesASCII.txt'));
	download(`${GEONAMES}/countryInfo.txt`, join(tmpDir, 'countryInfo.txt'));
	download(OURAIRPORTS, join(tmpDir, 'airports.csv'));
	execSync(
		`unzip -o -q ${JSON.stringify(join(tmpDir, 'cities15000.zip'))} -d ${JSON.stringify(tmpDir)}`,
	);

	const cities = buildCities();
	const airports = buildAirports();
	writeFileSync(join(dataDir, 'cities.json'), JSON.stringify(cities));
	writeFileSync(join(dataDir, 'airports.json'), JSON.stringify(airports));
	rmSync(tmpDir, { recursive: true, force: true });

	console.log(`✓ data/cities.json   ${cities.length} cities`);
	console.log(`✓ data/airports.json ${airports.length} airports`);
}

main();
