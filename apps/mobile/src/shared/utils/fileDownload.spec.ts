import { test, expect } from '@playwright/test';
import {
	getDownloadFileName,
	getDownloadMimeType,
	getDownloadUrl,
} from './fileDownload';

test.describe('download file metadata', () => {
	test('uses the readable storage filename without its UUID prefix', () => {
		expect(
			getDownloadFileName(
				'https://storage.example.com/service-order-files/8b4367fb-ea3c-40c8-ad0d-7f62afbba700_Dark%20Blue.pdf',
			),
		).toBe('Dark Blue.pdf');
	});

	test('uses a PDF MIME type for Android Storage Access Framework', () => {
		expect(getDownloadMimeType('Dark Blue.pdf')).toBe('application/pdf');
	});

	test('uses MIME types for supported office and image files regardless of case', () => {
		expect(getDownloadMimeType('report.DOCX')).toBe(
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		);
		expect(getDownloadMimeType('scan.JpG')).toBe('image/jpeg');
	});

	test('falls back to the generic MIME type for unknown extensions', () => {
		expect(getDownloadMimeType('archive.zip')).toBe('application/octet-stream');
		expect(getDownloadMimeType('document')).toBe('application/octet-stream');
	});

	test('sanitizes names that cannot be created in shared storage', () => {
		expect(
			getDownloadFileName(
				'https://storage.example.com/folder/report%3Afinal.pdf',
			),
		).toBe('report_final.pdf');
	});

	test('replaces control characters in names that cannot be created in shared storage', () => {
		expect(
			getDownloadFileName(
				'https://storage.example.com/folder/report%00final.pdf',
			),
		).toBe('report_final.pdf');
	});
});

test.describe('getDownloadUrl', () => {
	test('builds a download URL for the service-order storage path and original filename', () => {
		const storageUrl =
			'http://localhost:8000/storage/v1/object/public/service-order-files/8b4367fb-ea3c-40c8-ad0d-7f62afbba700_Dark%20Blue%20and%20Orange%20Modern%20Drone%20Product%20Presentation.pdf';

		const result = getDownloadUrl(storageUrl);
		const parsedResult = new URL(result);

		expect(parsedResult.origin).toBe('http://localhost:8000');
		expect(parsedResult.pathname).toBe(
			'/storage/v1/object/public/service-order-files/8b4367fb-ea3c-40c8-ad0d-7f62afbba700_Dark%20Blue%20and%20Orange%20Modern%20Drone%20Product%20Presentation.pdf',
		);
		expect(parsedResult.searchParams.get('download')).toBe(
			'Dark Blue and Orange Modern Drone Product Presentation.pdf',
		);
	});

	test('preserves a real Supabase signed-object path and token while adding the download filename', () => {
		const signedStorageUrl =
			'http://localhost:8000/storage/v1/object/sign/service-order-files/translated/8b4367fb-ea3c-40c8-ad0d-7f62afbba700_Contrato%20final.pdf?token=test-token';
		const result = new URL(getDownloadUrl(signedStorageUrl));

		expect(result.pathname).toBe(
			'/storage/v1/object/sign/service-order-files/translated/8b4367fb-ea3c-40c8-ad0d-7f62afbba700_Contrato%20final.pdf',
		);
		expect(result.searchParams.get('token')).toBe('test-token');
		expect(result.searchParams.get('download')).toBe('Contrato final.pdf');
	});

	test('adds the Supabase download parameter to an existing file URL', () => {
		expect(getDownloadUrl('https://storage.example.com/document.pdf')).toBe(
			'https://storage.example.com/document.pdf?download=document.pdf',
		);
	});

	test('preserves existing query parameters and the URL fragment', () => {
		expect(
			getDownloadUrl(
				'https://storage.example.com/document.pdf?token=abc&expires=123#preview',
			),
		).toBe(
			'https://storage.example.com/document.pdf?token=abc&expires=123&download=document.pdf#preview',
		);
	});

	test('replaces an existing download parameter instead of duplicating it', () => {
		expect(
			getDownloadUrl(
				'https://storage.example.com/document.pdf?download=false&token=abc',
			),
		).toBe(
			'https://storage.example.com/document.pdf?download=document.pdf&token=abc',
		);
	});
});
