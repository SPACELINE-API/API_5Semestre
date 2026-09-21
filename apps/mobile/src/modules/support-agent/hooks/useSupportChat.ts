import { useCallback, useState } from 'react';
import {
	askSupportAgent,
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

export function useSupportChat() {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [draft, setDraft] = useState('');
	const [status, setStatus] = useState<ChatStatus>('idle');
	const [errorMessage, setErrorMessage] = useState('');
	const [lastFailedQuestion, setLastFailedQuestion] = useState('');

	const trimmedDraft = draft.trim();
	const isEmpty = trimmedDraft.length === 0;
	const isOverLimit = draft.length > QUESTION_MAX_LENGTH;
	const canSend = !isEmpty && !isOverLimit && status !== 'loading';

	const sendQuestion = useCallback(
		async (overrideText?: string) => {
			const text = (overrideText ?? draft).trim();

			if (!text || text.length > QUESTION_MAX_LENGTH || status === 'loading') {
				return;
			}

			setErrorMessage('');
			setStatus('loading');

			const userMessage: ChatMessage = {
				id: createMessageId(),
				role: 'user',
				text,
				timestamp: formatTimestamp(),
			};
			setMessages((current) => [...current, userMessage]);
			setDraft('');

			try {
				const response = await askSupportAgent(text);
				const agentMessage: ChatMessage = {
					id: createMessageId(),
					role: 'agent',
					text: response.resposta,
					timestamp: formatTimestamp(),
				};
				setMessages((current) => [...current, agentMessage]);
				setStatus('idle');
				setLastFailedQuestion('');
			} catch (cause) {
				const rawMessage =
					cause instanceof Error
						? cause.message
						: 'Não foi possível obter uma resposta.';
				const friendlyMessage = rawMessage.startsWith('[object')
					? 'Não foi possível processar sua pergunta. Tente novamente.'
					: rawMessage;

				setErrorMessage(friendlyMessage);
				setLastFailedQuestion(text);
				setStatus('error');
			}
		},
		[draft, status],
	);

	const retryLastQuestion = useCallback(() => {
		if (!lastFailedQuestion) return;
		sendQuestion(lastFailedQuestion);
	}, [lastFailedQuestion, sendQuestion]);

	return {
		messages,
		draft,
		setDraft,
		status,
		errorMessage,
		isEmpty,
		isOverLimit,
		canSend,
		sendQuestion,
		retryLastQuestion,
		maxLength: QUESTION_MAX_LENGTH,
	};
}
