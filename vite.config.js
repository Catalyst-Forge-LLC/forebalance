import { sveltekit } from '@sveltejs/kit/vite';
import vitePluginString from 'vite-plugin-string';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [
		vitePluginString({
			/* Default */
			include: [
			  '**/*.md'
			],
			compress: false
		}),
		sveltekit()
	],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
};

export default config;
