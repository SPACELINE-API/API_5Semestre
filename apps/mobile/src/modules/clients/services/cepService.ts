export type CepAddress = {
	street: string;
	neighborhood: string;
	city: string;
	state: string;
};

type ViaCepResponse = {
	logradouro?: string;
	bairro?: string;
	localidade?: string;
	uf?: string;
	erro?: boolean;
};

export function normalizeZipCode(zipCode: string): string {
	return zipCode.replace(/\D/g, '');
}

export async function fetchAddressByZipCode(
	zipCode: string,
): Promise<CepAddress | null> {
	const normalized = normalizeZipCode(zipCode);

	if (normalized.length !== 8) {
		return null;
	}

	const response = await fetch(`https://viacep.com.br/ws/${normalized}/json/`);

	if (!response.ok) {
		throw new Error('Não foi possível buscar o CEP.');
	}

	const data = (await response.json()) as ViaCepResponse;

	if (data.erro) {
		return null;
	}

	return {
		street: data.logradouro ?? '',
		neighborhood: data.bairro ?? '',
		city: data.localidade ?? '',
		state: data.uf ?? '',
	};
}
