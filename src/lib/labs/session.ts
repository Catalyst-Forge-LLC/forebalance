import type { LabsBackend } from './detect';

export { WEBLLM_MODEL_ID } from './models';

export type LabsProgress = (percent: number, text: string) => void;

export interface LabsPromptOptions {
	/** Qwen3 thinking. Leave off — drafts burn the token budget on homework. */
	think?: boolean;
	maxTokens?: number;
}

export interface LabsSession {
	backend: Exclude<LabsBackend, 'none'>;
	label: string;
	prompt(system: string, user: string, options?: LabsPromptOptions): Promise<string>;
	destroy(): void;
}

export async function createLabsSession(
	backend: Exclude<LabsBackend, 'none'>,
	onProgress: LabsProgress = () => {},
): Promise<LabsSession> {
	if (backend === 'nano') {
		return createNanoSession(onProgress);
	}
	const { createWebllmSession } = await import('./webllmSession');
	return createWebllmSession(onProgress);
}

async function createNanoSession(onProgress: LabsProgress): Promise<LabsSession> {
	if (typeof LanguageModel === 'undefined') {
		throw new Error('Chrome Prompt API is not in this browser.');
	}
	const session = await LanguageModel.create({
		monitor(monitor) {
			monitor.addEventListener('downloadprogress', (event) => {
				onProgress(Math.round((event.loaded ?? 0) * 100), 'Loading Gemini Nano…');
			});
		},
	});
	onProgress(100, 'Nano ready');
	return {
		backend: 'nano',
		label: 'Gemini Nano (Chrome)',
		async prompt(system, user) {
			return (await session.prompt(`${system}\n\n${user}`)).trim();
		},
		destroy() {
			session.destroy();
		},
	};
}

