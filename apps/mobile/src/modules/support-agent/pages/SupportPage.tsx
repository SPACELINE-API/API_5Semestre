import { AlertCircle, Headphones } from 'lucide-react-native';
import { Clock, DollarSign, FileText, Settings } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';
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

export function SupportPage() {
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

	return (
		<View className="flex-1 bg-[#eef6fd]">
			<ScrollView
				className="flex-1"
				contentContainerClassName="px-4 pb-4 pt-5 md:px-8 md:pb-8 md:pt-8"
			>
				<View className="mb-4 flex-row items-center gap-3 md:mb-6 md:gap-4">
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

				<View className="rounded-3xl bg-white p-4 shadow-xl shadow-[#173a68]/10 md:p-6">
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
									onPress={() => sendQuestion(reply.label)}
								/>
							))}
						</View>
					) : null}

					<View className="mt-5 md:mt-6">
						<ChatInputBar
							value={draft}
							onChangeText={setDraft}
							onSend={() => sendQuestion()}
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
			</ScrollView>
		</View>
	);
}
