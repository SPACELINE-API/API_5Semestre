import { create } from 'zustand';
import {
	consultarStatusPergunta,
	enviarPerguntaChat,
	QUESTION_MAX_LENGTH,
} from '../services/support-agent';

export type ChatMessage = {
	id: string;
	role: 'user' | 'agent';
	text: string;
	timestamp: string;
};

type ChatStatus = 'idle' | 'loading' | 'error';

function formatTimestamp() {
	return new Date().toLocaleTimeString('pt-BR', {
		hour: '2-digit',
		minute: '2-digit',
	});
}

function createMessageId() {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollForAnswer(
	eventId: string,
	maxAttempts = 60,
	intervalMs = 150000,
): Promise<string> {
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const result = await consultarStatusPergunta(eventId);
		if (result.status === 'completed') return result.resposta;
		if (result.status === 'error') {
			throw new Error('Ocorreu um erro ao processar sua pergunta.');
		} 
		await sleep(intervalMs);
	}
	throw new Error('A resposta demorou mais que o esperado. Tente novamente.');
}

type SupportChatState = {
	messages: ChatMessage[];
	draft: string;
	status: ChatStatus;
	errorMessage: string;
	lastFailedQuestion: string;
	setDraft: (value: string) => void;
	sendQuestion: (overrideText?: string) => Promise<void>;
	retryLastQuestion: () => void;
};

export const useSupportChatStore = create<SupportChatState>()((set, get) => ({
	messages: [],
	draft: '',
	status: 'idle',
	errorMessage: '',
	lastFailedQuestion: '',

	setDraft: (value) => set({ draft: value }),

	sendQuestion: async (overrideText) => {
		const { draft, status } = get();
		const text = (overrideText ?? draft).trim();

		if (!text || text.length > QUESTION_MAX_LENGTH || status === 'loading') {
			return;
		}

		const userMessage: ChatMessage = {
			id: createMessageId(),
			role: 'user',
			text,
			timestamp: formatTimestamp(),
		};

		set((state) => ({
			messages: [...state.messages, userMessage],
			draft: '',
			status: 'loading',
			errorMessage: '',
		}));

		try {
			const { event_id } = await enviarPerguntaChat(text);
			const resposta = await pollForAnswer(event_id);

			const agentMessage: ChatMessage = {
				id: createMessageId(),
				role: 'agent',
				text: resposta,
				timestamp: formatTimestamp(),
			};

			set((state) => ({
				messages: [...state.messages, agentMessage],
				status: 'idle',
				lastFailedQuestion: '',
			}));
		} catch (cause) {
			const rawMessage =
				cause instanceof Error
					? cause.message
					: 'Não foi possível obter uma resposta.';
			const friendlyMessage = rawMessage.startsWith('[object')
				? 'Não foi possível processar sua pergunta. Tente novamente.'
				: rawMessage;

			set({
				errorMessage: friendlyMessage,
				lastFailedQuestion: text,
				status: 'error',
			});
		}
	},

	retryLastQuestion: () => {
		const { lastFailedQuestion, sendQuestion } = get();
		if (!lastFailedQuestion) return;
		sendQuestion(lastFailedQuestion);
	},
}));
