import { test, expect } from '@playwright/test';
import { resolveNativeResourceUrl } from '../../../../shared/utils/nativeResourceUrl';

test.describe('resolveNativeResourceUrl', () => {
	test('leaves web resource URLs unchanged', () => {
		expect(
			resolveNativeResourceUrl(
				'http://localhost:3000/uploads/photo.png?size=large',
				'192.168.1.20:8081',
				'web',
			),
		).toBe('http://localhost:3000/uploads/photo.png?size=large');
	});

	test('rewrites an Android localhost resource to the Expo host', () => {
		expect(
			resolveNativeResourceUrl(
				'http://localhost:3000/uploads/photo.png?size=large',
				'192.168.1.20:8081',
				'android',
			),
		).toBe('http://192.168.1.20:3000/uploads/photo.png?size=large');
	});

	test('rewrites IPv4 loopback and preserves the resource URL components', () => {
		expect(
			resolveNativeResourceUrl(
				'https://127.0.0.1:9443/a%20b.png?download=1#preview',
				'dev-machine.local:8081',
				'ios',
			),
		).toBe('https://dev-machine.local:9443/a%20b.png?download=1#preview');
	});

	test('rewrites IPv6 loopback using a non-loopback host URI', () => {
		expect(
			resolveNativeResourceUrl(
				'http://[::1]:3000/photo.png',
				'192.168.1.20:8081',
				'android',
			),
		).toBe('http://192.168.1.20:3000/photo.png');
	});

	test('rewrites other IPv4 and expanded IPv6 loopback forms', () => {
		expect(
			resolveNativeResourceUrl(
				'http://127.0.0.2:3000/photo.png',
				'192.168.1.20:8081',
				'android',
			),
		).toBe('http://192.168.1.20:3000/photo.png');
		expect(
			resolveNativeResourceUrl(
				'http://[0:0:0:0:0:0:0:1]:3000/photo.png',
				'192.168.1.20:8081',
				'android',
			),
		).toBe('http://192.168.1.20:3000/photo.png');
	});

	test('leaves URLs unchanged when host URI is missing or loopback', () => {
		const resourceUrl = 'http://127.0.0.1:3000/photo.png';

		expect(resolveNativeResourceUrl(resourceUrl, undefined, 'android')).toBe(
			resourceUrl,
		);
		expect(
			resolveNativeResourceUrl(resourceUrl, 'localhost:8081', 'android'),
		).toBe(resourceUrl);
	});

	test('leaves non-loopback resource URLs unchanged on native platforms', () => {
		const resourceUrl = 'https://cdn.example.com/photo.png';

		expect(
			resolveNativeResourceUrl(resourceUrl, '192.168.1.20:8081', 'android'),
		).toBe(resourceUrl);
	});
});
