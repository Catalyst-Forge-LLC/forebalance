import { describe, expect, it } from 'vitest';
import { docIdFromHash, tabIdFromHash } from './hashes';

describe('tabIdFromHash', () => {
	it('maps known tabs', () => {
		expect(tabIdFromHash('#entries')).toBe('entries');
		expect(tabIdFromHash('')).toBe('welcome');
	});

	it('leaves About and Privacy hashes for the site modal', () => {
		expect(tabIdFromHash('#about')).toBeNull();
		expect(tabIdFromHash('#privacy')).toBeNull();
	});

	it('sends unknown hashes to Help', () => {
		expect(tabIdFromHash('#nope')).toBe('help');
	});
});

describe('docIdFromHash', () => {
	it('recognizes About and Privacy', () => {
		expect(docIdFromHash('#about')).toBe('about');
		expect(docIdFromHash('#privacy')).toBe('privacy');
		expect(docIdFromHash('#help')).toBeNull();
	});
});
