/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
	plugins: [react()],
	// Same-origin /api in dev as in production, so no CORS and no base URL
	// juggling between environments.
	server: { proxy: { '/api': 'http://localhost:3000' } },
	test: { environment: 'jsdom' },
});
