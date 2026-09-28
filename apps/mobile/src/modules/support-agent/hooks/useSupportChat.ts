import { useSupportChatStore } from './useSupportChatStore';

export function useSupportChat() {
	const messages = useSupportChatStore((state) => state.messages);
	const draft = useSupportChatStore((state) => state.draft);
	const status = useSupportChatStore((state) => state.status);
	const errorMessage = useSupportChatStore((state) => state.errorMessage);
	const setDraft = useSupportChatStore((state) => state.setDraft);
	const sendQuestion = useSupportChatStore((state) => state.sendQuestion);
	const retryLastQuestion = useSupportChatStore(
		(state) => state.retryLastQuestion,
	);

	const trimmedDraft = draft.trim();
	const isEmpty = trimmedDraft.length === 0;
	const isOverLimit = draft.length > 500; // ou importa QUESTION_MAX_LENGTH
	const canSend = !isEmpty && !isOverLimit && status !== 'loading';

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
		maxLength: 500,
	};
}
