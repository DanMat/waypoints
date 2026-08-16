/// <reference types="vitest" />

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [react()],
	// Same-origin /api in dev as in production, so no CORS and no base URL
	// juggling between environments.
	server: { proxy: { '/api': 'http://localhost:3000' } },
	test: { environment: 'jsdom' },
});
