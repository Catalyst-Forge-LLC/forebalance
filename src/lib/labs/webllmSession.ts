import type { MLCEngineInterface } from '@mlc-ai/web-llm';
import { WEBLLM_MODEL_ID } from './models';
import type { LabsProgress, LabsSession } from './session';

/** Loaded only when the user clicks Load on the Qwen / WebLLM engine. */
export async function createWebllmSession(onProgress: LabsProgress): Promise<LabsSession> {
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
