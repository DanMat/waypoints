import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App.js';

describe('App', () => {
	it('renders the service name', () => {
		render(<App />);
		expect(screen.getByRole('heading', { name: 'waypoints' })).toBeDefined();
	});
});
