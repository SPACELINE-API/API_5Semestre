import { useState } from 'react';
import {
	Modal,
	Pressable,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { Check, ChevronDown, X } from 'lucide-react-native';

export type SelectOption = { value: string; label: string };

type SelectFieldProps = {
	label: string;
	value: string;
	options: SelectOption[];
	onChange: (value: string) => void;
	allLabel: string;
};

export function SelectField({
	label,
	value,
	options,
	onChange,
	allLabel,
}: SelectFieldProps) {
	const [isOpen, setIsOpen] = useState(false);
	const selected = options.find((option) => option.value === value);

	function select(next: string) {
		onChange(next);
		setIsOpen(false);
	}

	return (
		<View className="gap-1.5">
			<Text className="font-inter font-semibold text-gray-800 text-xs">
				{label}
			</Text>
			<TouchableOpacity
				onPress={() => setIsOpen(true)}
				activeOpacity={0.7}
				accessibilityRole="button"
				accessibilityLabel={label}
				className="h-10 flex-row items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3"
			>
				<Text
					className={`flex-1 font-inter text-sm ${selected ? 'text-gray-900' : 'text-gray-500'}`}
					numberOfLines={1}
				>
					{selected?.label ?? allLabel}
				</Text>
				<ChevronDown size={16} color="#6B7280" />
			</TouchableOpacity>

			<Modal
				visible={isOpen}
				transparent
				animationType="fade"
				onRequestClose={() => setIsOpen(false)}
			>
				<View className="flex-1 items-center justify-center px-4">
					<Pressable
						className="absolute inset-0 bg-black/40"
						onPress={() => setIsOpen(false)}
						accessibilityLabel={`Fechar ${label}`}
					/>
					<View className="max-h-[80%] w-full max-w-[400px] overflow-hidden rounded-xl bg-white pb-2">
						<View className="flex-row items-center justify-between border-b border-gray-300 p-4">
							<Text className="font-inter font-bold text-gray-900 text-lg">
								{label}
							</Text>
							<TouchableOpacity onPress={() => setIsOpen(false)}>
								<X size={20} color="#5A5A5A" />
							</TouchableOpacity>
						</View>
						<ScrollView className="px-4" keyboardShouldPersistTaps="handled">
							{[{ value: '', label: allLabel }, ...options].map((option) => {
								const isSelected = option.value === value;

								return (
									<TouchableOpacity
										key={option.value || 'all'}
										onPress={() => select(option.value)}
										activeOpacity={0.7}
										className="flex-row items-center justify-between border-b border-gray-100 py-3"
									>
										<Text
											className={`flex-1 font-inter text-sm ${isSelected ? 'font-semibold text-blue-600' : 'text-gray-800'}`}
										>
											{option.label}
										</Text>
										{isSelected && <Check size={16} color="#1C6FB0" />}
									</TouchableOpacity>
								);
							})}
						</ScrollView>
					</View>
				</View>
			</Modal>
		</View>
	);
}
