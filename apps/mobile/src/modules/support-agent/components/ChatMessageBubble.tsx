import { useEffect, useState } from 'react';
import { Bot, User } from 'lucide-react-native';
import { Text, View } from 'react-native';
import Markdown from 'react-native-markdown-display';

type ChatMessageBubbleProps = {
	role: 'user' | 'agent';
	message: string;
	timestamp: string;
	loading?: boolean;
};

const markdownStyles = {
	body: { fontSize: 14, lineHeight: 22, color: '#1a2942' },
	paragraph: { marginTop: 0, marginBottom: 8 },
	strong: { fontWeight: '700' as const, color: '#101b35' },
	em: { fontStyle: 'italic' as const },
	s: { textDecorationLine: 'line-through' as const, color: '#65758f' },
	heading1: {
		fontSize: 20,
		fontWeight: '800' as const,
		color: '#101b35',
		marginTop: 8,
		marginBottom: 6,
	},
	heading2: {
		fontSize: 17,
		fontWeight: '700' as const,
		color: '#101b35',
		marginTop: 8,
		marginBottom: 4,
	},
	heading3: {
		fontSize: 15,
		fontWeight: '700' as const,
		color: '#12233c',
		marginTop: 6,
		marginBottom: 4,
	},
	bullet_list: { marginVertical: 4 },
	ordered_list: { marginVertical: 4 },
	list_item: { marginVertical: 2, flexDirection: 'row' as const },
	bullet_list_icon: { marginRight: 6, color: '#2d83cd' },
	bullet_list_content: { flex: 1 },
	ordered_list_icon: {
		marginRight: 6,
		color: '#2d83cd',
		fontWeight: '700' as const,
	},
	ordered_list_content: { flex: 1 },
	code_inline: {
		backgroundColor: '#dce7f2',
		color: '#12233c',
		paddingHorizontal: 4,
		paddingVertical: 1,
		borderRadius: 4,
		fontFamily: 'monospace',
		fontSize: 13,
	},
	code_block: {
		backgroundColor: '#12233c',
		color: '#e5f1fc',
		padding: 10,
		borderRadius: 8,
		fontFamily: 'monospace',
		fontSize: 13,
		marginVertical: 6,
	},
	fence: {
		backgroundColor: '#12233c',
		color: '#e5f1fc',
		padding: 10,
		borderRadius: 8,
		fontFamily: 'monospace',
		fontSize: 13,
		marginVertical: 6,
	},
	blockquote: {
		backgroundColor: '#f0f6fc',
		borderLeftWidth: 3,
		borderLeftColor: '#2d83cd',
		paddingLeft: 10,
		paddingVertical: 4,
		marginVertical: 6,
	},
	link: { color: '#2478c2', textDecorationLine: 'underline' as const },
	hr: { backgroundColor: '#dce7f2', height: 1, marginVertical: 10 },
	table: {
		borderWidth: 1,
		borderColor: '#dce7f2',
		borderRadius: 6,
		marginVertical: 6,
	},
	thead: { backgroundColor: '#e5f1fc' },
	th: { padding: 6, fontWeight: '700' as const, color: '#101b35' },
	tr: { borderBottomWidth: 1, borderColor: '#dce7f2' },
	td: { padding: 6, color: '#1a2942' },
};

function TypingIndicator() {
	const [dotCount, setDotCount] = useState(1);

	useEffect(() => {
		const interval = setInterval(() => {
			setDotCount((prev) => (prev % 3) + 1);
		}, 400);
		return () => clearInterval(interval);
	}, []);

	return (
		<Text className="text-sm leading-6 text-[#1a2942]">
			Elaborando resposta{'.'.repeat(dotCount)}
		</Text>
	);
}

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
					{loading ? (
						<TypingIndicator />
					) : isUser ? (
						<Text className="text-sm leading-6 text-white">{message}</Text>
					) : (
						<Markdown style={markdownStyles}>{message}</Markdown>
					)}
				</View>
				{timestamp ? (
					<Text className="mt-1.5 text-xs text-[#8a99b3]">{timestamp}</Text>
				) : null}
			</View>
		</View>
	);
}
