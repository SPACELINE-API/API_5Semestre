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

export function ChatInputBar({
	value,
	onChangeText,
	onSend,
	disabled = false,
	canSend = true,
	maxLength,
}: ChatInputBarProps) {
	return (
		<View className="flex-row items-center gap-3 rounded-full border border-[#dce7f2] bg-white py-2.5 pl-4 pr-2">
			<Pressable hitSlop={8} disabled={disabled}>
				<Paperclip color="#8a99b3" size={20} />
			</Pressable>
			<TextInput
				className="h-9 flex-1 text-sm text-[#12233c]"
				placeholder="Digite sua mensagem..."
				placeholderTextColor="#94a3b8"
				value={value}
				onChangeText={onChangeText}
				onSubmitEditing={onSend}
				returnKeyType="send"
				editable={!disabled}
				maxLength={maxLength}
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
}
