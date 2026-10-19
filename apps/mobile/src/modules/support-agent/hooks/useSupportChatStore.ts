import { create } from 'zustand';
import { getSession, onSessionChange } from '../../auth/services/auth';
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
	isCancelled: () => boolean,
	maxAttempts = 200,
	intervalMs = 500,
): Promise<string> {
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		if (isCancelled()) throw new Error('Conversa encerrada.');
		const result = await consultarStatusPergunta(eventId);
		if (result.status === 'completed') return result.resposta;
		if (result.status === 'error') {
			throw new Error('Ocorreu um erro ao processar sua pergunta.');
		}
		await sleep(intervalMs);
	}
	throw new Error('A resposta demorou mais que o esperado. Tente novamente.');
}

type Conversation = {
	messages: ChatMessage[];
	draft: string;
	lastFailedQuestion: string;
};

const emptyConversation: Conversation = {
	messages: [],
	draft: '',
	lastFailedQuestion: '',
};

let conversationEpoch = 0;

type SupportChatState = {
	messages: ChatMessage[];
	draft: string;
	status: ChatStatus;
	errorMessage: string;
	lastFailedQuestion: string;
	activeUserId: string | null;
	savedConversations: Record<string, Conversation>;
	setDraft: (value: string) => void;
	sendQuestion: (overrideText?: string) => Promise<void>;
	retryLastQuestion: () => void;
	switchUser: (userId: string | null) => void;
};

export const useSupportChatStore = create<SupportChatState>()((set, get) => ({
	messages: [],
	draft: '',
	status: 'idle',
	errorMessage: '',
	lastFailedQuestion: '',
	activeUserId: getSession()?.user.id ?? null,
	savedConversations: {},

	setDraft: (value) => set({ draft: value }),

	switchUser: (userId) => {
		const {
			activeUserId,
			messages,
			draft,
			lastFailedQuestion,
			savedConversations,
		} = get();
		if (userId === activeUserId) return;
		conversationEpoch += 1;
		const saved = activeUserId
			? {
					...savedConversations,
					[activeUserId]: { messages, draft, lastFailedQuestion },
				}
			: savedConversations;
		const next = (userId && saved[userId]) || emptyConversation;
		set({
			activeUserId: userId,
			savedConversations: saved,
			messages: next.messages,
			draft: next.draft,
			lastFailedQuestion: next.lastFailedQuestion,
			status: 'idle',
			errorMessage: '',
		});
	},

	sendQuestion: async (overrideText) => {
		const { draft, status } = get();
		const text = (overrideText ?? draft).trim();

		if (!text || text.length > QUESTION_MAX_LENGTH || status === 'loading') {
			return;
		}

		const epoch = conversationEpoch;
		const isCancelled = () => epoch !== conversationEpoch;

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
			if (isCancelled()) return;
			const resposta = await pollForAnswer(event_id, isCancelled);
			if (isCancelled()) return;

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
			if (isCancelled()) return;
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

onSessionChange((userId) => {
	useSupportChatStore.getState().switchUser(userId);
});
