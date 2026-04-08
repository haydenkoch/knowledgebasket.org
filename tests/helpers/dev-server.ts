import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const host = '127.0.0.1';

type ServerCommand = {
	command: string;
	args: string[];
};

function getPnpmExecutable() {
	return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

function getServerCommand(port: number): ServerCommand {
	if (process.env.CI_USE_BUILD_OUTPUT === '1') {
		const buildEntry = path.join(repoRoot, 'build', 'index.js');
		if (!existsSync(buildEntry)) {
			throw new Error(`CI build output is enabled, but ${buildEntry} does not exist.`);
		}

		return {
			command: process.execPath,
			args: [buildEntry]
		};
	}

	return {
		command: getPnpmExecutable(),
		args: ['exec', 'vite', 'dev', '--host', host, '--port', String(port), '--strictPort']
	};
}

export async function startDevServer(
	port: number,
	envOverrides: Record<string, string> = {}
): Promise<{
	baseUrl: string;
	process: ChildProcess;
	stop: () => Promise<void>;
}> {
	const assignedPort = await findAvailablePort(port);
	const baseUrl = `http://${host}:${assignedPort}`;
	const { command, args } = getServerCommand(assignedPort);
	const ciBuildEnv =
		process.env.CI_USE_BUILD_OUTPUT === '1'
			? {
					SKIP_PRODUCTION_RUNTIME_CONFIG_ASSERTION:
						process.env.SKIP_PRODUCTION_RUNTIME_CONFIG_ASSERTION ?? '1'
				}
			: {};
	const child = spawn(command, args, {
		cwd: repoRoot,
		env: {
			...process.env,
			...ciBuildEnv,
			HOST: host,
			PORT: String(assignedPort),
			ORIGIN: baseUrl,
			PUBLIC_ASSET_BASE_URL: `${baseUrl}/assets`,
			...envOverrides
		},
		stdio: ['ignore', 'pipe', 'pipe']
	});

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

async function findAvailablePort(preferredPort: number): Promise<number> {
	for (let offset = 0; offset < 20; offset += 1) {
		const candidate = preferredPort + offset;
		if (await isPortAvailable(candidate)) return candidate;
	}

	return await new Promise<number>((resolve, reject) => {
		const server = net.createServer();
		server.once('error', reject);
		server.listen(0, '127.0.0.1', () => {
			const address = server.address();
			if (!address || typeof address === 'string') {
				server.close();
				reject(new Error('Unable to determine an available port'));
				return;
			}

			server.close(() => resolve(address.port));
		});
	});
}

function isPortAvailable(port: number): Promise<boolean> {
	return new Promise((resolve) => {
		const server = net.createServer();
		server.once('error', () => resolve(false));
		server.listen(port, '127.0.0.1', () => {
			server.close(() => resolve(true));
		});
	});
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
