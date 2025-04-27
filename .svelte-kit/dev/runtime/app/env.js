export { prerendering } from '../env.js';

/**
 * @type {import('$app/environment').browser}
 */
const browser = !import.meta.env.SSR;
/**
 * @type {import('$app/environment').dev}
 */
const dev = !!import.meta.env.DEV;
/**
 * @type {import('$app/environment').mode}
 */
const mode = import.meta.env.MODE;
/**
 * @type {import('$app/environment').amp}
 */
const amp = !!import.meta.env.VITE_SVELTEKIT_AMP;

export { amp, browser, dev, mode };
