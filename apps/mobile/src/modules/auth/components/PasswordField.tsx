import { forwardRef } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
type PasswordFieldProps = React.ComponentProps<typeof TextInput> & {
	label?: string;
	visible: boolean;
	onToggle: () => void;
};

export const PasswordField = forwardRef<TextInput, PasswordFieldProps>(
	function PasswordField({ label, visible, onToggle, ...props }, ref) {
		const themeColors = useThemeColors();
		return (
			<View>
				{label ? (
					<Text className="mb-2 text-sm font-semibold text-foreground">
						{label}
					</Text>
				) : null}
				<View className="relative">
					<TextInput
						ref={ref}
						{...props}
						className="h-12 rounded-xl border border-border bg-surface-subtle px-4 pr-14 text-sm text-foreground"
						placeholderTextColor={themeColors.foregroundSubtle}
						secureTextEntry={!visible}
					/>
					<Pressable
						className="absolute inset-y-0 right-0 w-14 items-center justify-center"
						accessibilityRole="button"
						accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'}
						onPress={onToggle}
					>
						{visible ? (
							<EyeOff color={themeColors.foregroundMuted} size={20} />
						) : (
							<Eye color={themeColors.foregroundMuted} size={20} />
						)}
					</Pressable>
				</View>
			</View>
		);
	},
);
