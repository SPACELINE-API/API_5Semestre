import { useEffect, useMemo, useRef, useState } from 'react';
import { SearchTextInput } from './SearchTextInput';
import { createPortal } from 'react-dom';
import {
	Pressable,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
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
	const triggerRef = useRef<View>(null);
	const [rect, setRect] = useState<{
		top: number;
		left: number;
		width: number;
	} | null>(null);
	const selected = options.find((option) => option.value === value);

	const visibleOptions = useMemo(() => {
		const all = [{ value: '', label: allLabel }, ...options];
		if (!searchable) return all;
		const term = normalize(query.trim());
		if (!term) return all;
		return options.filter((option) => normalize(option.label).includes(term));
	}, [allLabel, options, query, searchable]);

	useEffect(() => {
		if (!isOpen) return;
		function measure() {
			const node = triggerRef.current as unknown as HTMLElement | null;
			if (!node) return;
			const box = node.getBoundingClientRect();
			setRect({ top: box.bottom, left: box.left, width: box.width });
		}
		measure();
		function handleScroll(event: Event) {
			const target = event.target;
			if (
				target instanceof Element &&
				target.closest('.select-field-dropdown')
			) {
				return;
			}
			close();
		}
		window.addEventListener('resize', measure);
		window.addEventListener('scroll', handleScroll, true);
		function handleOutsidePointerDown(event: PointerEvent) {
			const target = event.target;
			if (!(target instanceof Element)) return;
			const trigger = triggerRef.current as unknown as HTMLElement | null;
			if (
				trigger?.contains(target) ||
				target.closest('.select-field-trigger') ||
				target.closest('.select-field-dropdown')
			) {
				return;
			}
			close();
		}
		document.addEventListener('pointerdown', handleOutsidePointerDown);
		return () => {
			window.removeEventListener('resize', measure);
			window.removeEventListener('scroll', handleScroll, true);
			document.removeEventListener('pointerdown', handleOutsidePointerDown);
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
					className="select-field-dropdown overflow-hidden rounded-lg border border-border bg-surface"
					style={{
						position: 'fixed' as never,
						top: rect.top + 4,
						left: rect.left,
						width: rect.width,
						maxHeight: Math.max(120, window.innerHeight - rect.top - 16),
						zIndex: 9999,
						boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
					}}
				>
					{searchable && (
						<View className="flex-row items-center gap-2 border-b border-border-subtle px-3">
							<Search size={14} color={themeColors.foregroundSubtle} />
							<SearchTextInput
								autoFocus
								value={query}
								onChangeText={setQuery}
								placeholder="Pesquisar"
								numberOfLines={1}
								placeholderTextColor={themeColors.foregroundSubtle}
								accessibilityLabel={`Pesquisar ${label}`}
								className="h-10 flex-1 font-inter text-ellipsis text-foreground text-sm outline-none"
							/>
						</View>
					)}
					<ScrollView
						style={{ maxHeight: 240 }}
						keyboardShouldPersistTaps="handled"
					>
						{visibleOptions.length === 0 && (
							<Text className="px-3 py-3 font-inter text-foreground-subtle text-sm">
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
									className={`flex-row items-center justify-between px-3 py-2.5 hover:bg-surface-subtle ${isSelected ? 'bg-primary-soft' : ''}`}
								>
									<Text
										className={`flex-1 font-inter text-sm ${isSelected ? 'font-semibold text-primary-text' : 'text-foreground'}`}
										numberOfLines={1}
									>
										{option.label}
									</Text>
									{isSelected && (
										<Check size={14} color={themeColors.primary} />
									)}
								</TouchableOpacity>
							);
						})}
					</ScrollView>
				</View>
			</>
		) : null;

	return (
		<View className="gap-1.5">
			<Text className="font-inter font-semibold text-foreground text-xs">
				{label}
			</Text>
			<TouchableOpacity
				ref={triggerRef}
				onPress={() => (isOpen ? close() : setIsOpen(true))}
				activeOpacity={0.7}
				accessibilityRole="button"
				accessibilityLabel={label}
				accessibilityState={{ expanded: isOpen }}
				className="select-field-trigger h-10 flex-row items-center justify-between gap-2 rounded-lg border border-border-strong bg-surface px-3"
			>
				<Text
					className={`flex-1 font-inter text-sm ${selected ? 'text-foreground' : 'text-foreground-muted'}`}
					numberOfLines={1}
				>
					{selected?.label ?? allLabel}
				</Text>
				<ChevronDown size={16} color={themeColors.foregroundMuted} />
			</TouchableOpacity>
			{dropdown && createPortal(dropdown, document.body)}
		</View>
	);
}
