import { View, Text, TextInput, ActivityIndicator } from 'react-native';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
type FormFieldProps = {
	label: string;
	value: string;
	onChangeText: (value: string) => void;
	placeholder: string;
	error?: string;
	autoCapitalize?: 'characters' | 'none' | 'words';
	maxLength?: number;
	loading?: boolean;
};

export function FormField({
	label,
	value,
	onChangeText,
	placeholder,
	error,
	autoCapitalize,
	maxLength,
	loading,
}: FormFieldProps) {
	const themeColors = useThemeColors();
	return (
		<View className="flex-1 gap-1.5">
			<View className="flex-row items-center gap-2">
				<Text className="font-inter font-semibold text-foreground text-xs">
					{label}
				</Text>
				{loading && (
					<ActivityIndicator size="small" color={themeColors.primary} />
				)}
			</View>
			<TextInput
				value={value}
				onChangeText={onChangeText}
				placeholder={placeholder}
				placeholderTextColor={themeColors.foregroundMuted}
				autoCapitalize={autoCapitalize}
				maxLength={maxLength}
				className={`rounded-lg border px-3 py-2.5 font-inter text-sm text-foreground outline-none ${
					error ? 'border-danger-text' : 'border-border-strong'
				}`}
			/>
			{error && (
				<Text className="font-inter text-danger-text text-xs">{error}</Text>
			)}
		</View>
	);
}
