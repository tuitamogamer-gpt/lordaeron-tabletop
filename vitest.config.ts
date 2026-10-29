import { defineConfig } from 'vitest/config';

export default defineConfig({
 // Whole-table renders and asset scans run synchronously; on a loaded machine they can pass the 5 s default.
 test: { include: ['tests/**/*.{test,spec}.{ts,tsx}'], testTimeout: 20000 },
});
