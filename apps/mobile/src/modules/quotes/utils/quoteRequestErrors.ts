import { FORBIDDEN_ERROR_MESSAGE } from '../../../shared/services/publicApiClient';

export function getGenerationError(status: number, detail?: string) {
	if (status === 403) return FORBIDDEN_ERROR_MESSAGE;
	if (status === 400) {
		return (
			detail ?? 'A requisição precisa estar aprovada e conter dados válidos.'
		);
	}
	if (status === 404) return 'Esta requisição não foi encontrada.';
	if (status === 409) return 'Já existe um orçamento para esta requisição.';
	if (status === 422)
		return detail ?? 'O identificador da requisição é inválido.';
	if (status === 0)
		return 'Falha de conexão. Verifique a conexão e tente novamente.';
	return detail ?? 'Não foi possível gerar o orçamento. Tente novamente.';
}

export function getStatusUpdateError(status: number, detail?: string) {
	if (status === 403) return FORBIDDEN_ERROR_MESSAGE;
	if (status === 404) return 'Esta requisição não foi encontrada.';
	if (status === 409) {
		return (
			detail ?? 'A situação da requisição foi alterada. Atualize os dados.'
		);
	}
	if (status === 422)
		return detail ?? 'Informe um motivo válido para reprovar.';
	if (status === 0)
		return 'Falha de conexão. Verifique a conexão e tente novamente.';
	return detail ?? 'Não foi possível atualizar a requisição. Tente novamente.';
}
