import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== 'function') {
    Object.defineProperty(globalThis, 'crypto', {
        value: webcrypto
    });
}
export default defineConfig({
    plugins: [react()],
    clearScreen: false,
    server: {
        port: 1420,
        strictPort: true,
        host: '127.0.0.1'
    },
    preview: {
        port: 1420,
        strictPort: true,
        host: '127.0.0.1'
    },
    test: {
        include: ['src/**/*.test.ts'],
        environment: 'jsdom'
    }
});
