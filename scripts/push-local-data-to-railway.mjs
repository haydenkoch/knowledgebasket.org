#!/usr/bin/env node

import 'dotenv/config';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SITE_ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(SITE_ROOT, '..');
const COMPOSE_FILE = resolve(REPO_ROOT, 'docker-compose.yml');

const LOCAL_REQUIRED_ENV = [
	'DATABASE_URL',
	'MINIO_ENDPOINT',
	'MINIO_ACCESS_KEY',
	'MINIO_SECRET_KEY',
	'MINIO_BUCKET'
];

const PRODUCTION_OVERRIDE_ENV = [
	'PRODUCTION_DATABASE_URL',
	'PRODUCTION_MINIO_ENDPOINT',
	'PRODUCTION_MINIO_ACCESS_KEY',
	'PRODUCTION_MINIO_SECRET_KEY',
	'PRODUCTION_MINIO_BUCKET'
];

const DOCKER_PRODUCTION_PG_IMAGE = 'postgres:18-alpine';
const DOCKER_MC_IMAGE = 'minio/mc';
const LOCAL_MC_SOURCE_NAME = 'source';
const PRODUCTION_MC_SOURCE_NAME = 'target';

function printUsage() {
	console.log(`Push local Postgres + MinIO data into the linked Railway production service.

Usage:
  node scripts/push-local-data-to-railway.mjs [options]

Options:
  -s, --service <name>          Railway service name
  -e, --environment <name>      Railway environment name
  -p, --project <id>            Railway project ID
      --backup-dir <path>       Directory for production backups
      --purge-remote            Delete remote objects missing from local MinIO
      --skip-prod-backups       Skip backing up production DB and bucket first
      --dry-run                 Validate config and print the migration plan only
      --yes                     Required to run the destructive database restore
  -h, --help                    Show this help

Production credentials can come from either:
  1. Railway CLI via \`railway run --no-local\`
  2. Direct env vars:
     PRODUCTION_DATABASE_URL
     PRODUCTION_MINIO_ENDPOINT
     PRODUCTION_MINIO_ACCESS_KEY
     PRODUCTION_MINIO_SECRET_KEY
     PRODUCTION_MINIO_BUCKET
`);
}

function parseArgs(argv) {
	const options = {
		dryRun: false,
		yes: false,
		purgeRemote: false,
		skipProdBackups: false,
		backupDir: null,
		service: null,
		environment: null,
		project: null
	};

	function nextValue(flag) {
		const value = argv[index + 1];
		if (!value || value.startsWith('-')) {
			throw new Error(`Missing value for ${flag}`);
		}
		return value;
	}

	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index];

		switch (argument) {
			case '-h':
			case '--help':
				printUsage();
				process.exit(0);
			case '--dry-run':
				options.dryRun = true;
				break;
			case '--yes':
				options.yes = true;
				break;
			case '--purge-remote':
				options.purgeRemote = true;
				break;
			case '--skip-prod-backups':
				options.skipProdBackups = true;
				break;
			case '--backup-dir':
				options.backupDir = nextValue(argument);
				index += 1;
				break;
			case '-s':
			case '--service':
				options.service = nextValue(argument);
				index += 1;
				break;
			case '-e':
			case '--environment':
				options.environment = nextValue(argument);
				index += 1;
				break;
			case '-p':
			case '--project':
				options.project = nextValue(argument);
				index += 1;
				break;
			default:
				if (argument.startsWith('-')) {
					throw new Error(`Unknown option: ${argument}`);
				}
				throw new Error(`Unexpected argument: ${argument}`);
		}
	}

	return options;
}

function normalizeEndpoint(endpoint) {
	return endpoint.replace(/\/+$/, '');
}

function shellQuote(value) {
	return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function maskConnectionString(connectionString) {
	try {
		const url = new URL(connectionString);
		const auth = url.username ? '***@' : '';
		const port = url.port ? `:${url.port}` : '';
		const pathname = url.pathname || '';
		return `${url.protocol}//${auth}${url.hostname}${port}${pathname}`;
	} catch {
		return '[redacted]';
	}
}

function requireLocalConfig() {
	for (const key of LOCAL_REQUIRED_ENV) {
		if (!process.env[key]) {
			throw new Error(`Missing required local env var: ${key}`);
		}
	}

	return {
		databaseUrl: process.env.DATABASE_URL,
		minioEndpoint: normalizeEndpoint(process.env.MINIO_ENDPOINT),
		minioAccessKey: process.env.MINIO_ACCESS_KEY,
		minioSecretKey: process.env.MINIO_SECRET_KEY,
		minioBucket: process.env.MINIO_BUCKET
	};
}

function readProductionOverrideConfig() {
	const present = PRODUCTION_OVERRIDE_ENV.filter((key) => process.env[key]);
	if (present.length === 0) return null;

	if (present.length !== PRODUCTION_OVERRIDE_ENV.length) {
		throw new Error(
			`Found only some production override env vars (${present.join(', ')}). Set all ${PRODUCTION_OVERRIDE_ENV.length} or none.`
		);
	}

	return {
		databaseUrl: process.env.PRODUCTION_DATABASE_URL,
		minioEndpoint: normalizeEndpoint(process.env.PRODUCTION_MINIO_ENDPOINT),
		minioAccessKey: process.env.PRODUCTION_MINIO_ACCESS_KEY,
		minioSecretKey: process.env.PRODUCTION_MINIO_SECRET_KEY,
		minioBucket: process.env.PRODUCTION_MINIO_BUCKET,
		source: 'env'
	};
}

function buildRailwayArgs(options) {
	const args = ['run', '--no-local'];
	if (options.service) args.push('--service', options.service);
	if (options.environment) args.push('--environment', options.environment);
	if (options.project) args.push('--project', options.project);
	return args;
}

function minimalRailwayEnv() {
	const env = {};

	for (const key of ['PATH', 'HOME', 'SHELL', 'TERM', 'TMPDIR']) {
		if (process.env[key]) env[key] = process.env[key];
	}

	return env;
}

function runCommand(
	command,
	args,
	{ cwd = SITE_ROOT, env = process.env, input = null, quiet = false } = {}
) {
	return new Promise((resolvePromise, rejectPromise) => {
		const child = spawn(command, args, {
			cwd,
			env,
			stdio: ['pipe', quiet ? 'pipe' : 'inherit', 'pipe']
		});

		let stderr = '';
		let stdout = '';

		child.on('error', rejectPromise);

		if (child.stdout) {
			child.stdout.on('data', (chunk) => {
				const text = chunk.toString();
				stdout += text;
				if (!quiet) process.stdout.write(text);
			});
		}

		if (child.stderr) {
			child.stderr.on('data', (chunk) => {
				const text = chunk.toString();
				stderr += text;
				process.stderr.write(text);
			});
		}

		if (input) {
			child.stdin.write(input);
		}
		child.stdin.end();

		child.on('close', (code) => {
			if (code === 0) {
				resolvePromise({ stdout, stderr });
				return;
			}

			rejectPromise(
				new Error(
					`${command} ${args.join(' ')} failed with exit code ${code}${stderr ? `\n${stderr}` : ''}`
				)
			);
		});
	});
}

async function fetchProductionConfigFromRailway(options) {
	const railwayArgs = buildRailwayArgs(options);
	const inlineScript =
		'console.log(JSON.stringify({DATABASE_URL:process.env.DATABASE_URL??null,DATABASE_PUBLIC_URL:process.env.DATABASE_PUBLIC_URL??null,MINIO_ENDPOINT:process.env.MINIO_ENDPOINT??null,MINIO_ACCESS_KEY:process.env.MINIO_ACCESS_KEY??null,MINIO_SECRET_KEY:process.env.MINIO_SECRET_KEY??null,MINIO_BUCKET:process.env.MINIO_BUCKET??null}))';

	let stdout;
	try {
		({ stdout } = await runCommand('railway', [...railwayArgs, 'node', '-e', inlineScript], {
			cwd: SITE_ROOT,
			env: minimalRailwayEnv(),
			quiet: true
		}));
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (
			message.includes('Unauthorized') ||
			message.includes('railway login') ||
			message.includes('invalid_grant')
		) {
			throw new Error(
				'Railway auth is not available here. Run `railway login --browserless` and retry, or provide PRODUCTION_DATABASE_URL / PRODUCTION_MINIO_* overrides directly.'
			);
		}

		throw error;
	}

	const lines = stdout
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
	const jsonLine = lines.at(-1);

	if (!jsonLine) {
		throw new Error('Railway did not return any environment payload.');
	}

	let parsed;
	try {
		parsed = JSON.parse(jsonLine);
	} catch {
		throw new Error(`Failed to parse Railway environment payload: ${jsonLine}`);
	}

	const databaseUrl = parsed.DATABASE_PUBLIC_URL || parsed.DATABASE_URL;
	const minioEndpoint = parsed.MINIO_ENDPOINT;
	const minioAccessKey = parsed.MINIO_ACCESS_KEY;
	const minioSecretKey = parsed.MINIO_SECRET_KEY;
	const minioBucket = parsed.MINIO_BUCKET;

	if (!databaseUrl || !minioEndpoint || !minioAccessKey || !minioSecretKey || !minioBucket) {
		throw new Error(
			'Railway environment is missing one or more required production vars: DATABASE_URL, MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET'
		);
	}

	return {
		databaseUrl,
		minioEndpoint: normalizeEndpoint(minioEndpoint),
		minioAccessKey,
		minioSecretKey,
		minioBucket,
		source: 'railway'
	};
}

async function ensureBackupDirectory(requestedPath) {
	if (requestedPath) {
		const resolved = resolve(requestedPath);
		await mkdir(resolved, { recursive: true });
		return resolved;
	}

	return mkdtemp(join(tmpdir(), 'kb-railway-push-'));
}

async function backupProductionDatabase(production, backupDir) {
	const outputPath = join(backupDir, 'production-before.sql');
	console.log(`Backing up production database -> ${outputPath}`);
	await runCommand(
		'docker',
		[
			'run',
			'--rm',
			'-e',
			`DATABASE_URL=${production.databaseUrl}`,
			'-v',
			`${backupDir}:/backup`,
			DOCKER_PRODUCTION_PG_IMAGE,
			'sh',
			'-lc',
			'pg_dump "$DATABASE_URL" --no-owner --no-privileges > /backup/production-before.sql'
		],
		{ cwd: SITE_ROOT }
	);
}

async function backupProductionBucket(production, backupDir) {
	const backupPath = join(backupDir, 'production-bucket-before');
	await mkdir(backupPath, { recursive: true });
	console.log(`Backing up production bucket -> ${backupPath}`);

	const productionEndpoint = shellQuote(production.minioEndpoint);
	const productionAccessKey = shellQuote(production.minioAccessKey);
	const productionSecretKey = shellQuote(production.minioSecretKey);
	const productionBucket = shellQuote(`${PRODUCTION_MC_SOURCE_NAME}/${production.minioBucket}`);

	await runCommand(
		'docker',
		[
			'run',
			'--rm',
			'--entrypoint',
			'/bin/sh',
			'-v',
			`${backupPath}:/backup`,
			DOCKER_MC_IMAGE,
			'-lc',
			[
				`mc alias set ${PRODUCTION_MC_SOURCE_NAME} ${productionEndpoint} ${productionAccessKey} ${productionSecretKey} >/dev/null`,
				`if mc ls ${productionBucket} >/dev/null 2>&1; then mc mirror ${productionBucket} /backup; else echo "Production bucket ${production.minioBucket} does not exist yet; skipping bucket backup."; fi`
			].join(' && ')
		],
		{ cwd: SITE_ROOT }
	);
}

async function restoreLocalDatabaseToProduction(production) {
	console.log('Restoring local Postgres into production...');

	return new Promise((resolvePromise, rejectPromise) => {
		const dump = spawn(
			'docker',
			[
				'compose',
				'-f',
				COMPOSE_FILE,
				'exec',
				'-T',
				'postgres',
				'pg_dump',
				'-U',
				'kb',
				'-d',
				'kb',
				'--clean',
				'--if-exists',
				'--no-owner',
				'--no-privileges'
			],
			{ cwd: SITE_ROOT, stdio: ['ignore', 'pipe', 'pipe'] }
		);

		const restore = spawn(
			'docker',
			[
				'run',
				'--rm',
				'-i',
				'-e',
				`DATABASE_URL=${production.databaseUrl}`,
				DOCKER_PRODUCTION_PG_IMAGE,
				'sh',
				'-lc',
				'psql "$DATABASE_URL" -v ON_ERROR_STOP=1'
			],
			{ cwd: SITE_ROOT, stdio: ['pipe', 'inherit', 'pipe'] }
		);

		let dumpStderr = '';
		let restoreStderr = '';

		dump.stdout.pipe(restore.stdin);

		dump.stderr.on('data', (chunk) => {
			const text = chunk.toString();
			dumpStderr += text;
			process.stderr.write(text);
		});

		restore.stderr.on('data', (chunk) => {
			const text = chunk.toString();
			restoreStderr += text;
			process.stderr.write(text);
		});

		dump.on('error', rejectPromise);
		restore.on('error', rejectPromise);

		let dumpCode = null;
		let restoreCode = null;

		function finishIfDone() {
			if (dumpCode === null || restoreCode === null) return;

			if (dumpCode !== 0) {
				rejectPromise(
					new Error(
						`Local pg_dump failed with exit code ${dumpCode}${dumpStderr ? `\n${dumpStderr}` : ''}`
					)
				);
				return;
			}

			if (restoreCode !== 0) {
				rejectPromise(
					new Error(
						`Production restore failed with exit code ${restoreCode}${restoreStderr ? `\n${restoreStderr}` : ''}`
					)
				);
				return;
			}

			resolvePromise();
		}

		dump.on('close', (code) => {
			dumpCode = code;
			finishIfDone();
		});

		restore.on('close', (code) => {
			restoreCode = code;
			finishIfDone();
		});
	});
}

async function syncLocalBucketToProduction(local, production, { purgeRemote }) {
	const mirrorArgs = purgeRemote ? 'mc mirror --overwrite --remove' : 'mc mirror --overwrite';
	console.log(
		`${purgeRemote ? 'Mirroring and pruning' : 'Mirroring'} local MinIO bucket into production...`
	);

	const localEndpoint = shellQuote(
		local.minioEndpoint.replace('localhost', 'host.docker.internal')
	);
	const localAccessKey = shellQuote(local.minioAccessKey);
	const localSecretKey = shellQuote(local.minioSecretKey);
	const productionEndpoint = shellQuote(production.minioEndpoint);
	const productionAccessKey = shellQuote(production.minioAccessKey);
	const productionSecretKey = shellQuote(production.minioSecretKey);
	const localBucket = shellQuote(`${LOCAL_MC_SOURCE_NAME}/${local.minioBucket}`);
	const productionBucket = shellQuote(`${PRODUCTION_MC_SOURCE_NAME}/${production.minioBucket}`);

	await runCommand(
		'docker',
		[
			'run',
			'--rm',
			'--entrypoint',
			'/bin/sh',
			DOCKER_MC_IMAGE,
			'-lc',
			[
				`mc alias set ${LOCAL_MC_SOURCE_NAME} ${localEndpoint} ${localAccessKey} ${localSecretKey} >/dev/null`,
				`mc alias set ${PRODUCTION_MC_SOURCE_NAME} ${productionEndpoint} ${productionAccessKey} ${productionSecretKey} >/dev/null`,
				`mc mb --ignore-existing ${productionBucket} >/dev/null`,
				`${mirrorArgs} ${localBucket} ${productionBucket}`
			].join(' && ')
		],
		{ cwd: SITE_ROOT }
	);
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	const local = requireLocalConfig();
	const production =
		readProductionOverrideConfig() ?? (await fetchProductionConfigFromRailway(options));
	const backupDir = await ensureBackupDirectory(options.backupDir);

	console.log('Prepared migration plan:');
	console.log(`- Local database: ${maskConnectionString(local.databaseUrl)}`);
	console.log(`- Production database: ${maskConnectionString(production.databaseUrl)}`);
	console.log(`- Local bucket: ${local.minioBucket} @ ${local.minioEndpoint}`);
	console.log(`- Production bucket: ${production.minioBucket} @ ${production.minioEndpoint}`);
	console.log(`- Production config source: ${production.source}`);
	console.log(`- Backup directory: ${backupDir}`);
	console.log(
		`- Object sync mode: ${options.purgeRemote ? 'mirror with delete' : 'mirror without delete'}`
	);

	if (options.dryRun) {
		console.log('Dry run complete. No data was changed.');
		return;
	}

	if (!options.yes) {
		throw new Error('Refusing to replace production data without --yes.');
	}

	if (!options.skipProdBackups) {
		await backupProductionDatabase(production, backupDir);
		await backupProductionBucket(production, backupDir);
	} else {
		console.log('Skipping production backups by request.');
	}

	await restoreLocalDatabaseToProduction(production);
	await syncLocalBucketToProduction(local, production, { purgeRemote: options.purgeRemote });

	console.log('\nPush complete.');
	console.log(`Production backups are in: ${backupDir}`);
	console.log(
		'Next step: trigger a production reindex so Meilisearch matches the restored Postgres data.'
	);
}

main().catch((error) => {
	console.error(`\nMigration failed: ${error.message}`);
	process.exit(1);
});
