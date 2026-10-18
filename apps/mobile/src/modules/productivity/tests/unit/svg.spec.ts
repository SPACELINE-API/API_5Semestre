import { test, expect } from '@playwright/test';
import { stripPointerEvents } from '../../../../shared/components/charts/svg';

test.describe('stripPointerEvents', () => {
	test('removes pointer-events attributes', () => {
		const svg =
			'<g pointer-events="visible"><path d="M0 0" pointer-events="none"/></g>';

		expect(stripPointerEvents(svg)).toBe('<g><path d="M0 0"/></g>');
	});

	test('removes pointer-events declarations from inline styles', () => {
		const svg = '<text style="pointer-events:none;fill:red">a</text>';

		expect(stripPointerEvents(svg)).toBe('<text style="fill:red">a</text>');
	});

	test('keeps every other attribute untouched', () => {
		const svg = '<rect x="1" y="2" fill="#fff" stroke="#000"/>';

		expect(stripPointerEvents(svg)).toBe(svg);
	});
});
