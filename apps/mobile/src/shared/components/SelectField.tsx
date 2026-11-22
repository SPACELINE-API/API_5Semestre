import { useMemo, useState } from 'react';
import { SearchTextInput } from './SearchTextInput';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Check, ChevronDown, Search } from 'lucide-react-native';

import { useThemeColors } from '../theme/ThemeProvider';
export type SelectOption = { value: string; label: string };

type SelectFieldProps = {
	label: string;
	value: string;
	options: SelectOption[];
	onChange: (value: string) => void;
	allLabel: string;
	searchable?: boolean;
};

function normalize(text: string): string {
	return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function SelectField({
	label,
	value,
	options,
	onChange,
	allLabel,
	searchable = true,
}: SelectFieldProps) {
	const themeColors = useThemeColors();
	const [isOpen, setIsOpen] = useState(false);
	const [query, setQuery] = useState('');
	const selected = options.find((option) => option.value === value);

	const visibleOptions = useMemo(() => {
		if (!searchable) return [{ value: '', label: allLabel }, ...options];
		const term = normalize(query.trim());
		if (!term) return [{ value: '', label: allLabel }, ...options];
		return options.filter((option) => normalize(option.label).includes(term));
	}, [allLabel, options, query, searchable]);

	function close() {
		setIsOpen(false);
		setQuery('');
	}

	function select(next: string) {
		onChange(next);
		close();
	}

	return (
		<View className="gap-1.5" style={{ zIndex: isOpen ? 50 : 1 }}>
			<Text className="font-inter font-semibold text-foreground text-xs">
				{label}
			</Text>
			<TouchableOpacity
				onPress={() => setIsOpen((current) => !current)}
				activeOpacity={0.7}
				accessibilityRole="button"
				accessibilityLabel={label}
				className="h-10 flex-row items-center justify-between gap-2 rounded-lg border border-border-strong bg-surface px-3"
			>
				<Text
					className={`flex-1 font-inter text-sm ${selected ? 'text-foreground' : 'text-foreground-muted'}`}
					numberOfLines={1}
				>
					{selected?.label ?? allLabel}
				</Text>
				<ChevronDown size={16} color={themeColors.foregroundMuted} />
			</TouchableOpacity>

			{isOpen && (
				<View className="overflow-hidden rounded-lg border border-border bg-surface pb-2 shadow-lg">
					{searchable && (
						<View className="mx-3 mt-3 flex-row items-center gap-2 rounded-lg border border-border-strong px-3">
							<Search size={14} color={themeColors.foregroundSubtle} />
							<SearchTextInput
								value={query}
								onChangeText={setQuery}
								placeholder="Pesquisar"
								numberOfLines={1}
								placeholderTextColor={themeColors.foregroundSubtle}
								accessibilityLabel={`Pesquisar ${label}`}
								className="h-10 flex-1 font-inter text-ellipsis text-foreground text-sm"
							/>
						</View>
					)}
					<ScrollView
						className="px-4"
						style={{ maxHeight: 300 }}
						keyboardShouldPersistTaps="handled"
					>
						{visibleOptions.length === 0 && (
							<Text className="py-3 font-inter text-foreground-subtle text-sm">
								Nenhum resultado.
							</Text>
						)}
						{visibleOptions.map((option) => {
							const isSelected = option.value === value;

							return (
								<TouchableOpacity
									key={option.value || 'all'}
									onPress={() => select(option.value)}
									activeOpacity={0.7}
									className="flex-row items-center justify-between border-b border-border-subtle py-3"
								>
									<Text
										className={`flex-1 font-inter text-sm ${isSelected ? 'font-semibold text-primary-text' : 'text-foreground'}`}
									>
										{option.label}
									</Text>
									{isSelected && (
										<Check size={16} color={themeColors.primary} />
									)}
								</TouchableOpacity>
							);
						})}
					</ScrollView>
				</View>
			)}
		</View>
	);
}
