import { View, Text, TextInput, ActivityIndicator } from 'react-native';

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
	return (
		<View className="flex-1 gap-1.5">
			<View className="flex-row items-center gap-2">
				<Text className="font-inter font-semibold text-gray-800 text-xs">
					{label}
				</Text>
				{loading && <ActivityIndicator size="small" color="#1C6FB0" />}
			</View>
			<TextInput
				value={value}
				onChangeText={onChangeText}
				placeholder={placeholder}
				placeholderTextColor="#8A8A8A"
				autoCapitalize={autoCapitalize}
				maxLength={maxLength}
				className={`rounded-lg border px-3 py-2.5 font-inter text-sm text-gray-900 outline-none ${
					error ? 'border-red-900' : 'border-gray-300'
				}`}
			/>
			{error && (
				<Text className="font-inter text-red-900 text-xs">{error}</Text>
			)}
		</View>
	);
}
