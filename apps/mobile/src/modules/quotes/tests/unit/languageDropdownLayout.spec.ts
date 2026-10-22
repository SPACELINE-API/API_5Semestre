import { test, expect } from '@playwright/test';
import { getLanguageDropdownLayout } from '../../utils/languageDropdownLayout';

test.describe('getLanguageDropdownLayout', () => {
	test('keeps a dropdown anchored near the right edge inside the viewport', () => {
		expect(
			getLanguageDropdownLayout(
				{ x: 280, y: 200, width: 220, height: 48 },
				{ width: 360, height: 800 },
			),
		).toEqual({ left: 132, top: 252, width: 220, maxHeight: 192 });
	});

	test('limits dropdown width on a narrow mobile viewport', () => {
		expect(
			getLanguageDropdownLayout(
				{ x: 8, y: 120, width: 344, height: 48 },
				{ width: 320, height: 640 },
			),
		).toEqual({ left: 8, top: 172, width: 304, maxHeight: 192 });
	});

	test('opens above the trigger when the remaining space below is too short', () => {
		expect(
			getLanguageDropdownLayout(
				{ x: 24, y: 720, width: 312, height: 48 },
				{ width: 360, height: 800 },
			),
		).toEqual({ left: 24, top: 524, width: 312, maxHeight: 192 });
	});

	test('uses the larger available side and constrains height when neither fits', () => {
		expect(
			getLanguageDropdownLayout(
				{ x: 24, y: 190, width: 312, height: 48 },
				{ width: 360, height: 400 },
			),
		).toEqual({ left: 24, top: 8, width: 312, maxHeight: 178 });
	});
});
