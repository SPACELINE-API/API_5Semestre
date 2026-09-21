import { Platform, View, Text, TextInput } from 'react-native';

type DateFieldProps = {
	label: string;
	value: string;
	onChangeText: (value: string) => void;
	placeholder?: string;
};

export function DateField({
	label,
	value,
	onChangeText,
	placeholder,
}: DateFieldProps) {
	return (
		<View className="flex-1 gap-1.5">
			<Text className="font-inter font-semibold text-gray-800 text-xs">
				{label}
			</Text>

			{Platform.OS === 'web' ? (
				<input
					type="date"
					value={value}
					onChange={(event: { target: { value: string } }) =>
						onChangeText(event.target.value)
					}
					className="rounded-lg border border-gray-300 px-3 py-2.5 font-inter text-sm text-gray-900 outline-none"
					style={{ fontFamily: 'inherit', colorScheme: 'light' }}
				/>
			) : (
				<TextInput
					value={value}
					onChangeText={onChangeText}
					placeholder={placeholder}
					placeholderTextColor="#8A8A8A"
					className="rounded-lg border border-gray-300 px-3 py-2.5 font-inter text-sm text-gray-900 outline-none"
				/>
			)}
		</View>
	);
}
