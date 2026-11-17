import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Text } from 'react-native';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
type QuickReplyButtonProps = {
	icon: LucideIcon;
	label: string;
	onPress?: () => void;
	disabled?: boolean;
};

export function QuickReplyButton({
	icon: Icon,
	label,
	onPress,
	disabled = false,
}: QuickReplyButtonProps) {
	const themeColors = useThemeColors();
	return (
		<Pressable
			className={`w-full flex-row items-center gap-2.5 rounded-full border border-border bg-surface px-4 py-2.5 md:w-[calc(50%-6px)] md:px-5 md:py-3 ${disabled ? 'opacity-40' : ''}`}
			onPress={onPress}
			disabled={disabled}
		>
			<Icon color={themeColors.primaryText} size={18} />
			<Text
				className="flex-1 text-sm font-semibold text-primary-text"
				numberOfLines={1}
			>
				{label}
			</Text>
		</Pressable>
	);
}
