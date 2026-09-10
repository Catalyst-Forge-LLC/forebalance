import { describe, expect, it } from 'vitest';
import { chooseBackend, hasLanguageModelGlobal, hasWebGpu } from './detect';

describe('chooseBackend', () => {
	it('prefers Nano when Chrome can run it', () => {
		expect(chooseBackend('available', true)).toBe('nano');
		expect(chooseBackend('downloadable', false)).toBe('nano');
	});

	it('falls back to WebLLM when Nano is missing and WebGPU exists', () => {
		expect(chooseBackend('missing', true)).toBe('webllm');
		expect(chooseBackend('unavailable', true)).toBe('webllm');
	});

	it('returns none when neither engine can run', () => {
		expect(chooseBackend('missing', false)).toBe('none');
		expect(chooseBackend('unavailable', false)).toBe('none');
	});
});

describe('probes', () => {
	it('treats a missing LanguageModel global as false', () => {
		expect(hasLanguageModelGlobal({})).toBe(false);
		expect(hasLanguageModelGlobal({ LanguageModel: {} })).toBe(true);
	});

	it('treats a missing GPU as no WebGPU', () => {
		expect(hasWebGpu(undefined)).toBe(false);
	});
});
