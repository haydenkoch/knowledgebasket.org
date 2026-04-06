import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
	inventoryToolboxResources,
	resolveToolboxResourcesDir,
	summarizeInventory
} from '../src/lib/server/toolbox-resource-library';

type CliOptions = {
	dir?: string;
	json: boolean;
	write?: string;
};

async function main() {
	const options = parseArgs(process.argv.slice(2));
	const resourcesDir = resolveToolboxResourcesDir({
		configuredPath: options.dir ?? process.env.KB_RESOURCES_PATH ?? null,
		cwd: process.cwd()
	});
	const { baseDir, items } = await inventoryToolboxResources(resourcesDir);
	const summary = summarizeInventory(items);

	const payload = {
		baseDir,
		generatedAt: new Date().toISOString(),
		summary,
		items
	};

	if (options.write) {
		const outputPath = resolve(options.write);
		await mkdir(dirname(outputPath), { recursive: true });
		await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
	}

	if (options.json) {
		process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
		return;
	}

	printSummary(payload);
}

function parseArgs(args: string[]): CliOptions {
	const options: CliOptions = {
		json: false
	};

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		if (arg === '--json') {
			options.json = true;
			continue;
		}
		if (arg === '--dir') {
			options.dir = args[index + 1];
			index += 1;
			continue;
		}
		if (arg === '--write') {
			options.write = args[index + 1];
			index += 1;
		}
	}

	return options;
}

function printSummary(payload: {
	baseDir: string;
	summary: ReturnType<typeof summarizeInventory>;
	items: Awaited<ReturnType<typeof inventoryToolboxResources>>['items'];
}) {
	const { baseDir, summary, items } = payload;
	const importable = items.filter((item) => item.importDecision === 'import');
	const review = items.filter((item) => item.importDecision === 'review');
	const skipped = items.filter((item) => item.importDecision === 'skip');

	process.stdout.write(`Toolbox resource inventory\n`);
	process.stdout.write(`Base directory: ${baseDir}\n\n`);
	process.stdout.write(`Counts\n`);
	process.stdout.write(`- Total files: ${summary.totalFiles}\n`);
	process.stdout.write(`- Import now: ${summary.importableCount}\n`);
	process.stdout.write(`- Review manually: ${summary.reviewCount}\n`);
	process.stdout.write(`- Skip: ${summary.skippedCount}\n\n`);

	process.stdout.write(`By extension\n`);
	for (const [extension, count] of Object.entries(summary.byExtension)) {
		process.stdout.write(`- ${extension}: ${count}\n`);
	}
	process.stdout.write(`\n`);

	process.stdout.write(`Importable documents\n`);
	for (const item of importable.slice(0, 20)) {
		process.stdout.write(
			`- ${item.relativePath} -> ${item.suggestedResourceType ?? 'Other'} | ${formatBytes(item.bytes)} | ${item.suggestedDownloadPath}\n`
		);
	}
	if (importable.length > 20) {
		process.stdout.write(`- ... ${importable.length - 20} more\n`);
	}
	process.stdout.write(`\n`);

	if (review.length > 0) {
		process.stdout.write(`Needs review\n`);
		for (const item of review.slice(0, 10)) {
			process.stdout.write(`- ${item.relativePath} -> ${item.reasons.join(' ')}\n`);
		}
		if (review.length > 10) {
			process.stdout.write(`- ... ${review.length - 10} more\n`);
		}
		process.stdout.write(`\n`);
	}

	process.stdout.write(`Skipped examples\n`);
	for (const item of skipped.slice(0, 10)) {
		process.stdout.write(`- ${item.relativePath} -> ${item.reasons.join(' ')}\n`);
	}
	if (skipped.length > 10) {
		process.stdout.write(`- ... ${skipped.length - 10} more\n`);
	}
}

function formatBytes(bytes: number) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
