import { apiGet, apiPost } from '../../../shared/services/apiClient';
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

type EnfileirarChatResponse = { event_id: string };

export function enviarPerguntaChat(texto: string) {
	return apiPost<EnfileirarChatResponse, SuportePerguntaRequest>(
		'/api/suporte/chat',
		{ texto },
	);
}

type StatusPerguntaResponse =
	| { status: 'pending' }
	| { status: 'completed'; resposta: string }
	| { status: 'error'; error: unknown };

export function consultarStatusPergunta(eventId: string) {
	return apiGet<StatusPerguntaResponse>(`/api/suporte/chat/${eventId}/status`);
}
