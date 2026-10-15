/// <reference types="vitest/config" />
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from '@sveltejs/adapter-static';
import { localslipListen } from 'localslip/port';
import { defineConfig } from 'vite';

const listen = localslipListen('forebalance', 46000);

export default defineConfig({
  plugins: [
    sveltekit({
      preprocess: vitePreprocess(),
      adapter: adapter({ pages: 'build', assets: 'build', fallback: undefined, precompress: false, strict: false }),
      prerender: {
        handleHttpError: ({ path, message }) => {
          if (path === '/favicon.ico' || /^\/logo-\d+\.png$/.test(path)) return;
          throw new Error(message);
        },
        handleMissingId: 'ignore',
      },
      // Keep background interval checks disabled; never force a reload during editing.
      version: { pollInterval: 0 },
    }),
  ],
  server: { host: listen.host, port: listen.port, strictPort: true },
  test: { include: ['src/**/*.{test,spec}.{js,ts}'], environment: 'node' },
});
