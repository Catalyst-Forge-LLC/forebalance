import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */

const config = {
  kit: {
    prerender: {
      handleHttpError: ({ path, message }) => {
        if (path === '/favicon.ico' || /^\/logo-\d+\.png$/.test(path)) {
          return;
        }
        throw new Error(message);
      },
      handleMissingId: 'ignore',
    },
    adapter: adapter({
      // default options are shown. On some platforms
      // these options are set automatically — see below
      pages: 'build',
      assets: 'build',
      fallback: undefined,
      precompress: false,
      strict: false,
    }),
  },
  preprocess: vitePreprocess(),
};

export default config;
