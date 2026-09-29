import { useEffect, useRef, useState } from 'react';
import {
	AlertCircle,
	Clock,
	DollarSign,
	FileText,
	Headphones,
	Settings,
} from 'lucide-react-native';
import {
	Platform,
	ScrollView,
	Text,
	TextInput,
	View,
	useWindowDimensions,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ChatInputBar } from '../components/ChatInputBar';
import { ChatMessageBubble } from '../components/ChatMessageBubble';
import { QuickReplyButton } from '../components/QuickReplyButton';
import { useSupportChat } from '../hooks/useSupportChat';

const WELCOME_MESSAGE =
	'Olá! Eu sou o assistente virtual da nossa equipe de suporte. Posso te ajudar com dúvidas sobre serviços, prazos, configurações e muito mais.\n\nComo posso te ajudar hoje?';

const QUICK_REPLIES = [
	{ icon: FileText, label: 'Status de uma tradução' },
	{ icon: Clock, label: 'Prazos e entregas' },
	{ icon: DollarSign, label: 'Orçamento' },
	{ icon: Settings, label: 'Problemas técnicos' },
];

const SCROLL_CLASSNAME =
	'flex-1 [scroll-behavior:smooth] [scrollbar-width:thin] [scrollbar-color:#bcdcf5_transparent] ' +
	'[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent ' +
	'[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#bcdcf5] ' +
	'hover:[&::-webkit-scrollbar-thumb]:bg-[#2d83cd]';

export function SupportPage() {
	const { width } = useWindowDimensions();
	const isMobileLayout = width < 768;
	const [webViewportHeight, setWebViewportHeight] = useState<number | null>(null);
	const inputRef = useRef<TextInput>(null);
	const scrollRef = useRef<ScrollView>(null);
	const previousStatusRef = useRef<'idle' | 'loading' | 'error'>('idle');

	const {
		messages,
		draft,
		setDraft,
		status,
		errorMessage,
		isOverLimit,
		canSend,
		sendQuestion,
		retryLastQuestion,
		maxLength,
	} = useSupportChat();

	const isTouchDevice =
		Platform.OS !== 'web' ||
		(typeof window !== 'undefined' &&
			window.matchMedia?.('(pointer: coarse)').matches === true);

	useEffect(() => {
		if (Platform.OS !== 'web' || !isMobileLayout || typeof window === 'undefined') {
			setWebViewportHeight(null);
			return;
		}

		const viewport = window.visualViewport;

		const updateHeight = () => {
			const page = document.getElementById('support-agent-page');
			const pageTop = page?.getBoundingClientRect().top ?? 0;
			const viewportTop = viewport?.offsetTop ?? 0;
			setWebViewportHeight(
				Math.max(
					0,
					(viewport?.height ?? window.innerHeight) -
						Math.max(0, pageTop - viewportTop),
				),
			);
		};

		updateHeight();
		viewport?.addEventListener('resize', updateHeight);
		viewport?.addEventListener('scroll', updateHeight);
		window.addEventListener('resize', updateHeight);
		return () => {
			viewport?.removeEventListener('resize', updateHeight);
			viewport?.removeEventListener('scroll', updateHeight);
			window.removeEventListener('resize', updateHeight);
		};
	}, [isMobileLayout]);

	useEffect(() => {
		if (!isTouchDevice) inputRef.current?.focus();
	}, [isTouchDevice]);

	useEffect(() => {
		if (typeof document === 'undefined' || isTouchDevice) return;

		function handleGlobalKeyDown(event: KeyboardEvent) {
			if (document.activeElement === inputRef.current) return;

			const activeTag = document.activeElement?.tagName;
			const isTypingElsewhere =
				activeTag === 'INPUT' || activeTag === 'TEXTAREA';
			if (isTypingElsewhere) return;

			const isModifierPressed = event.ctrlKey || event.metaKey || event.altKey;
			const isPrintableChar = event.key.length === 1;
			if (!isPrintableChar || isModifierPressed) return;

			inputRef.current?.focus();
			setDraft(draft + event.key);
		}

		document.addEventListener('keydown', handleGlobalKeyDown);
		return () => document.removeEventListener('keydown', handleGlobalKeyDown);
	}, [isTouchDevice, setDraft]);

	useEffect(() => {
		const wasLoading = previousStatusRef.current === 'loading';
		const finishedLoading = wasLoading && status !== 'loading';
		if (finishedLoading && !isTouchDevice) {
			inputRef.current?.focus();
		}
		previousStatusRef.current = status;
	}, [isTouchDevice, status]);

	function handleSend() {
		sendQuestion();
	}

	function handleQuickReply(label: string) {
		sendQuestion(label);
	}

	const pageStyle =
		Platform.OS === 'web' && isMobileLayout && webViewportHeight !== null
			? { height: webViewportHeight, flex: 0, minHeight: 0 }
			: undefined;
	const pageContent = (
		<View
			nativeID="support-agent-page"
			style={pageStyle}
			className="flex-1 min-h-0 bg-[#eef6fd] px-3 py-2 md:px-8 md:py-8"
		>
			<View className="mb-2 flex-row items-center gap-3 md:mb-6 md:gap-4">
				<View className="h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#d9ecfb] md:h-14 md:w-14">
					<Headphones color="#2478c2" size={22} />
				</View>
				<View className="flex-1">
					<Text className="text-2xl font-extrabold tracking-[-0.5px] text-[#101b35] md:text-3xl">
						Suporte
					</Text>
					<Text className="mt-0.5 text-xs text-[#65758f] md:mt-1 md:text-sm">
						Tire suas dúvidas e resolva suas questões com nosso assistente
						virtual.
					</Text>
				</View>
			</View>

			<View className="min-h-0 flex-1 rounded-3xl bg-white p-3 shadow-xl shadow-[#173a68]/10 md:p-6">
				<ScrollView
					ref={scrollRef}
					className={SCROLL_CLASSNAME}
					onContentSizeChange={() =>
						scrollRef.current?.scrollToEnd({ animated: true })
					}
				>
					<ChatMessageBubble
						role="agent"
						message={WELCOME_MESSAGE}
						timestamp=""
					/>

					{messages.map((message) => (
						<View key={message.id} className="mt-4">
							<ChatMessageBubble
								role={message.role}
								message={message.text}
								timestamp={message.timestamp}
							/>
						</View>
					))}

					{status === 'loading' ? (
						<View className="mt-4">
							<ChatMessageBubble
								role="agent"
								message="Elaborando resposta..."
								timestamp=""
								loading
							/>
						</View>
					) : null}

					{status === 'error' ? (
						<View className="mt-4 flex-row items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
							<AlertCircle color="#dc2626" size={18} />
							<View className="flex-1">
								<Text className="text-sm text-red-700">{errorMessage}</Text>
								<Text
									className="mt-1.5 text-sm font-semibold text-red-700 underline"
									onPress={retryLastQuestion}
								>
									Tentar novamente
								</Text>
							</View>
						</View>
					) : null}

					{messages.length === 0 ? (
						<View className="mt-5 flex-col gap-2.5 md:mt-6 md:flex-row md:flex-wrap md:gap-3">
							{QUICK_REPLIES.map((reply) => (
								<QuickReplyButton
									key={reply.label}
									icon={reply.icon}
									label={reply.label}
									onPress={() => handleQuickReply(reply.label)}
								/>
							))}
						</View>
					) : null}
				</ScrollView>

				<View className="mt-2 md:mt-4">
					<ChatInputBar
						ref={inputRef}
						value={draft}
						onChangeText={setDraft}
						onSend={handleSend}
						disabled={status === 'loading'}
						canSend={canSend}
						maxLength={maxLength}
					/>
					{isOverLimit ? (
						<Text className="mt-1.5 text-xs text-red-600">
							Sua pergunta ultrapassa o limite de {maxLength} caracteres.
						</Text>
					) : (
						<Text className="mt-1.5 text-xs text-[#94a3b8]">
							{draft.length}/{maxLength}
						</Text>
					)}
				</View>
			</View>
		</View>
	);

	if (Platform.OS !== 'web' && isMobileLayout) {
		return (
			<KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
				{pageContent}
			</KeyboardAvoidingView>
		);
	}

	return pageContent;
}
