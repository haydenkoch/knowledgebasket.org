import { execFile as execFileCallback } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { load } from 'cheerio';
import {
	inventoryToolboxResources,
	resolveToolboxResourcesDir,
	type ResourceInventoryItem
} from '../src/lib/server/toolbox-resource-library';

const execFile = promisify(execFileCallback);

type CliOptions = {
	dir?: string;
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
	importDecision: ResourceInventoryItem['importDecision'];
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

const URL_NOISE_HOSTS = new Set([
	'w3.org',
	'www.w3.org',
	'ns.adobe.com',
	'purl.org',
	'iptc.org',
	'cipa.jp',
	'ns.useplus.org'
]);

async function main() {
	const options = parseArgs(process.argv.slice(2));
	const resourcesDir = resolveToolboxResourcesDir({
		configuredPath: options.dir ?? process.env.KB_RESOURCES_PATH ?? null,
		cwd: process.cwd()
	});
	const inventory = await inventoryToolboxResources(resourcesDir);
	const contexts = await analyzeInventory(inventory.items);
	const summary = summarizeContexts(contexts);
	const payload = {
		baseDir: inventory.baseDir,
		generatedAt: new Date().toISOString(),
		summary,
		contexts
	};

	if (options.writeJson) {
		const outputPath = resolve(options.writeJson);
		await mkdir(dirname(outputPath), { recursive: true });
		await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
	}

	if (options.writeMarkdown) {
		const outputPath = resolve(options.writeMarkdown);
		await mkdir(dirname(outputPath), { recursive: true });
		await writeFile(outputPath, renderMarkdown(payload), 'utf8');
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

async function analyzeInventory(items: ResourceInventoryItem[]) {
	const contexts: ResourceContext[] = [];

	for (const item of items) {
		contexts.push(await analyzeItem(item));
	}

	return contexts;
}

async function analyzeItem(item: ResourceInventoryItem): Promise<ResourceContext> {
	if (item.extension === 'pdf') {
		const text = await extractPdfText(item.absolutePath);
		const pdfMeta = await extractPdfInfo(item.absolutePath);
		const links = unique([...extractUrls(text), ...(await extractBinaryUrls(item.absolutePath))]);
		return buildContext(item, {
			text,
			pages: pdfMeta.pages,
			outboundLinks: links,
			emails: extractEmails(text)
		});
	}

	if (item.extension === 'docx') {
		const text = await extractDocxText(item.absolutePath);
		const links = unique([
			...extractUrls(text),
			...(await extractDocxRelationshipUrls(item.absolutePath))
		]);
		return buildContext(item, {
			text,
			pages: null,
			outboundLinks: links,
			emails: extractEmails(text)
		});
	}

	if (item.extension === 'html') {
		const html = await readFile(item.absolutePath, 'utf8');
		const $ = load(html);
		const bodyText = $('body').text();
		const text = `${$('title').text()}\n\n${bodyText}`.trim();
		const hrefs = $('a[href]')
			.toArray()
			.map((element) => $(element).attr('href'))
			.filter((href): href is string => Boolean(href));
		return buildContext(item, {
			text,
			pages: null,
			outboundLinks: unique(hrefs.map(normalizeUrlCandidate).filter(Boolean) as string[]),
			emails: extractEmails(text)
		});
	}

	if (['jpg', 'jpeg', 'png', 'webp'].includes(item.extension)) {
		return {
			relativePath: item.relativePath,
			title: item.title,
			extension: item.extension,
			importDecision: item.importDecision,
			suggestedCategory: item.suggestedCategory,
			suggestedResourceType: item.suggestedResourceType,
			pages: null,
			contextKind: 'image-asset',
			contextSignals: ['Image asset; no text extraction attempted.'],
			textPreview: null,
			outboundLinks: [],
			linkDomains: [],
			emails: []
		};
	}

	return {
		relativePath: item.relativePath,
		title: item.title,
		extension: item.extension,
		importDecision: item.importDecision,
		suggestedCategory: item.suggestedCategory,
		suggestedResourceType: item.suggestedResourceType,
		pages: null,
		contextKind: 'other',
		contextSignals: ['Unsupported file type for context extraction.'],
		textPreview: null,
		outboundLinks: [],
		linkDomains: [],
		emails: []
	};
}

function buildContext(
	item: ResourceInventoryItem,
	input: {
		text: string;
		pages: number | null;
		outboundLinks: string[];
		emails: string[];
	}
): ResourceContext {
	const normalizedText = normalizeWhitespace(input.text);
	const textPreview = buildPreview(normalizedText);
	const contextKind = inferContextKind(item.title, normalizedText, input.outboundLinks);
	const contextSignals = inferContextSignals(item.title, normalizedText, input.outboundLinks);
	const linkDomains = unique(
		input.outboundLinks
			.map((link) => {
				try {
					return new URL(link).hostname.replace(/^www\./, '');
				} catch {
					return null;
				}
			})
			.filter((domain): domain is string => Boolean(domain))
	);

	return {
		relativePath: item.relativePath,
		title: item.title,
		extension: item.extension,
		importDecision: item.importDecision,
		suggestedCategory: item.suggestedCategory,
		suggestedResourceType: item.suggestedResourceType,
		pages: input.pages,
		contextKind,
		contextSignals,
		textPreview,
		outboundLinks: input.outboundLinks.slice(0, 25),
		linkDomains,
		emails: unique(input.emails)
	};
}

async function extractPdfText(absolutePath: string) {
	const { stdout } = await execFile('pdftotext', [absolutePath, '-'], {
		maxBuffer: 64 * 1024 * 1024
	});
	return stdout;
}

async function extractPdfInfo(absolutePath: string) {
	const { stdout } = await execFile('pdfinfo', [absolutePath], {
		maxBuffer: 4 * 1024 * 1024
	});
	const pagesMatch = stdout.match(/^Pages:\s+(\d+)/m);
	return {
		pages: pagesMatch ? Number.parseInt(pagesMatch[1], 10) : null
	};
}

async function extractDocxText(absolutePath: string) {
	const { stdout } = await execFile('textutil', ['-convert', 'txt', '-stdout', absolutePath], {
		maxBuffer: 16 * 1024 * 1024
	});
	return stdout;
}

async function extractDocxRelationshipUrls(absolutePath: string) {
	try {
		const { stdout } = await execFile(
			'unzip',
			['-p', absolutePath, 'word/_rels/document.xml.rels'],
			{
				maxBuffer: 4 * 1024 * 1024
			}
		);
		return unique(
			Array.from(stdout.matchAll(/Target="([^"]+)"/g), (match) =>
				normalizeUrlCandidate(match[1])
			).filter((value): value is string => Boolean(value))
		);
	} catch {
		return [];
	}
}

async function extractBinaryUrls(absolutePath: string) {
	try {
		const { stdout } = await execFile('strings', [absolutePath], {
			maxBuffer: 16 * 1024 * 1024
		});
		return extractUrls(stdout);
	} catch {
		return [];
	}
}

function extractUrls(text: string) {
	return unique(
		Array.from(text.matchAll(/\bhttps?:\/\/[^\s<>()"']+/gi), (match) =>
			normalizeUrlCandidate(match[0])
		).filter((value): value is string => Boolean(value))
	);
}

function extractEmails(text: string) {
	return unique(
		Array.from(text.matchAll(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi), (match) =>
			match[0].toLowerCase()
		)
	);
}

function normalizeUrlCandidate(value: string | null | undefined) {
	if (!value) return null;
	const cleaned = value.replace(/[)\],.;]+$/g, '');
	if (!/^https?:\/\//i.test(cleaned) && !/^mailto:/i.test(cleaned)) return null;

	try {
		const url = new URL(cleaned);
		const hostname = url.hostname.toLowerCase();
		if (!hostname.includes('.')) return null;
		if (URL_NOISE_HOSTS.has(hostname)) return null;
		return url.toString();
	} catch {
		return null;
	}
}

function normalizeWhitespace(text: string) {
	return text
		.replace(/\f/g, '\n')
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.replace(/[\u200B-\u200D\uFEFF]/g, '')
		.trim();
}

function buildPreview(text: string) {
	if (!text) return null;
	const lines = text
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length >= 30 && !/^\d+$/.test(line));
	return lines.slice(0, 5).join(' ').slice(0, 700) || null;
}

function inferContextKind(title: string, text: string, links: string[]): ContextKind {
	const lowerTitle = title.toLowerCase();
	const lowerText = text.toLowerCase();

	if (lowerTitle.includes('resource links')) return 'resource-list';
	if (
		lowerTitle.includes('toolkit') ||
		lowerTitle.includes('guidance') ||
		lowerTitle.includes('handbook') ||
		lowerText.includes('table of contents')
	) {
		return 'toolkit-guide';
	}
	if (
		lowerTitle.includes('rule') ||
		lowerTitle.includes('policy') ||
		lowerTitle.includes('declaration') ||
		lowerTitle.includes('rights') ||
		lowerText.includes('free, prior and informed consent')
	) {
		return 'policy-legal';
	}
	if (
		lowerTitle.includes('report') ||
		lowerTitle.includes('study') ||
		lowerText.includes('abstract') ||
		lowerText.includes('introduction')
	) {
		return 'research-report';
	}
	if (lowerTitle.includes('map') || lowerTitle.includes('mapping') || lowerText.includes('gis')) {
		return 'map-spatial';
	}
	if (
		lowerTitle.includes('histor') ||
		lowerText.includes('historical context') ||
		lowerText.includes('genocide') ||
		lowerText.includes('tribal nations')
	) {
		return 'historical-cultural';
	}
	if (
		links.length >= 8 &&
		(lowerText.includes('resources') ||
			lowerText.includes('for more information') ||
			lowerText.includes('further reading'))
	) {
		return 'resource-list';
	}
	return 'other';
}

function inferContextSignals(title: string, text: string, links: string[]) {
	const lowerTitle = title.toLowerCase();
	const lowerText = text.toLowerCase();
	const signals: string[] = [];

	if (links.length > 0)
		signals.push(
			`Contains ${links.length} extracted outbound link${links.length === 1 ? '' : 's'}.`
		);
	if (
		lowerTitle.includes('land back') ||
		lowerText.includes('land back') ||
		lowerText.includes('landback')
	)
		signals.push('Strong land back theme.');
	if (lowerText.includes('co-management')) signals.push('Discusses co-management.');
	if (lowerText.includes('food') && lowerText.includes('indigenous'))
		signals.push('Touches Indigenous food systems or food sovereignty.');
	if (lowerText.includes('climate') || lowerText.includes('fire'))
		signals.push('Touches climate adaptation, fire, or resilience.');
	if (lowerText.includes('water rights') || lowerText.includes('water'))
		signals.push('Contains land or water governance context.');
	if (lowerText.includes('federal') || lowerText.includes('agency'))
		signals.push('References agency or federal partner relationships.');
	if (lowerText.includes('women') || lowerText.includes('feminist'))
		signals.push('Contains women or feminist framing.');
	if (signals.length === 0) signals.push('General reference material.');

	return signals;
}

function summarizeContexts(contexts: ResourceContext[]) {
	const byKind: Record<string, number> = {};
	const domainCounts: Record<string, number> = {};
	const richLinkDocs: Array<
		Pick<ResourceContext, 'relativePath' | 'title' | 'outboundLinks' | 'contextKind'>
	> = [];

	for (const context of contexts) {
		byKind[context.contextKind] = (byKind[context.contextKind] ?? 0) + 1;
		for (const domain of context.linkDomains) {
			domainCounts[domain] = (domainCounts[domain] ?? 0) + 1;
		}
		if (context.outboundLinks.length >= 5) {
			richLinkDocs.push({
				relativePath: context.relativePath,
				title: context.title,
				outboundLinks: context.outboundLinks,
				contextKind: context.contextKind
			});
		}
	}

	const topLinkDomains = Object.entries(domainCounts)
		.sort((left, right) => right[1] - left[1])
		.slice(0, 20)
		.map(([domain, count]) => ({ domain, count }));

	const richLinkDocSummaries = richLinkDocs
		.sort((left, right) => right.outboundLinks.length - left.outboundLinks.length)
		.slice(0, 20)
		.map((doc) => ({
			relativePath: doc.relativePath,
			title: doc.title,
			contextKind: doc.contextKind,
			linkCount: doc.outboundLinks.length
		}));

	return {
		totalResources: contexts.length,
		documentsWithTextContext: contexts.filter((context) => context.textPreview).length,
		resourcesWithOutboundLinks: contexts.filter((context) => context.outboundLinks.length > 0)
			.length,
		byKind: sortRecordDescending(byKind),
		topLinkDomains,
		richLinkDocs: richLinkDocSummaries
	};
}

function renderMarkdown(payload: {
	baseDir: string;
	generatedAt: string;
	summary: ReturnType<typeof summarizeContexts>;
	contexts: ResourceContext[];
}) {
	const lines: string[] = [];
	lines.push('# Toolbox Resource Context Report');
	lines.push('');
	lines.push(`- Generated: ${payload.generatedAt}`);
	lines.push(`- Base directory: ${payload.baseDir}`);
	lines.push(`- Total resources analyzed: ${payload.summary.totalResources}`);
	lines.push(`- Resources with text context: ${payload.summary.documentsWithTextContext}`);
	lines.push(`- Resources with outbound links: ${payload.summary.resourcesWithOutboundLinks}`);
	lines.push('');
	lines.push('## Context kinds');
	lines.push('');
	for (const [kind, count] of Object.entries(payload.summary.byKind)) {
		lines.push(`- ${kind}: ${count}`);
	}
	lines.push('');
	lines.push('## Top link domains');
	lines.push('');
	for (const domain of payload.summary.topLinkDomains) {
		lines.push(`- ${domain.domain}: ${domain.count}`);
	}
	lines.push('');
	lines.push('## High-link documents');
	lines.push('');
	for (const doc of payload.summary.richLinkDocs) {
		lines.push(`- ${doc.relativePath} (${doc.contextKind}, ${doc.linkCount} links)`);
	}
	lines.push('');
	lines.push('## Per-resource notes');
	lines.push('');

	for (const context of payload.contexts) {
		lines.push(`### ${context.relativePath}`);
		lines.push('');
		lines.push(`- Kind: ${context.contextKind}`);
		lines.push(`- Import decision: ${context.importDecision}`);
		if (context.suggestedCategory) lines.push(`- Suggested category: ${context.suggestedCategory}`);
		if (context.suggestedResourceType)
			lines.push(`- Suggested resource type: ${context.suggestedResourceType}`);
		if (context.pages !== null) lines.push(`- Pages: ${context.pages}`);
		lines.push(`- Signals: ${context.contextSignals.join(' ')}`);
		if (context.textPreview) lines.push(`- Preview: ${context.textPreview}`);
		if (context.emails.length > 0) lines.push(`- Emails: ${context.emails.join(', ')}`);
		if (context.outboundLinks.length > 0) {
			lines.push('- Links:');
			for (const link of context.outboundLinks) {
				lines.push(`  - ${link}`);
			}
		}
		lines.push('');
	}

	return `${lines.join('\n')}\n`;
}

function printSummary(payload: {
	summary: ReturnType<typeof summarizeContexts>;
	contexts: ResourceContext[];
}) {
	process.stdout.write('Toolbox resource context analysis\n\n');
	process.stdout.write(`- Total resources: ${payload.summary.totalResources}\n`);
	process.stdout.write(`- With text context: ${payload.summary.documentsWithTextContext}\n`);
	process.stdout.write(`- With outbound links: ${payload.summary.resourcesWithOutboundLinks}\n\n`);

	process.stdout.write('Context kinds\n');
	for (const [kind, count] of Object.entries(payload.summary.byKind)) {
		process.stdout.write(`- ${kind}: ${count}\n`);
	}
	process.stdout.write('\nTop link domains\n');
	for (const domain of payload.summary.topLinkDomains) {
		process.stdout.write(`- ${domain.domain}: ${domain.count}\n`);
	}
	process.stdout.write('\nHigh-link documents\n');
	for (const doc of payload.summary.richLinkDocs.slice(0, 10)) {
		process.stdout.write(`- ${doc.relativePath} (${doc.contextKind}, ${doc.linkCount} links)\n`);
	}
}

function unique<T>(items: T[]) {
	return Array.from(new Set(items));
}

function sortRecordDescending(record: Record<string, number>) {
	return Object.fromEntries(Object.entries(record).sort((left, right) => right[1] - left[1]));
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
