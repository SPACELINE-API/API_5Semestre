import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { Company, CompanyCreateInput } from '../types/company';
import { useCompanies } from './useCompanies';

const COMPANY_A: Company = {
	id: '1',
	legal_name: 'Rezende Advogados Associados Ltda',
	trade_name: 'Rezende Advogados',
	cnpj: '28471095000140',
	industry: 'Juridico',
	phone: '1198765432',
	email: 'contato@rezendeadv.com.br',
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
};

const COMPANY_B: Company = {
	...COMPANY_A,
	id: '2',
	legal_name: 'Global Servicos de Traducao Ltda',
	trade_name: 'Global Traducoes',
	cnpj: '50982716000100',
	is_active: false,
};

function mockFetchSequence(responses: Array<{ ok?: boolean; body: unknown }>) {
	const fetchMock = jest.fn();
	for (const { ok = true, body } of responses) {
		fetchMock.mockImplementationOnce(async () => ({
			ok,
			status: ok ? 200 : 500,
			json: async () => body,
		}));
	}
	global.fetch = fetchMock as unknown as typeof fetch;
	return fetchMock;
}

describe('useCompanies (integration: hook + companyService + apiClient)', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('loads companies from the API on mount', async () => {
		const fetchMock = mockFetchSequence([{ body: [COMPANY_A, COMPANY_B] }]);

		const { result } = await renderHook(() => useCompanies());

		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.companies).toEqual([COMPANY_A, COMPANY_B]);
		expect(result.current.error).toBeNull();
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining('/api/clients'),
		);
	});

	it('sets an error message when the initial load fails', async () => {
		mockFetchSequence([{ ok: false, body: { detail: 'boom' } }]);

		const { result } = await renderHook(() => useCompanies());

		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.companies).toEqual([]);
		expect(result.current.error).toBe(
			'Não foi possível carregar os clientes. Tente novamente.',
		);
	});

	it('prepends a newly created company after a successful POST', async () => {
		const fetchMock = mockFetchSequence([
			{ body: [COMPANY_A] },
			{ body: COMPANY_B },
		]);

		const { result } = await renderHook(() => useCompanies());
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		const input: CompanyCreateInput = {
			legal_name: COMPANY_B.legal_name,
			trade_name: COMPANY_B.trade_name,
			cnpj: COMPANY_B.cnpj,
			industry: COMPANY_B.industry,
			phone: COMPANY_B.phone,
			email: COMPANY_B.email,
			zip_code: COMPANY_B.zip_code,
			street: COMPANY_B.street,
			number: COMPANY_B.number,
			neighborhood: COMPANY_B.neighborhood,
			city: COMPANY_B.city,
			state: COMPANY_B.state,
		};

		await act(async () => {
			await result.current.create(input);
		});

		expect(result.current.companies).toEqual([COMPANY_B, COMPANY_A]);
		const [, postCall] = fetchMock.mock.calls;
		expect(postCall[1]).toMatchObject({ method: 'POST' });
	});

	it('removes companies locally by id without refetching the list', async () => {
		mockFetchSequence([{ body: [COMPANY_A, COMPANY_B] }]);

		const { result } = await renderHook(() => useCompanies());
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		await act(() => {
			result.current.removeMany([COMPANY_A.id]);
		});

		await waitFor(() => expect(result.current.companies).toEqual([COMPANY_B]));
	});
});
