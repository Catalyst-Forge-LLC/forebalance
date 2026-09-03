import { sveltekit } from '@sveltejs/kit/vite';
import { localslipListen } from 'localslip/port';
import { defineConfig } from 'vite';
import vitePluginString from 'vite-plugin-string';

const listen = localslipListen('forebalance', 5174);

/** @type {import('vite').UserConfig} */
export default defineConfig({
	plugins: [
		vitePluginString({
			include: ['**/*.md'],
			compress: false,
		}),
		sveltekit(),
	],
	server: {
		host: listen.host,
		port: listen.port,
		strictPort: true,
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
	},
});
