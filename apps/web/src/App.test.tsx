import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App.js';

describe('App', () => {
	it('renders the title and totals once data loads (falls back to demo data)', async () => {
		render(<App />);
		expect(await screen.findByRole('heading', { name: 'Waypoints', level: 1 })).toBeDefined();
		// Demo data has 14 cities across 6 continents; the tiles should appear.
		expect(await screen.findByText('Continents')).toBeDefined();
		expect(await screen.findByText('Cities')).toBeDefined();
	});
});
