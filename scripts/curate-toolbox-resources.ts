import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

type CliOptions = {
	contextJson: string;
	json: boolean;
	writeJson?: string;
	writeMarkdown?: string;
};

type ContextKind =
	| 'resource-list'
	| 'toolkit-guide'
	| 'policy-legal'
	| 'research-report'
	| 'map-spatial'
	| 'historical-cultural'
	| 'image-asset'
	| 'web-snapshot'
	| 'other';

type ResourceContext = {
	relativePath: string;
	title: string;
	extension: string;
	importDecision: 'import' | 'review' | 'skip';
	suggestedCategory: string | null;
	suggestedResourceType: string | null;
	pages: number | null;
	contextKind: ContextKind;
	contextSignals: string[];
	textPreview: string | null;
	outboundLinks: string[];
	linkDomains: string[];
	emails: string[];
};

type CuratedResource = {
	relativePath: string;
	title: string;
	shelf: string;
	lane: 'core-library' | 'gateway-lists' | 'supplemental';
	priority: 'high' | 'medium';
	category: string | null;
	resourceType: string | null;
	contextKind: ContextKind;
	reasons: string[];
	outboundLinkCount: number;
};

type ExcludedResource = {
	relativePath: string;
	title: string;
	exclusionType: 'image-asset' | 'web-snapshot' | 'non-primary';
	reasons: string[];
};

async function main() {
	const options = parseArgs(process.argv.slice(2));
	const payload = JSON.parse(await readFile(resolve(options.contextJson), 'utf8')) as {
		baseDir: string;
		generatedAt: string;
		contexts: ResourceContext[];
	};

	const curated = curateResources(payload.contexts);
	const result = {
		baseDir: payload.baseDir,
		sourceGeneratedAt: payload.generatedAt,
		generatedAt: new Date().toISOString(),
		summary: summarizeCurated(curated.included, curated.excluded),
		included: curated.included,
		excluded: curated.excluded
	};

	if (options.writeJson) {
		const outputPath = resolve(options.writeJson);
		await mkdir(dirname(outputPath), { recursive: true });
		await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
	}

	if (options.writeMarkdown) {
		const outputPath = resolve(options.writeMarkdown);
		await mkdir(dirname(outputPath), { recursive: true });
		await writeFile(outputPath, renderMarkdown(result), 'utf8');
	}

	if (options.json) {
		process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
		return;
	}

	printSummary(result);
}

function parseArgs(args: string[]): CliOptions {
	const options: CliOptions = {
		contextJson: '/tmp/toolbox-resource-context.json',
		json: false
	};

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		if (arg === '--json') {
			options.json = true;
			continue;
		}
		if (arg === '--context-json') {
			options.contextJson = args[index + 1];
			index += 1;
			continue;
		}
		if (arg === '--write-json') {
			options.writeJson = args[index + 1];
			index += 1;
			continue;
		}
		if (arg === '--write-markdown') {
			options.writeMarkdown = args[index + 1];
			index += 1;
		}
	}

	return options;
}

function curateResources(contexts: ResourceContext[]) {
	const included: CuratedResource[] = [];
	const excluded: ExcludedResource[] = [];

	for (const context of contexts) {
		const exclusion = classifyExclusion(context);
		if (exclusion) {
			excluded.push(exclusion);
			continue;
		}

		included.push({
			relativePath: context.relativePath,
			title: context.title,
			shelf: inferShelf(context),
			lane: inferLane(context),
			priority: inferPriority(context),
			category: context.suggestedCategory,
			resourceType: context.suggestedResourceType,
			contextKind: context.contextKind,
			reasons: inferIncludeReasons(context),
			outboundLinkCount: context.outboundLinks.length
		});
	}

	return {
		included: included.sort(sortIncluded),
		excluded: excluded.sort((left, right) => left.relativePath.localeCompare(right.relativePath))
	};
}

function classifyExclusion(context: ResourceContext): ExcludedResource | null {
	if (context.importDecision === 'review' || context.contextKind === 'image-asset') {
		return {
			relativePath: context.relativePath,
			title: context.title,
			exclusionType: 'image-asset',
			reasons: [
				'Image asset should be handled as supporting media, not as a primary toolbox document.'
			]
		};
	}

	if (context.importDecision === 'skip' || context.extension === 'html') {
		return {
			relativePath: context.relativePath,
			title: context.title,
			exclusionType: 'web-snapshot',
			reasons: ['Saved web snapshot should not be ingested as a standalone library document.']
		};
	}

	return null;
}

function inferShelf(context: ResourceContext) {
	const path = context.relativePath.toLowerCase();
	const title = context.title.toLowerCase();

	if (title.includes('resource links') || title.includes('reading and resources')) {
		return 'Gateway Lists';
	}
	if (path.includes('emergency services') || title.includes('fire') || title.includes('climate')) {
		return 'Climate & Fire Resilience';
	}
	if (
		path.includes('land & water guardianship') ||
		title.includes('guardian') ||
		title.includes('water rights') ||
		title.includes('co-management') ||
		title.includes('mapping')
	) {
		return 'Land, Water & Guardianship';
	}
	if (
		path.includes('cultural regeneration') ||
		title.includes('food') ||
		title.includes('resilience')
	) {
		return 'Cultural Regeneration & Food Sovereignty';
	}
	if (
		path.includes('reconciliation & equity') ||
		title.includes('fpic') ||
		title.includes('genocide') ||
		title.includes('treaty') ||
		title.includes('laws and policies')
	) {
		return 'Reconciliation, FPIC & History';
	}
	if (
		path.includes('tribal management') ||
		path.includes('sovereignty immunity waivers') ||
		title.includes('business structure') ||
		title.includes('sovereign immunity')
	) {
		return 'Governance, Sovereignty & Tribal Management';
	}
	if (path.includes('indigenous women')) {
		return 'Gateway Lists';
	}
	return 'General Reference';
}

function inferLane(context: ResourceContext): CuratedResource['lane'] {
	const title = context.title.toLowerCase();
	if (context.contextKind === 'resource-list' || title.includes('reading and resources')) {
		return 'gateway-lists';
	}
	if (
		context.contextKind === 'other' &&
		context.outboundLinks.length === 0 &&
		(context.pages ?? 0) < 8
	) {
		return 'supplemental';
	}
	return 'core-library';
}

function inferPriority(context: ResourceContext): CuratedResource['priority'] {
	if (
		context.contextKind === 'toolkit-guide' ||
		context.contextKind === 'policy-legal' ||
		context.contextKind === 'research-report'
	) {
		return 'high';
	}
	if (context.contextKind === 'resource-list' && context.outboundLinks.length >= 10) {
		return 'high';
	}
	return 'medium';
}

function inferIncludeReasons(context: ResourceContext) {
	const reasons: string[] = [];
	if (context.contextKind === 'resource-list') {
		reasons.push('Curated gateway document with many outbound references.');
	}
	if (context.contextKind === 'toolkit-guide') {
		reasons.push('Practical toolkit or handbook with reusable guidance.');
	}
	if (context.contextKind === 'policy-legal') {
		reasons.push('Policy, law, rights, or governance reference.');
	}
	if (context.contextKind === 'research-report') {
		reasons.push('Substantive report or research context.');
	}
	if (context.contextKind === 'historical-cultural') {
		reasons.push('Historical or cultural grounding material.');
	}
	if (context.contextKind === 'map-spatial') {
		reasons.push('Map, spatial, or place-based planning context.');
	}
	if (context.outboundLinks.length > 0) {
		reasons.push(
			`Contains ${context.outboundLinks.length} outbound links worth preserving as extracted references.`
		);
	}
	if (reasons.length === 0) {
		reasons.push('Useful reference material that fits the library scope.');
	}
	return reasons;
}

function summarizeCurated(included: CuratedResource[], excluded: ExcludedResource[]) {
	const byShelf: Record<string, number> = {};
	const byLane: Record<string, number> = {};
	const byPriority: Record<string, number> = {};
	const byExclusion: Record<string, number> = {};

	for (const resource of included) {
		byShelf[resource.shelf] = (byShelf[resource.shelf] ?? 0) + 1;
		byLane[resource.lane] = (byLane[resource.lane] ?? 0) + 1;
		byPriority[resource.priority] = (byPriority[resource.priority] ?? 0) + 1;
	}

	for (const resource of excluded) {
		byExclusion[resource.exclusionType] = (byExclusion[resource.exclusionType] ?? 0) + 1;
	}

	return {
		includedCount: included.length,
		excludedCount: excluded.length,
		byShelf: sortRecord(byShelf),
		byLane: sortRecord(byLane),
		byPriority: sortRecord(byPriority),
		byExclusion: sortRecord(byExclusion)
	};
}

function renderMarkdown(result: {
	baseDir: string;
	sourceGeneratedAt: string;
	generatedAt: string;
	summary: ReturnType<typeof summarizeCurated>;
	included: CuratedResource[];
	excluded: ExcludedResource[];
}) {
	const lines: string[] = [];
	lines.push('# Toolbox Resource Curation Report');
	lines.push('');
	lines.push(`- Base directory: ${result.baseDir}`);
	lines.push(`- Source context generated: ${result.sourceGeneratedAt}`);
	lines.push(`- Curated at: ${result.generatedAt}`);
	lines.push(`- Included: ${result.summary.includedCount}`);
	lines.push(`- Excluded: ${result.summary.excludedCount}`);
	lines.push('');
	lines.push('## Shelves');
	lines.push('');
	for (const [shelf, count] of Object.entries(result.summary.byShelf)) {
		lines.push(`- ${shelf}: ${count}`);
	}
	lines.push('');
	lines.push('## Included Resources');
	lines.push('');

	for (const resource of result.included) {
		lines.push(`### ${resource.relativePath}`);
		lines.push('');
		lines.push(`- Shelf: ${resource.shelf}`);
		lines.push(`- Lane: ${resource.lane}`);
		lines.push(`- Priority: ${resource.priority}`);
		if (resource.category) lines.push(`- Category: ${resource.category}`);
		if (resource.resourceType) lines.push(`- Resource type: ${resource.resourceType}`);
		lines.push(`- Context kind: ${resource.contextKind}`);
		lines.push(`- Outbound links: ${resource.outboundLinkCount}`);
		lines.push(`- Why keep: ${resource.reasons.join(' ')}`);
		lines.push('');
	}

	lines.push('## Excluded Resources');
	lines.push('');
	for (const resource of result.excluded) {
		lines.push(`- ${resource.relativePath} (${resource.exclusionType})`);
		lines.push(`  - ${resource.reasons.join(' ')}`);
	}

	return `${lines.join('\n')}\n`;
}

function printSummary(result: {
	summary: ReturnType<typeof summarizeCurated>;
	included: CuratedResource[];
	excluded: ExcludedResource[];
}) {
	process.stdout.write('Toolbox resource curation\n\n');
	process.stdout.write(`- Included: ${result.summary.includedCount}\n`);
	process.stdout.write(`- Excluded: ${result.summary.excludedCount}\n\n`);
	process.stdout.write('Shelves\n');
	for (const [shelf, count] of Object.entries(result.summary.byShelf)) {
		process.stdout.write(`- ${shelf}: ${count}\n`);
	}
	process.stdout.write('\nLanes\n');
	for (const [lane, count] of Object.entries(result.summary.byLane)) {
		process.stdout.write(`- ${lane}: ${count}\n`);
	}
	process.stdout.write('\nExclusions\n');
	for (const [type, count] of Object.entries(result.summary.byExclusion)) {
		process.stdout.write(`- ${type}: ${count}\n`);
	}
}

function sortIncluded(left: CuratedResource, right: CuratedResource) {
	return (
		left.shelf.localeCompare(right.shelf) ||
		left.lane.localeCompare(right.lane) ||
		left.relativePath.localeCompare(right.relativePath)
	);
}

function sortRecord(record: Record<string, number>) {
	return Object.fromEntries(Object.entries(record).sort((left, right) => right[1] - left[1]));
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
