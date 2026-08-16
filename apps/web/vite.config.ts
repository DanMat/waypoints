/// <reference types="vitest" />

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [react()],
	// Same-origin /api in dev as in production, so no CORS and no base URL
	// juggling between environments. Point at `wrangler dev` (the Worker).
	server: { proxy: { '/api': 'http://localhost:8787' } },
	test: { environment: 'jsdom' },
});
