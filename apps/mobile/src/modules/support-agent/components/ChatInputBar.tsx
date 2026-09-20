import { forwardRef, useState } from 'react';
import { Paperclip, Send } from 'lucide-react-native';
import { Pressable, TextInput, View } from 'react-native';

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

		return (
			<View
				className={`flex-row items-center gap-3 rounded-full border-[1.5px] bg-white py-2.5 pl-4 pr-2 transition-colors duration-200 ${
					isFocused ? 'border-[#2d83cd]' : 'border-[#dce7f2]'
				}`}
			>
				<Pressable hitSlop={8} disabled={disabled}>
					<Paperclip color="#8a99b3" size={20} />
				</Pressable>
				<TextInput
					ref={ref}
					className="h-9 flex-1 text-sm text-[#12233c] outline-none"
					placeholder="Digite sua mensagem..."
					placeholderTextColor="#94a3b8"
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
						canSend ? 'bg-[#2d83cd]' : 'bg-[#a9c7e4]'
					}`}
					onPress={onSend}
					disabled={!canSend}
				>
					<Send color="#ffffff" size={18} />
				</Pressable>
			</View>
		);
	},
);
