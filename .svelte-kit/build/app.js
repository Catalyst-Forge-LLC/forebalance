import { respond } from '@sveltejs/kit/ssr';
import root from './generated/root.svelte';
import { set_paths, assets } from './runtime/paths.js';
import { set_prerendering } from './runtime/env.js';
import * as user_hooks from "./hooks.js";

const template = ({ head, body }) => "<!DOCTYPE html>\n<html lang=\"en\">\n\t<head>\n\t\t<meta charset=\"utf-8\" />\n\t\t<meta name=\"theme-color\" content=\"#009900\">\n\t\t<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n\n\t\t<link rel=\"stylesheet\" href=\"bootstrap-reboot.min.css\">\n\t\t<link rel=\"icon\" href=\"/favicon.ico\" />\n\t\t<link rel=\"manifest\" href=\"manifest.json\" crossorigin=\"use-credentials\">\n\n\t\t<script>\n\t\t\t// Force HTTPS\n\t\t\tlet address = window.location.href;\n\t\t\tif (address.startsWith('http:') && !address.includes('://localhost')) {\n\t\t\t\twindow.location = address.replace(/^http/, 'https') + '?cb=' + (new Date()).getTime();\n\t\t\t}\n\t\t</script>\n\n\t\t<style>\n\t\t\t#svelte {\n\t\t\t\tdisplay: flex;\n\t\t\t\tflex-direction: column;\n\t\t\t\theight: 100vh;\n\t\t\t}\n\t\t</style>\n\t\n\t\t<script src=\"dayjs.min.js\"></script>\n\n\t\t" + head + "\n\t</head>\n\t<body>\n\t\t<div id=\"svelte\">" + body + "</div>\n\t</body>\n</html>\n";

let options = null;

const default_settings = { paths: {"base":"","assets":""} };

// allow paths to be overridden in svelte-kit preview
// and in prerendering
export function init(settings = default_settings) {
	set_paths(settings.paths);
	set_prerendering(settings.prerendering || false);

	const hooks = get_hooks(user_hooks);

	options = {
		amp: false,
		dev: false,
		entry: {
			file: assets + "/_app/start-e5a966b3.js",
			css: [assets + "/_app/assets/start-61d1577b.css",assets + "/_app/assets/vendor-ff184c56.css"],
			js: [assets + "/_app/start-e5a966b3.js",assets + "/_app/chunks/vendor-27ccefdb.js"]
		},
		fetched: undefined,
		floc: false,
		get_component_path: id => assets + "/_app/" + entry_lookup[id],
		get_stack: error => String(error), // for security
		handle_error: (error, request) => {
			hooks.handleError({ error, request });
			error.stack = options.get_stack(error);
		},
		hooks,
		hydrate: true,
		initiator: undefined,
		load_component,
		manifest,
		paths: settings.paths,
		prerender: true,
		read: settings.read,
		root,
		service_worker: null,
		router: true,
		ssr: true,
		target: "#svelte",
		template,
		trailing_slash: "never"
	};
}

// input has already been decoded by decodeURI
// now handle the rest that decodeURIComponent would do
const d = s => s
	.replace(/%23/g, '#')
	.replace(/%3[Bb]/g, ';')
	.replace(/%2[Cc]/g, ',')
	.replace(/%2[Ff]/g, '/')
	.replace(/%3[Ff]/g, '?')
	.replace(/%3[Aa]/g, ':')
	.replace(/%40/g, '@')
	.replace(/%26/g, '&')
	.replace(/%3[Dd]/g, '=')
	.replace(/%2[Bb]/g, '+')
	.replace(/%24/g, '$');

const empty = () => ({});

const manifest = {
	assets: [{"file":"bootstrap-reboot.min.css","size":4769,"type":"text/css"},{"file":"dayjs.min.js","size":6571,"type":"application/javascript"},{"file":"global.css","size":9570,"type":"text/css"},{"file":"manifest.json","size":340,"type":"application/json"},{"file":"md/help.md","size":2758,"type":"text/markdown"},{"file":"md/welcome.md","size":851,"type":"text/markdown"}],
	layout: "src/routes/__layout.svelte",
	error: ".svelte-kit/build/components/error.svelte",
	routes: [
		{
						type: 'page',
						pattern: /^\/$/,
						params: empty,
						a: ["src/routes/__layout.svelte", "src/routes/index.svelte"],
						b: [".svelte-kit/build/components/error.svelte"]
					},
		{
						type: 'page',
						pattern: /^\/about\/?$/,
						params: empty,
						a: ["src/routes/__layout.svelte", "src/routes/about.svelte"],
						b: [".svelte-kit/build/components/error.svelte"]
					}
	]
};

// this looks redundant, but the indirection allows us to access
// named imports without triggering Rollup's missing import detection
const get_hooks = hooks => ({
	getSession: hooks.getSession || (() => ({})),
	handle: hooks.handle || (({ request, resolve }) => resolve(request)),
	handleError: hooks.handleError || (({ error }) => console.error(error.stack)),
	externalFetch: hooks.externalFetch || fetch
});

const module_lookup = {
	"src/routes/__layout.svelte": () => import("..\\..\\src\\routes\\__layout.svelte"),".svelte-kit/build/components/error.svelte": () => import("./components\\error.svelte"),"src/routes/index.svelte": () => import("..\\..\\src\\routes\\index.svelte"),"src/routes/about.svelte": () => import("..\\..\\src\\routes\\about.svelte")
};

const metadata_lookup = {"src/routes/__layout.svelte":{"entry":"pages/__layout.svelte-77d80619.js","css":["assets/pages/__layout.svelte-41dbe9df.css","assets/vendor-ff184c56.css"],"js":["pages/__layout.svelte-77d80619.js","chunks/vendor-27ccefdb.js"],"styles":[]},".svelte-kit/build/components/error.svelte":{"entry":"error.svelte-0fd9e526.js","css":["assets/vendor-ff184c56.css"],"js":["error.svelte-0fd9e526.js","chunks/vendor-27ccefdb.js"],"styles":[]},"src/routes/index.svelte":{"entry":"pages/index.svelte-3cbb8682.js","css":["assets/pages/index.svelte-09def4f7.css","assets/vendor-ff184c56.css"],"js":["pages/index.svelte-3cbb8682.js","chunks/vendor-27ccefdb.js"],"styles":[]},"src/routes/about.svelte":{"entry":"pages/about.svelte-13efa8a9.js","css":["assets/vendor-ff184c56.css"],"js":["pages/about.svelte-13efa8a9.js","chunks/vendor-27ccefdb.js"],"styles":[]}};

async function load_component(file) {
	const { entry, css, js, styles } = metadata_lookup[file];
	return {
		module: await module_lookup[file](),
		entry: assets + "/_app/" + entry,
		css: css.map(dep => assets + "/_app/" + dep),
		js: js.map(dep => assets + "/_app/" + dep),
		styles
	};
}

export function render(request, {
	prerender
} = {}) {
	const host = request.headers["host"];
	return respond({ ...request, host }, options, { prerender });
}