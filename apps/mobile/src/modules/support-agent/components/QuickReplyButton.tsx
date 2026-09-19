import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Text } from 'react-native';

type QuickReplyButtonProps = {
	icon: LucideIcon;
	label: string;
	onPress?: () => void;
};

export function QuickReplyButton({
	icon: Icon,
	label,
	onPress,
}: QuickReplyButtonProps) {
	return (
		<Pressable
			className="w-full flex-row items-center gap-2.5 rounded-full border border-[#bcdcf5] bg-white px-4 py-2.5 md:w-[calc(50%-6px)] md:px-5 md:py-3"
			onPress={onPress}
		>
			<Icon color="#2478c2" size={18} />
			<Text
				className="flex-1 text-sm font-semibold text-[#2478c2]"
				numberOfLines={1}
			>
				{label}
			</Text>
		</Pressable>
	);
}
