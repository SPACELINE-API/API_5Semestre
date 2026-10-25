import { test, expect } from '@playwright/test';
import { getPreviewDocumentUrl } from './FilePreview';

test.describe('getPreviewDocumentUrl', () => {
	test('removes the download parameter from preview URLs', () => {
		expect(
			getPreviewDocumentUrl(
				'https://storage.example/document.pdf?token=abc&download=document.pdf',
			),
		).toBe('https://storage.example/document.pdf?token=abc');
	});

	test('preserves URLs without a download parameter', () => {
		expect(
			getPreviewDocumentUrl('https://storage.example/document.pdf?token=abc'),
		).toBe('https://storage.example/document.pdf?token=abc');
	});
});
