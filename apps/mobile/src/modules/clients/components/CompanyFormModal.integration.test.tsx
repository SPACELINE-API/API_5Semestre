import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { CompanyFormModal } from './CompanyFormModal';

type RenderResult = Awaited<ReturnType<typeof render>>;

const VIA_CEP_RESPONSE = {
	logradouro: 'Avenida Paulista',
	bairro: 'Bela Vista',
	localidade: 'Sao Paulo',
	uf: 'SP',
	erro: false,
};

function mockFetchOnce(body: unknown, ok = true) {
	global.fetch = jest.fn().mockResolvedValue({
		ok,
		status: ok ? 200 : 404,
		json: async () => body,
	}) as unknown as typeof fetch;
}

async function fillIdentificationStep(view: RenderResult) {
	await fireEvent.changeText(
		view.getByPlaceholderText('Ex: Rezende Advogados Ltda'),
		'Rezende Advogados Associados Ltda',
	);
	await fireEvent.changeText(
		view.getByPlaceholderText('Ex: Rezende Advogados'),
		'Rezende Advogados',
	);
	await fireEvent.changeText(
		view.getByPlaceholderText('00.000.000/0000-00'),
		'11222333000181',
	);
	await fireEvent.changeText(
		view.getByPlaceholderText('Ex: Jurídico'),
		'Juridico',
	);
	await fireEvent.press(view.getByText('Avançar'));
}

async function fillContactStep(view: RenderResult) {
	await fireEvent.changeText(
		view.getByPlaceholderText('(00) 00000-0000'),
		'11987654321',
	);
	await fireEvent.changeText(
		view.getByPlaceholderText('contato@empresa.com'),
		'contato@rezendeadv.com.br',
	);
	await fireEvent.press(view.getByText('Avançar'));
}

describe('CompanyFormModal', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('masks CNPJ and phone as the user types', async () => {
		mockFetchOnce(VIA_CEP_RESPONSE);
		const view = await render(
			<CompanyFormModal visible onClose={jest.fn()} onSubmit={jest.fn()} />,
		);

		await fireEvent.changeText(
			view.getByPlaceholderText('00.000.000/0000-00'),
			'11222333000181',
		);
		expect(view.getByPlaceholderText('00.000.000/0000-00').props.value).toBe(
			'11.222.333/0001-81',
		);

		await fillIdentificationStep(view);
		await fireEvent.changeText(
			view.getByPlaceholderText('(00) 00000-0000'),
			'11987654321',
		);
		expect(view.getByPlaceholderText('(00) 00000-0000').props.value).toBe(
			'(11) 98765-4321',
		);
	});

	it('blocks advancing to the next step when required fields are invalid', async () => {
		mockFetchOnce(VIA_CEP_RESPONSE);
		const view = await render(
			<CompanyFormModal visible onClose={jest.fn()} onSubmit={jest.fn()} />,
		);

		await fireEvent.press(view.getByText('Avançar'));

		expect(await view.findByText('Razão social é obrigatório.')).toBeTruthy();
		expect(view.getByText('CNPJ é obrigatório.')).toBeTruthy();
		expect(view.queryByPlaceholderText('(00) 00000-0000')).toBeNull();
	});

	it('flags an invalid phone number and keeps the user on the contact step', async () => {
		mockFetchOnce(VIA_CEP_RESPONSE);
		const view = await render(
			<CompanyFormModal visible onClose={jest.fn()} onSubmit={jest.fn()} />,
		);

		await fillIdentificationStep(view);
		await fireEvent.changeText(
			view.getByPlaceholderText('(00) 00000-0000'),
			'119',
		);
		await fireEvent.changeText(
			view.getByPlaceholderText('contato@empresa.com'),
			'contato@rezendeadv.com.br',
		);
		await fireEvent.press(view.getByText('Avançar'));

		expect(await view.findByText('Telefone inválido.')).toBeTruthy();
		expect(view.queryByPlaceholderText('00000-000')).toBeNull();
	});

	it('autofills the address from the CEP lookup and submits the full form', async () => {
		mockFetchOnce(VIA_CEP_RESPONSE);
		const onSubmit = jest.fn().mockResolvedValue(undefined);
		const onClose = jest.fn();
		const view = await render(
			<CompanyFormModal visible onClose={onClose} onSubmit={onSubmit} />,
		);

		await fillIdentificationStep(view);
		await fillContactStep(view);

		await fireEvent.changeText(
			view.getByPlaceholderText('00000-000'),
			'01310-100',
		);

		await waitFor(() => {
			expect(
				view.getByPlaceholderText('Ex: Avenida Paulista').props.value,
			).toBe('Avenida Paulista');
		});
		expect(view.getByPlaceholderText('Ex: Bela Vista').props.value).toBe(
			'Bela Vista',
		);
		expect(view.getByPlaceholderText('SP').props.value).toBe('SP');

		await fireEvent.changeText(view.getByPlaceholderText('Ex: 1000'), '1000');
		await fireEvent.press(view.getByText('Salvar'));

		await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({
				legal_name: 'Rezende Advogados Associados Ltda',
				cnpj: '11.222.333/0001-81',
				phone: '(11) 98765-4321',
				email: 'contato@rezendeadv.com.br',
				street: 'Avenida Paulista',
				neighborhood: 'Bela Vista',
				city: 'Sao Paulo',
				state: 'SP',
				number: '1000',
			}),
		);
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
	});
});
