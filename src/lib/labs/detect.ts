export type LabsBackend = 'nano' | 'webllm' | 'none';

export type NanoStatus =
	| 'missing'
	| 'unavailable'
	| 'downloadable'
	| 'downloading'
	| 'available';

export function hasWebGpu(
	gpu: GPU | undefined = typeof navigator !== 'undefined' ? navigator.gpu : undefined,
): boolean {
	return !!gpu;
}

export function hasLanguageModelGlobal(g: object = globalThis): boolean {
	return 'LanguageModel' in g;
}

/** Prefer Chrome Nano when the API can run; otherwise WebLLM if WebGPU exists. */
export function chooseBackend(nano: NanoStatus, webgpu: boolean): LabsBackend {
	if (nano === 'available' || nano === 'downloadable' || nano === 'downloading') {
		return 'nano';
	}
	if (webgpu) return 'webllm';
	return 'none';
}

export async function probeNano(): Promise<NanoStatus> {
	if (!hasLanguageModelGlobal()) return 'missing';
	try {
		const status = await (
			globalThis as unknown as { LanguageModel: { availability: () => Promise<string> } }
		).LanguageModel.availability();
		if (
			status === 'available' ||
			status === 'downloadable' ||
			status === 'downloading' ||
			status === 'unavailable'
		) {
			return status;
		}
		return 'unavailable';
	} catch {
		return 'unavailable';
	}
}
