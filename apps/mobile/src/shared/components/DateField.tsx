import { useState } from 'react';
import { Platform, View, Text, TouchableOpacity } from 'react-native';
import DateTimePicker, {
	type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';

type DateFieldProps = {
	label: string;
	value: string;
	onChangeText: (value: string) => void;
	placeholder?: string;
};

function parseDateValue(value: string): Date {
	if (!value) return new Date();
	const parsed = new Date(`${value}T00:00:00`);
	return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function toDateInputValue(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function formatDisplayValue(value: string): string {
	return parseDateValue(value).toLocaleDateString('pt-BR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	});
}

export function DateField({
	label,
	value,
	onChangeText,
	placeholder,
}: DateFieldProps) {
	const [isPickerVisible, setIsPickerVisible] = useState(false);

	if (Platform.OS === 'web') {
		return (
			<View className="flex-1 gap-1.5">
				<Text className="font-inter font-semibold text-gray-800 text-xs">
					{label}
				</Text>

				<input
					type="date"
					value={value}
					onChange={(event: { target: { value: string } }) =>
						onChangeText(event.target.value)
					}
					className="rounded-lg border border-gray-300 px-3 py-2.5 font-inter text-sm text-gray-900 outline-none"
					style={{ fontFamily: 'inherit', colorScheme: 'light' }}
				/>
			</View>
		);
	}

	function handleChange(event: DateTimePickerEvent, selectedDate?: Date) {
		if (Platform.OS === 'android') {
			setIsPickerVisible(false);
		}

		if (event.type === 'dismissed') return;
		if (selectedDate) onChangeText(toDateInputValue(selectedDate));
	}

	return (
		<View className="flex-1 gap-1.5">
			<Text className="font-inter font-semibold text-gray-800 text-xs">
				{label}
			</Text>

			<TouchableOpacity
				onPress={() => setIsPickerVisible(true)}
				activeOpacity={0.7}
				accessibilityRole="button"
				accessibilityLabel={`Selecionar data: ${label}`}
				className="flex-row items-center justify-between rounded-lg border border-gray-300 px-3 py-2.5"
			>
				<Text
					className={`font-inter text-sm ${value ? 'text-gray-900' : 'text-gray-400'}`}
				>
					{value
						? formatDisplayValue(value)
						: (placeholder ?? 'Selecionar data')}
				</Text>
				<Calendar size={16} color="#8A8A8A" />
			</TouchableOpacity>

			{isPickerVisible && (
				<DateTimePicker
					value={parseDateValue(value)}
					mode="date"
					display={Platform.OS === 'ios' ? 'spinner' : 'default'}
					onChange={handleChange}
				/>
			)}

			{isPickerVisible && Platform.OS === 'ios' && (
				<TouchableOpacity
					onPress={() => setIsPickerVisible(false)}
					activeOpacity={0.7}
					className="self-end rounded-lg bg-gray-100 px-3 py-1.5"
				>
					<Text className="font-inter font-semibold text-gray-700 text-xs">
						Concluir
					</Text>
				</TouchableOpacity>
			)}
		</View>
	);
}
