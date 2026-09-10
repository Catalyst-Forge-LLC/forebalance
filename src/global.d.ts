/// <reference types="@sveltejs/kit" />
/// <reference types="svelte" />
/// <reference types="vite/client" />

interface LanguageModelMonitor extends EventTarget {
	addEventListener(
		type: 'downloadprogress',
		listener: (event: ProgressEvent) => void,
		options?: AddEventListenerOptions | boolean,
	): void;
}

interface LanguageModelSession {
	prompt(input: string): Promise<string>;
	destroy(): void;
}

interface LanguageModelFactory {
	availability(): Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'>;
	create(options?: {
		initialPrompts?: Array<{ role: string; content: string }>;
		monitor?: (monitor: LanguageModelMonitor) => void;
	}): Promise<LanguageModelSession>;
}

declare const LanguageModel: LanguageModelFactory;
