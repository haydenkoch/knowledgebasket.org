import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export async function startDevServer(
	port: number,
	envOverrides: Record<string, string> = {}
): Promise<{
	baseUrl: string;
	process: ChildProcess;
	stop: () => Promise<void>;
}> {
	const baseUrl = `http://127.0.0.1:${port}`;
	const child = spawn(
		'pnpm',
		['exec', 'vite', 'dev', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
		{
			cwd: repoRoot,
			env: {
				...process.env,
				ORIGIN: baseUrl,
				...envOverrides
			},
			stdio: ['ignore', 'pipe', 'pipe']
		}
	);

	let output = '';
	child.stdout.on('data', (chunk) => {
		output += chunk.toString();
	});
	child.stderr.on('data', (chunk) => {
		output += chunk.toString();
	});

	const started = await waitForServer(baseUrl, child, () => output);
	if (!started) {
		throw new Error(`Dev server failed to start on ${baseUrl}\n${output}`);
	}

	return {
		baseUrl,
		process: child,
		stop: async () => {
			if (!child.killed) {
				child.kill('SIGTERM');
			}

			await Promise.race([
				new Promise<void>((resolve) => {
					child.once('exit', () => resolve());
				}),
				delay(5000).then(() => {
					if (!child.killed) child.kill('SIGKILL');
				})
			]);
		}
	};
}

async function waitForServer(
	baseUrl: string,
	child: ChildProcess,
	getOutput: () => string
): Promise<boolean> {
	const readinessUrl = `${baseUrl}/manifest.webmanifest`;

	for (let attempt = 0; attempt < 120; attempt += 1) {
		if (child.exitCode !== null) {
			return false;
		}

		try {
			const response = await fetch(readinessUrl, { redirect: 'manual' });
			if (response.status >= 200 && response.status < 500) {
				return true;
			}
		} catch {
			// Keep polling until the dev server is ready.
		}

		await delay(500);
	}

	throw new Error(`Timed out waiting for dev server\n${getOutput()}`);
}
