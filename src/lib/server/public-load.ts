type PublicLoadResult<T> = {
	data: T;
	unavailable: boolean;
};

function summarizeError(err: unknown): string {
	if (err instanceof Error) {
		const errWithCode = err as Error & { code?: unknown };
		const code = typeof errWithCode.code === 'string' ? errWithCode.code : undefined;
		const causeCode =
			err.cause &&
			typeof err.cause === 'object' &&
			typeof (err.cause as { code?: unknown }).code === 'string'
				? (err.cause as { code: string }).code
				: undefined;
		return [code ?? causeCode, err.message].filter(Boolean).join(' ');
	}

	return String(err);
}

export async function withPublicDataFallback<T>(
	label: string,
	load: () => Promise<T>,
	fallback: T
): Promise<PublicLoadResult<T>> {
	try {
		return {
			data: await load(),
			unavailable: false
		};
	} catch (err) {
		console.warn(`[public-data] ${label} unavailable: ${summarizeError(err)}`);
		return {
			data: fallback,
			unavailable: true
		};
	}
}
