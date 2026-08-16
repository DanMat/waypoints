#!/usr/bin/env node
// One-command refresh of the live travel data.
//
//   1. Drop your Google Timeline export (a .json) into ./private
//   2. Run `pnpm update:data`
//
// It aggregates the newest export in ./private (home/work scrubbed, layovers
// dropped, overrides.json applied), then uploads the sanitized places.json +
// stats.json to R2 (which the site serves) and stashes the raw export in the
// private bucket so the quarterly Action stays in sync. Nothing sensitive is
// committed — ./private and the raw export are gitignored.

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const inDir = join(root, 'private');
const outDir = join(root, '.data-out');
const DATA_BUCKET = 'waypoints-data';
const RAW_BUCKET = 'waypoints-raw';
const RAW_KEY = 'timeline.json';

const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' });
const q = (s) => JSON.stringify(s);

function main() {
	mkdirSync(inDir, { recursive: true });

	// 1. Newest .json in ./private
	const exports = readdirSync(inDir).filter((f) => f.toLowerCase().endsWith('.json'));
	if (exports.length === 0) {
		console.error(
			`\n✗ No export found. Drop your Google Timeline .json into ${inDir} and re-run.\n`,
		);
		process.exit(1);
	}
	const newest = exports
		.map((f) => ({ f, m: statSync(join(inDir, f)).mtimeMs }))
		.sort((a, b) => b.m - a.m)[0].f;
	const exportPath = join(inDir, newest);
	console.log(`→ Using ${newest}`);

	// 2. Offline datasets (first run only)
	if (!existsSync(join(root, 'packages/cli/data/cities.json'))) {
		console.log('→ Building offline datasets (first run, ~1 min)…');
		run('pnpm prep:data');
	}

	// 3. Aggregate → sanitized places.json + stats.json
	console.log('→ Aggregating…');
	run(`pnpm aggregate -- ${q(exportPath)} --out ${q(outDir)} --overrides overrides.json`);

	// 4. Publish aggregates (the site serves these from R2)
	console.log('→ Uploading aggregates to R2…');
	const put = (bucket, key, file, type = 'application/json') =>
		run(
			`npx --yes wrangler r2 object put ${q(`${bucket}/${key}`)} --file ${q(file)} --content-type ${type} --remote`,
		);
	put(DATA_BUCKET, 'places.json', join(outDir, 'places.json'));
	put(DATA_BUCKET, 'stats.json', join(outDir, 'stats.json'));

	// 5. Stash the raw export privately so the quarterly Action stays in sync
	console.log('→ Stashing raw export in the private bucket…');
	put(RAW_BUCKET, RAW_KEY, exportPath);

	console.log(
		'\n✓ Done. Live within ~5 minutes (edge cache) at https://waypoints.danmat.workers.dev\n',
	);
}

main();
