import sveltePreprocess from 'svelte-preprocess';
import adapterStatic from '@sveltejs/adapter-static';
import vitePluginString from 'vite-plugin-string';

/** @type {import('@sveltejs/kit').Config} */

const pathsObj = {};

const config = {
	kit: {
		// By default, `npm run build` will create a standard Node app.
		// You can create optimized builds for different platforms by
		// specifying a different adapter
		// adapter: node(),
		adapter: adapterStatic(),
		files: {
			assets: 'static',
		},
		paths: pathsObj,
		vite: () => ({  plugins: [
			vitePluginString.default({
				/* Default */
				include: [
				  '**/*.md'
				],
				compress: false
			})
		]})
  },
	preprocess: sveltePreprocess()
};

export default config;
