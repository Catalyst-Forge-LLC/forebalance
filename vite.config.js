/// <reference types="vitest/config" />
import { sveltekit } from '@sveltejs/kit/vite';
import { localslipListen } from 'localslip/port';
import { defineConfig } from 'vite';

const listen = localslipListen('forebalance', 46000);

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    host: listen.host,
    port: listen.port,
    strictPort: true,
  },
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    environment: 'node',
  },
});
