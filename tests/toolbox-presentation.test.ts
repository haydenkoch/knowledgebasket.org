import { describe, expect, it } from 'vitest';
import {
	formatToolboxLabel,
	getToolboxHostLabel,
	getToolboxPrimaryActionLabel,
	getToolboxProvider,
	isPdfLikeUrl
} from '../src/lib/toolbox/presentation';

describe('toolbox presentation helpers', () => {
	it('formats common toolbox labels cleanly', () => {
		expect(formatToolboxLabel('pdf')).toBe('PDF');
		expect(formatToolboxLabel('policy document')).toBe('Policy Document');
		expect(formatToolboxLabel('apple-podcasts')).toBe('Apple-Podcasts');
		expect(formatToolboxLabel('fpic guide')).toBe('FPIC Guide');
	});

	it('detects well-known external providers', () => {
		expect(getToolboxProvider('https://www.pbs.org/video/example')).toBe('pbs');
		expect(getToolboxProvider('https://podcasts.apple.com/us/podcast/example/id1')).toBe(
			'apple-podcasts'
		);
		expect(getToolboxProvider('https://storymaps.arcgis.com/stories/example')).toBe('arcgis');
		expect(getToolboxProvider('https://example.org/resource')).toBe('generic');
	});

	it('formats source host labels for humans', () => {
		expect(getToolboxHostLabel('https://www.pbs.org/video/example')).toBe('PBS');
		expect(getToolboxHostLabel('https://storymaps.arcgis.com/stories/example')).toBe(
			'ArcGIS StoryMaps'
		);
		expect(getToolboxHostLabel('https://example.org/resource')).toBe('example.org');
	});

	it('detects PDF-like links', () => {
		expect(isPdfLikeUrl('https://example.org/file.pdf')).toBe(true);
		expect(isPdfLikeUrl('https://example.org/file.pdf?download=1')).toBe(true);
		expect(isPdfLikeUrl('https://example.org/page')).toBe(false);
	});

	it('chooses provider-aware primary action labels', () => {
		expect(
			getToolboxPrimaryActionLabel(
				{ coil: 'toolbox', id: '1', title: 'PBS video', contentMode: 'link', externalUrl: 'https://www.pbs.org/video/example' },
				{ hasPdfPreview: false }
			)
		).toBe('Watch now');

		expect(
			getToolboxPrimaryActionLabel({
				coil: 'toolbox',
				id: '2',
				title: 'Podcast',
				contentMode: 'link',
				externalUrl: 'https://podcasts.apple.com/us/podcast/example/id1'
			})
		).toBe('Listen now');

		expect(
			getToolboxPrimaryActionLabel({
				coil: 'toolbox',
				id: '3',
				title: 'Document',
				contentMode: 'file'
			})
		).toBe('Download resource');
	});
});
