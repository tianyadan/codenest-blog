import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
// @ts-expect-error local .mjs plugin without package types
import { contentPlugin } from './scripts/vite-plugin-content.mjs';
export default defineConfig({
    plugins: [react(), contentPlugin()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './src/test/setup.ts'
    }
});
