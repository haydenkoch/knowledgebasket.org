import { describe, expect, it } from 'vitest';
import { sanitizeRichTextHtml } from '../src/lib/server/sanitize-rich-text';

describe('sanitizeRichTextHtml', () => {
	it('removes executable tags and event handler attributes while preserving safe markup', () => {
		const sanitized = sanitizeRichTextHtml(
			'<p>Hello<img src="https://example.com/logo.png" onerror="alert(1)" /></p><script>alert(2)</script>'
		);

		expect(sanitized).toContain('<p>Hello<img src="https://example.com/logo.png" /></p>');
		expect(sanitized).not.toContain('onerror');
		expect(sanitized).not.toContain('<script');
	});

	it('strips dangerous protocols and normalizes external links', () => {
		const sanitized = sanitizeRichTextHtml(
			'<p><a href="javascript:alert(1)" target="_blank">Bad</a> <a href="https://example.com" target="_blank">Good</a></p>'
		);

		expect(sanitized).not.toContain('javascript:');
		expect(sanitized).toContain('href="https://example.com"');
		expect(sanitized).toContain('rel="noopener noreferrer"');
	});

	it('returns null for empty rich text content', () => {
		expect(sanitizeRichTextHtml('   ')).toBeNull();
		expect(sanitizeRichTextHtml(null)).toBeNull();
		expect(sanitizeRichTextHtml(undefined)).toBeUndefined();
	});
});
