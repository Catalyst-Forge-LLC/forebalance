import type { MLCEngineInterface } from '@mlc-ai/web-llm';
import type { LabsBackend } from './detect';

export const WEBLLM_MODEL_ID = 'Qwen3-1.7B-q4f16_1-MLC';

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

async function createWebllmSession(onProgress: LabsProgress): Promise<LabsSession> {
	const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm');
	const worker = new Worker(new URL('./webllm.worker.ts', import.meta.url), { type: 'module' });
	let engine: MLCEngineInterface;
	try {
		engine = await CreateWebWorkerMLCEngine(worker, WEBLLM_MODEL_ID, {
			initProgressCallback: (report) => {
				onProgress(Math.round((report.progress ?? 0) * 100), report.text);
			},
		});
	} catch (error) {
		worker.terminate();
		throw error;
	}
	onProgress(100, 'Qwen3 1.7B ready');
	return {
		backend: 'webllm',
		label: 'Qwen3 1.7B (WebLLM)',
		async prompt(system, user, options) {
			const reply = await engine.chat.completions.create({
				messages: [
					{ role: 'system', content: system },
					{ role: 'user', content: user },
				],
				max_tokens: options?.maxTokens ?? 320,
				extra_body: { enable_thinking: options?.think === true },
			});
			return (reply.choices[0]?.message?.content ?? '').trim();
		},
		destroy() {
			void engine.unload();
			worker.terminate();
		},
	};
}
