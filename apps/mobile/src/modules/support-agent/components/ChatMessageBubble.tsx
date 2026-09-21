import { Bot, User } from 'lucide-react-native';
import { Text, View } from 'react-native';

type ChatMessageBubbleProps = {
	role: 'user' | 'agent';
	message: string;
	timestamp: string;
	loading?: boolean;
};

export function ChatMessageBubble({
	role,
	message,
	timestamp,
	loading = false,
}: ChatMessageBubbleProps) {
	const isUser = role === 'user';

	return (
		<View
			className={`flex-row items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
		>
			<View
				className={`h-10 w-10 shrink-0 items-center justify-center rounded-full md:h-11 md:w-11 ${
					isUser ? 'bg-[#65758f]' : 'bg-[#2d83cd]'
				}`}
			>
				{isUser ? (
					<User color="#ffffff" size={18} />
				) : (
					<Bot color="#ffffff" size={20} />
				)}
			</View>
			<View className={`flex-1 ${isUser ? 'items-end' : 'items-start'}`}>
				<View
					className={`rounded-2xl px-4 py-3 md:max-w-xl md:px-5 md:py-4 ${
						isUser ? 'rounded-tr-sm bg-[#2d83cd]' : 'rounded-tl-sm bg-[#e5f1fc]'
					} ${loading ? 'opacity-60' : ''}`}
				>
					<Text
						className={`text-sm leading-6 ${isUser ? 'text-white' : 'text-[#1a2942]'}`}
					>
						{message}
					</Text>
				</View>
				{timestamp ? (
					<Text className="mt-1.5 text-xs text-[#8a99b3]">{timestamp}</Text>
				) : null}
			</View>
		</View>
	);
}
