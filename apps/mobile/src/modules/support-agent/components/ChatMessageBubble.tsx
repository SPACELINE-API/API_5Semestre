import { useEffect, useMemo, useState } from 'react';
import { Bot, User } from 'lucide-react-native';
import { Linking, Platform, Text, View } from 'react-native';
import Constants from 'expo-constants';
import Markdown from 'react-native-markdown-display';
import { resolveNativeResourceUrl } from '../../../shared/utils/nativeResourceUrl';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';

import { type ThemeColors } from '../../../shared/theme/types';
type ChatMessageBubbleProps = {
	role: 'user' | 'agent';
	message: string;
	timestamp: string;
	loading?: boolean;
};

function buildMarkdownStyles(themeColors: ThemeColors) {
	return {
		body: { fontSize: 14, lineHeight: 22, color: themeColors.foreground },
		paragraph: { marginTop: 0, marginBottom: 8 },
		strong: { fontWeight: '700' as const, color: themeColors.foreground },
		em: { fontStyle: 'italic' as const },
		s: {
			textDecorationLine: 'line-through' as const,
			color: themeColors.foregroundMuted,
		},
		heading1: {
			fontSize: 20,
			fontWeight: '800' as const,
			color: themeColors.foreground,
			marginTop: 8,
			marginBottom: 6,
		},
		heading2: {
			fontSize: 17,
			fontWeight: '700' as const,
			color: themeColors.foreground,
			marginTop: 8,
			marginBottom: 4,
		},
		heading3: {
			fontSize: 15,
			fontWeight: '700' as const,
			color: themeColors.foreground,
			marginTop: 6,
			marginBottom: 4,
		},
		bullet_list: { marginVertical: 4 },
		ordered_list: { marginVertical: 4 },
		list_item: { marginVertical: 2, flexDirection: 'row' as const },
		bullet_list_icon: { marginRight: 6, color: themeColors.primaryText },
		bullet_list_content: { flex: 1 },
		ordered_list_icon: {
			marginRight: 6,
			color: themeColors.primaryText,
			fontWeight: '700' as const,
		},
		ordered_list_content: { flex: 1 },
		code_inline: {
			backgroundColor: themeColors.border,
			color: themeColors.foreground,
			paddingHorizontal: 4,
			paddingVertical: 1,
			borderRadius: 4,
			fontFamily: 'monospace',
			fontSize: 13,
		},
		code_block: {
			backgroundColor: themeColors.foreground,
			color: themeColors.foregroundInverse,
			padding: 10,
			borderRadius: 8,
			fontFamily: 'monospace',
			fontSize: 13,
			marginVertical: 6,
		},
		fence: {
			backgroundColor: themeColors.foreground,
			color: themeColors.foregroundInverse,
			padding: 10,
			borderRadius: 8,
			fontFamily: 'monospace',
			fontSize: 13,
			marginVertical: 6,
		},
		blockquote: {
			backgroundColor: themeColors.surfaceSubtle,
			borderLeftWidth: 3,
			borderLeftColor: themeColors.primary,
			paddingLeft: 10,
			paddingVertical: 4,
			marginVertical: 6,
		},
		link: {
			color: themeColors.primaryText,
			textDecorationLine: 'underline' as const,
		},
		hr: { backgroundColor: themeColors.border, height: 1, marginVertical: 10 },
		table: {
			borderWidth: 1,
			borderColor: themeColors.border,
			borderRadius: 6,
			marginVertical: 6,
		},
		thead: { backgroundColor: themeColors.primarySoft },
		th: {
			padding: 6,
			fontWeight: '700' as const,
			color: themeColors.foreground,
		},
		tr: { borderBottomWidth: 1, borderColor: themeColors.border },
		td: { padding: 6, color: themeColors.foreground },
	};
}

function openChatLink(url: string) {
	const target = url.startsWith('/')
		? resolveNativeResourceUrl(url, Constants.expoConfig?.hostUri, Platform.OS)
		: url;

	if (Platform.OS === 'web') {
		const isFile = /\.(csv|xlsx)(\?|$)/i.test(target);
		if (!isFile) {
			window.open(target, '_blank');
			return;
		}
		const frame = document.createElement('iframe');
		frame.style.display = 'none';
		frame.src = target;
		document.body.appendChild(frame);
		window.setTimeout(() => frame.remove(), 60_000);
		return;
	}

	void Linking.openURL(target);
}

function TypingIndicator() {
	const [dotCount, setDotCount] = useState(1);

	useEffect(() => {
		const interval = setInterval(() => {
			setDotCount((prev) => (prev % 3) + 1);
		}, 400);
		return () => clearInterval(interval);
	}, []);

	return (
		<Text className="text-sm leading-6 text-foreground">
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
	const themeColors = useThemeColors();
	const markdownStyles = useMemo(
		() => buildMarkdownStyles(themeColors),
		[themeColors],
	);
	const isUser = role === 'user';

	return (
		<View
			className={`flex-row items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
		>
			<View
				className={`h-10 w-10 shrink-0 items-center justify-center rounded-full md:h-11 md:w-11 ${
					isUser ? 'bg-foreground-muted' : 'bg-primary'
				}`}
			>
				{isUser ? (
					<User color={themeColors.primaryForeground} size={18} />
				) : (
					<Bot color={themeColors.primaryForeground} size={20} />
				)}
			</View>
			<View className={`flex-1 ${isUser ? 'items-end' : 'items-start'}`}>
				<View
					className={`rounded-2xl px-4 py-3 md:max-w-xl md:px-5 md:py-4 ${
						isUser
							? 'rounded-tr-sm bg-primary'
							: 'rounded-tl-sm bg-primary-soft'
					} ${loading ? 'opacity-60' : ''}`}
				>
					{loading ? (
						<TypingIndicator />
					) : isUser ? (
						<Text className="text-sm leading-6 text-primary-foreground">
							{message}
						</Text>
					) : (
						<Markdown
							style={markdownStyles}
							onLinkPress={(url) => {
								openChatLink(url);
								return false;
							}}
						>
							{message}
						</Markdown>
					)}
				</View>
				{timestamp ? (
					<Text className="mt-1.5 text-xs text-foreground-subtle">
						{timestamp}
					</Text>
				) : null}
			</View>
		</View>
	);
}
