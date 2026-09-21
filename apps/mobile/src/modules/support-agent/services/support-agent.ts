import { apiPost } from '../../../shared/services/apiClient';
import type {
	SuportePerguntaRequest,
	SuportePerguntaResponse,
} from '../types/support-agent';

export const QUESTION_MAX_LENGTH = 500;

export function askSupportAgent(texto: string) {
	return apiPost<SuportePerguntaResponse, SuportePerguntaRequest>(
		'/api/suporte/perguntas',
		{ texto },
	);
}
