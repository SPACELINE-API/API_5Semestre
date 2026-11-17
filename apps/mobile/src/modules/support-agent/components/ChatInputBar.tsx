import { forwardRef, useState } from 'react';
import { Paperclip, Send } from 'lucide-react-native';
import { Pressable, TextInput, View } from 'react-native';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
type ChatInputBarProps = {
	value: string;
	onChangeText: (value: string) => void;
	onSend: () => void;
	disabled?: boolean;
	canSend?: boolean;
	maxLength?: number;
};

export const ChatInputBar = forwardRef<TextInput, ChatInputBarProps>(
	function ChatInputBar(
		{
			value,
			onChangeText,
			onSend,
			disabled = false,
			canSend = true,
			maxLength,
		},
		ref,
	) {
		const [isFocused, setIsFocused] = useState(false);
		const themeColors = useThemeColors();

		return (
			<View
				className={`flex-row items-center gap-3 rounded-full border-[1.5px] bg-surface py-2.5 pl-4 pr-2 transition-colors duration-200 ${
					isFocused ? 'border-primary' : 'border-border'
				}`}
			>
				<Pressable hitSlop={8} disabled={disabled}>
					<Paperclip color={themeColors.foregroundSubtle} size={20} />
				</Pressable>
				<TextInput
					ref={ref}
					className="min-h-[44px] flex-1 py-2 text-sm text-foreground outline-none max-md:min-w-0 max-md:shrink"
					style={{ lineHeight: 20, textAlignVertical: 'center' }}
					placeholder="Digite sua mensagem..."
					placeholderTextColor={themeColors.foregroundSubtle}
					value={value}
					onChangeText={onChangeText}
					onSubmitEditing={onSend}
					onFocus={() => setIsFocused(true)}
					onBlur={() => setIsFocused(false)}
					returnKeyType="send"
					editable={!disabled}
					maxLength={maxLength}
					blurOnSubmit={false}
				/>
				<Pressable
					className={`mr-0.5 h-10 w-10 items-center justify-center rounded-full ${
						canSend ? 'bg-primary' : 'bg-border-strong'
					}`}
					onPress={onSend}
					disabled={!canSend}
				>
					<Send color={themeColors.primaryForeground} size={18} />
				</Pressable>
			</View>
		);
	},
);
