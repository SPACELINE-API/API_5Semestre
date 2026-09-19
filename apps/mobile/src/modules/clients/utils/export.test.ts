/**
 * @jest-environment jsdom
 */
import { TextDecoder, TextEncoder } from 'node:util';
import { Platform } from 'react-native';
import type { Company } from '../types/company';
import { exportCompaniesAsJson } from './export';

if (!global.TextEncoder) {
	global.TextEncoder = TextEncoder;
	global.TextDecoder = TextDecoder;
}

const sampleCompanies: Company[] = [
	{
		id: '1',
		legal_name: 'Acme Tecnologia Ltda',
		trade_name: 'Acme Tech',
		cnpj: '11222333000181',
		industry: 'Tecnologia',
		phone: '11987654321',
		email: 'contato@acmetech.com',
		zip_code: '01310-100',
		street: 'Avenida Paulista',
		number: '1000',
		complement: null,
		neighborhood: 'Bela Vista',
		city: 'Sao Paulo',
		state: 'SP',
		is_active: true,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
	},
];

describe('exportCompaniesAsJson', () => {
	const originalOS = Platform.OS;

	afterEach(() => {
		jest.restoreAllMocks();
		Platform.OS = originalOS;
	});

	it('returns false and does nothing on non-web platforms', () => {
		Platform.OS = 'ios';
		const createElementSpy = jest.spyOn(document, 'createElement');

		const result = exportCompaniesAsJson(sampleCompanies);

		expect(result).toBe(false);
		expect(createElementSpy).not.toHaveBeenCalled();
	});

	it('triggers a JSON file download on web', () => {
		Platform.OS = 'web';
		global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
		global.URL.revokeObjectURL = jest.fn();

		const clickSpy = jest.fn();
		const link = {
			href: '',
			download: '',
			click: clickSpy,
		} as unknown as HTMLAnchorElement;
		jest.spyOn(document, 'createElement').mockReturnValue(link);
		jest.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
		jest.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

		const result = exportCompaniesAsJson(sampleCompanies);

		expect(result).toBe(true);
		expect(link.href).toBe('blob:mock-url');
		expect(link.download).toMatch(/^empresas-\d{4}-\d{2}-\d{2}\.json$/);
		expect(clickSpy).toHaveBeenCalledTimes(1);
		expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
	});
});
