import { apiGetAuth, apiPostAuth } from '../../../shared/services/apiClient';
import type {
	SuportePerguntaRequest,
	SuportePerguntaResponse,
} from '../types/support-agent';

export const QUESTION_MAX_LENGTH = 500;

export function askSupportAgent(texto: string) {
	return apiPostAuth<SuportePerguntaResponse, SuportePerguntaRequest>(
		'/api/suporte/perguntas',
		{ texto },
	);
}

type EnfileirarChatResponse = { event_id: string };

export function enviarPerguntaChat(texto: string) {
	return apiPostAuth<EnfileirarChatResponse, SuportePerguntaRequest>(
		'/api/suporte/chat',
		{ texto },
	);
}

type StatusPerguntaResponse =
	| { status: 'pending' }
	| { status: 'completed'; resposta: string }
	| { status: 'error'; error: unknown };

export function consultarStatusPergunta(eventId: string) {
	return apiGetAuth<StatusPerguntaResponse>(
		`/api/suporte/chat/${eventId}/status`,
	);
}
