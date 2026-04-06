import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

type RootPackageManifest = {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
};

type InstalledPackageManifest = {
	version?: string;
	description?: string;
	homepage?: string;
	repository?: string | { url?: string };
	license?: string;
	licenses?: Array<string | { type?: string }>;
};

export type OpenSourcePackage = {
	name: string;
	versionRange: string;
	installedVersion: string | null;
	description: string | null;
	homepage: string | null;
	repositoryUrl: string | null;
	license: string | null;
	npmUrl: string;
};

type OpenSourcePackageGroup = {
	id: 'runtime' | 'development';
	title: string;
	description: string;
	packages: OpenSourcePackage[];
};

export type OpenSourcePageData = {
	totalDirectPackages: number;
	runtimeCount: number;
	developmentCount: number;
	groups: OpenSourcePackageGroup[];
};

const PROJECT_ROOT = process.cwd();

export async function getOpenSourcePageData(): Promise<OpenSourcePageData> {
	const rootPackageJson = await readJsonFile<RootPackageManifest>(
		join(PROJECT_ROOT, 'package.json')
	);
	const runtimePackages = await readPackageGroup(rootPackageJson.dependencies ?? {});
	const developmentPackages = await readPackageGroup(rootPackageJson.devDependencies ?? {});

	return {
		totalDirectPackages: runtimePackages.length + developmentPackages.length,
		runtimeCount: runtimePackages.length,
		developmentCount: developmentPackages.length,
		groups: [
			{
				id: 'runtime',
				title: 'Runtime dependencies',
				description: 'Libraries that ship with the product and help power the public experience.',
				packages: runtimePackages
			},
			{
				id: 'development',
				title: 'Build and developer tooling',
				description: 'Tools that help us build, test, lint, style, and maintain the site.',
				packages: developmentPackages
			}
		]
	};
}

async function readPackageGroup(
	dependencies: Record<string, string>
): Promise<OpenSourcePackage[]> {
	const packageEntries = Object.entries(dependencies).sort(([left], [right]) =>
		left.localeCompare(right)
	);

	return Promise.all(
		packageEntries.map(([name, versionRange]) => readInstalledPackageMetadata(name, versionRange))
	);
}

async function readInstalledPackageMetadata(
	name: string,
	versionRange: string
): Promise<OpenSourcePackage> {
	const npmUrl = `https://www.npmjs.com/package/${name}`;

	try {
		const manifestPath = join(PROJECT_ROOT, 'node_modules', ...name.split('/'), 'package.json');
		const manifest = await readJsonFile<InstalledPackageManifest>(manifestPath);
		const repositoryUrl = normalizeUrl(
			typeof manifest.repository === 'string' ? manifest.repository : manifest.repository?.url
		);
		const homepage = normalizeUrl(manifest.homepage) ?? repositoryUrl;

		return {
			name,
			versionRange,
			installedVersion: manifest.version ?? null,
			description: manifest.description ?? null,
			homepage,
			repositoryUrl,
			license: resolveLicense(manifest),
			npmUrl
		};
	} catch {
		return {
			name,
			versionRange,
			installedVersion: null,
			description: null,
			homepage: null,
			repositoryUrl: null,
			license: null,
			npmUrl
		};
	}
}

async function readJsonFile<T>(filePath: string): Promise<T> {
	const fileContents = await readFile(filePath, 'utf8');
	return JSON.parse(fileContents) as T;
}

function resolveLicense(manifest: InstalledPackageManifest): string | null {
	if (typeof manifest.license === 'string' && manifest.license.trim().length > 0) {
		return manifest.license;
	}

	if (!Array.isArray(manifest.licenses)) return null;

	const entries = manifest.licenses
		.map((entry) => (typeof entry === 'string' ? entry : entry.type))
		.filter((entry): entry is string => Boolean(entry && entry.trim()));

	return entries.length > 0 ? entries.join(', ') : null;
}

function normalizeUrl(value: string | undefined): string | null {
	if (!value) return null;

	let normalized = value.trim();
	if (normalized.startsWith('git+')) normalized = normalized.slice(4);
	if (normalized.startsWith('git://github.com/')) {
		normalized = `https://github.com/${normalized.slice('git://github.com/'.length)}`;
	}
	if (normalized.startsWith('git@github.com:')) {
		normalized = `https://github.com/${normalized.slice('git@github.com:'.length)}`;
	}
	if (normalized.endsWith('.git')) normalized = normalized.slice(0, -4);

	return /^https?:\/\//.test(normalized) ? normalized : null;
}
