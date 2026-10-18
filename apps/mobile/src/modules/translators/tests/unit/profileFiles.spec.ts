import { test, expect } from '@playwright/test';
import {
	PHOTO_FILE_RULES,
	validateProfileFile,
} from '../../utils/profileFiles';

const MEGABYTE = 1024 * 1024;

test.describe('validateProfileFile', () => {
	test('accepts a png photo within the size limit', () => {
		expect(
			validateProfileFile(
				{ name: 'foto.png', type: 'image/png', size: 2 * MEGABYTE },
				PHOTO_FILE_RULES,
			),
		).toBeNull();
	});

	test('accepts a photo identified only by extension when the type is generic', () => {
		expect(
			validateProfileFile(
				{ name: 'foto.PNG', type: 'application/octet-stream', size: 1000 },
				PHOTO_FILE_RULES,
			),
		).toBeNull();
	});

	test('rejects formats that are not images', () => {
		expect(
			validateProfileFile(
				{ name: 'foto.pdf', type: 'application/pdf', size: 1000 },
				PHOTO_FILE_RULES,
			),
		).toContain('Formato inválido');
	});

	test('rejects empty and oversized photos', () => {
		expect(
			validateProfileFile(
				{ name: 'foto.png', type: 'image/png', size: 0 },
				PHOTO_FILE_RULES,
			),
		).toContain('vazio');

		expect(
			validateProfileFile(
				{ name: 'foto.jpg', type: 'image/jpeg', size: 6 * MEGABYTE },
				PHOTO_FILE_RULES,
			),
		).toContain('5 MB');
	});

	test('does not block when the picker did not report a size', () => {
		expect(
			validateProfileFile(
				{ name: 'foto.png', type: 'image/png' },
				PHOTO_FILE_RULES,
			),
		).toBeNull();
	});
});
