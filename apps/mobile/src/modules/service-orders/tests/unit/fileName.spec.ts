import { test, expect } from '@playwright/test';
import { getTruncatedFileName } from '../../../../shared/utils/file';

test.describe('getTruncatedFileName', () => {
	test('keeps names of 12 characters or fewer without an ellipsis', () => {
		expect(getTruncatedFileName('https://files.example/relatorio.pdf')).toBe(
			'relatorio.pd...',
		);
		expect(getTruncatedFileName('https://files.example/arquivo.pdf')).toBe(
			'arquivo.pdf',
		);
	});

	test('limits long filenames to 12 characters followed by three dots', () => {
		expect(
			getTruncatedFileName(
				'https://files.example/relatorio-financeiro-final.pdf',
			),
		).toBe('relatorio-fi...');
	});

	test('removes a UUID prefix before truncating the filename', () => {
		expect(
			getTruncatedFileName(
				'https://files.example/123e4567-e89b-12d3-a456-426614174000_documento-extenso.pdf',
			),
		).toBe('documento-ex...');
	});
});
