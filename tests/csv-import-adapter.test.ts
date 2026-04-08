import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { csvImportAdapter } from '../src/lib/server/ingestion/adapters/csv-import';

describe('csv import adapter', () => {
	it('parses CSV payloads into rows', async () => {
		const csv = 'id,name,website\n1,Knowledge Basket,https://knowledgebasket.org\n';
		const result = await csvImportAdapter.parse(csv, {});

		expect(result.success).toBe(true);
		expect(result.totalFound).toBe(1);
		expect(result.items[0]?.fields).toEqual({
			id: '1',
			name: 'Knowledge Basket',
			website: 'https://knowledgebasket.org'
		});
		expect(result.items[0]?.sourceItemId).toBe('1');
		expect(result.items[0]?.sourceItemUrl).toBe('https://knowledgebasket.org');
	});

	it('parses XLSX payloads and preserves empty cells as null', async () => {
		const rawContent = await buildWorkbookBinary([
			['id', 'name', 'website'],
			['7', 'Knowledge Basket', null]
		]);
		const result = await csvImportAdapter.parse(rawContent, {});

		expect(result.success).toBe(true);
		expect(result.totalFound).toBe(1);
		expect(result.items[0]?.fields).toEqual({
			id: '7',
			name: 'Knowledge Basket',
			website: null
		});
		expect(result.items[0]?.sourceItemId).toBe('7');
		expect(result.items[0]?.sourceItemUrl).toBe(null);
	});

	it('uses the requested worksheet when sheet_name is provided', async () => {
		const rawContent = await buildWorkbookBinary(
			[
				['id', 'name'],
				['1', 'Fallback']
			],
			[
				{
					name: 'Target',
					rows: [
						['id', 'name'],
						['2', 'Requested']
					]
				}
			]
		);
		const result = await csvImportAdapter.parse(rawContent, { sheet_name: 'Target' });

		expect(result.success).toBe(true);
		expect(result.items).toHaveLength(1);
		expect(result.items[0]?.fields).toEqual({
			id: '2',
			name: 'Requested'
		});
	});

	it('falls back to the first worksheet when sheet_name is missing', async () => {
		const rawContent = await buildWorkbookBinary(
			[
				['id', 'name'],
				['1', 'Primary']
			],
			[
				{
					name: 'Secondary',
					rows: [
						['id', 'name'],
						['2', 'Other']
					]
				}
			]
		);
		const result = await csvImportAdapter.parse(rawContent, { sheet_name: 'Missing' });

		expect(result.success).toBe(true);
		expect(result.items).toHaveLength(1);
		expect(result.items[0]?.fields).toEqual({
			id: '1',
			name: 'Primary'
		});
	});
});

async function buildWorkbookBinary(
	firstSheetRows: Array<Array<string | null>>,
	additionalSheets: Array<{ name: string; rows: Array<Array<string | null>> }> = []
) {
	const workbook = new ExcelJS.Workbook();
	addWorksheet(workbook, 'Sheet1', firstSheetRows);

	for (const sheet of additionalSheets) {
		addWorksheet(workbook, sheet.name, sheet.rows);
	}

	const buffer = await workbook.xlsx.writeBuffer();
	return Buffer.from(buffer).toString('binary');
}

function addWorksheet(workbook: ExcelJS.Workbook, name: string, rows: Array<Array<string | null>>) {
	const worksheet = workbook.addWorksheet(name);
	for (const row of rows) {
		worksheet.addRow(row);
	}
}
