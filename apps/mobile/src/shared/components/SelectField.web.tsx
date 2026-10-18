import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
	Pressable,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { Check, ChevronDown, Search } from 'lucide-react-native';

export type SelectOption = { value: string; label: string };

type SelectFieldProps = {
	label: string;
	value: string;
	options: SelectOption[];
	onChange: (value: string) => void;
	allLabel: string;
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
}: SelectFieldProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [query, setQuery] = useState('');
	const triggerRef = useRef<View>(null);
	const [rect, setRect] = useState<{
		top: number;
		left: number;
		width: number;
	} | null>(null);
	const selected = options.find((option) => option.value === value);

	const visibleOptions = useMemo(() => {
		const term = normalize(query.trim());
		const all = [{ value: '', label: allLabel }, ...options];
		if (!term) return all;
		return options.filter((option) => normalize(option.label).includes(term));
	}, [allLabel, options, query]);

	useEffect(() => {
		if (!isOpen) return;
		function measure() {
			const node = triggerRef.current as unknown as HTMLElement | null;
			if (!node) return;
			const box = node.getBoundingClientRect();
			setRect({ top: box.bottom, left: box.left, width: box.width });
		}
		measure();
		window.addEventListener('resize', measure);
		window.addEventListener('scroll', measure, true);
		return () => {
			window.removeEventListener('resize', measure);
			window.removeEventListener('scroll', measure, true);
		};
	}, [isOpen]);

	function close() {
		setIsOpen(false);
		setQuery('');
	}

	function select(next: string) {
		onChange(next);
		close();
	}

	const dropdown =
		isOpen && rect ? (
			<>
				<Pressable
					onPress={close}
					accessibilityLabel={`Fechar ${label}`}
					style={{
						position: 'fixed' as never,
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						zIndex: 9998,
					}}
				/>
				<View
					className="overflow-hidden rounded-lg border border-gray-200 bg-white"
					style={{
						position: 'fixed' as never,
						top: rect.top + 4,
						left: rect.left,
						width: rect.width,
						zIndex: 9999,
						boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
					}}
				>
					<View className="flex-row items-center gap-2 border-b border-gray-100 px-3">
						<Search size={14} color="#9CA3AF" />
						<TextInput
							autoFocus
							value={query}
							onChangeText={setQuery}
							placeholder="Pesquisar"
							placeholderTextColor="#9CA3AF"
							accessibilityLabel={`Pesquisar ${label}`}
							className="h-10 flex-1 font-inter text-gray-900 text-sm outline-none"
						/>
					</View>
					<ScrollView
						style={{ maxHeight: 240 }}
						keyboardShouldPersistTaps="handled"
					>
						{visibleOptions.length === 0 && (
							<Text className="px-3 py-3 font-inter text-gray-400 text-sm">
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
									className={`flex-row items-center justify-between px-3 py-2.5 hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
								>
									<Text
										className={`flex-1 font-inter text-sm ${isSelected ? 'font-semibold text-blue-600' : 'text-gray-800'}`}
										numberOfLines={1}
									>
										{option.label}
									</Text>
									{isSelected && <Check size={14} color="#1C6FB0" />}
								</TouchableOpacity>
							);
						})}
					</ScrollView>
				</View>
			</>
		) : null;

	return (
		<View className="gap-1.5">
			<Text className="font-inter font-semibold text-gray-800 text-xs">
				{label}
			</Text>
			<TouchableOpacity
				ref={triggerRef}
				onPress={() => (isOpen ? close() : setIsOpen(true))}
				activeOpacity={0.7}
				accessibilityRole="button"
				accessibilityLabel={label}
				accessibilityState={{ expanded: isOpen }}
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
			{dropdown && createPortal(dropdown, document.body)}
		</View>
	);
}
