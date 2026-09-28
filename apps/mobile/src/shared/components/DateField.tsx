import { useEffect, useState } from 'react';
import { Platform, View, Text, TouchableOpacity } from 'react-native';
import DateTimePicker, {
	type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';

type DateFieldProps = {
	label: string;
	value: string;
	onChangeText: (value: string) => void;
	placeholder?: string;
	minDate?: string;
	onOpenChange?: (open: boolean) => void;
};

const weekdayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function parseDateValue(value: string): Date {
	if (!value) return new Date();
	const [year, month, day] = value.split('-').map(Number);
	if (!year || !month || !day) return new Date();
	return new Date(year, month - 1, day);
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

function getMonthIndex(date: Date) {
	return date.getFullYear() * 12 + date.getMonth();
}

function getCalendarDays(month: Date) {
	const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
	const startOffset = firstDay.getDay();
	return Array.from({ length: 42 }, (_, index) => {
		return new Date(
			month.getFullYear(),
			month.getMonth(),
			index - startOffset + 1,
		);
	});
}

function CalendarPopover({
	value,
	minDate,
	onSelect,
	onClear,
	onClose,
}: {
	value: string;
	minDate?: string;
	onSelect: (value: string) => void;
	onClear: () => void;
	onClose: () => void;
}) {
	const todayValue = toDateInputValue(new Date());
	const minimum = minDate ? parseDateValue(minDate) : undefined;
	const today = new Date();
	const [visibleMonth, setVisibleMonth] = useState(() => {
		const selected = value ? parseDateValue(value) : today;
		return minimum && selected < minimum ? minimum : selected;
	});
	const days = getCalendarDays(visibleMonth);
	const monthLabel = visibleMonth.toLocaleDateString('pt-BR', {
		month: 'long',
		year: 'numeric',
	});
	const formattedMonthLabel = `${monthLabel.charAt(0).toLocaleUpperCase('pt-BR')}${monthLabel.slice(1)}`;
	const previousMonth = new Date(
		visibleMonth.getFullYear(),
		visibleMonth.getMonth() - 1,
		1,
	);
	const previousMonthDisabled = Boolean(
		minimum && getMonthIndex(previousMonth) < getMonthIndex(minimum),
	);
	const todayDisabled = Boolean(minDate && todayValue < minDate);

	return (
		<div
			className="absolute left-0 top-full z-50 mt-2 w-[288px] border border-gray-200 bg-white p-3 shadow-xl shadow-slate-900/15"
			style={{
				position: 'absolute',
				top: 'calc(100% + 8px)',
				left: 0,
				zIndex: 1000,
				backgroundColor: '#fff',
				border: '1px solid #e5e7eb',
				borderRadius: 12,
				boxShadow: '0 16px 32px rgba(15, 23, 42, 0.18)',
			}}
			role="dialog"
			aria-label={`Calendário: ${monthLabel}`}
			onKeyDown={(event) => {
				if (event.key === 'Escape') onClose();
			}}
		>
			<div className="mb-3 flex items-center justify-between">
				<p className="font-inter font-semibold text-sm text-gray-900">
					{formattedMonthLabel}
				</p>
				<div className="flex items-center gap-1">
					<button
						type="button"
						aria-label="Mês anterior"
						disabled={previousMonthDisabled}
						onClick={() => setVisibleMonth(previousMonth)}
						className={`flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-700 ${previousMonthDisabled ? 'cursor-not-allowed opacity-35 hover:bg-transparent hover:text-gray-600' : ''}`}
					>
						<ChevronLeft size={17} />
					</button>
					<button
						type="button"
						aria-label="Próximo mês"
						onClick={() =>
							setVisibleMonth(
								new Date(
									visibleMonth.getFullYear(),
									visibleMonth.getMonth() + 1,
									1,
								),
							)
						}
						className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
					>
						<ChevronRight size={17} />
					</button>
				</div>
			</div>

			<div className="grid grid-cols-7 gap-y-1 text-center">
				{weekdayLabels.map((weekday, index) => (
					<span
						key={`${weekday}-${index}`}
						className="flex h-8 items-center justify-center font-inter-medium text-[11px] text-gray-400"
					>
						{weekday}
					</span>
				))}
				{days.map((day) => {
					const dayValue = toDateInputValue(day);
					const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
					const isDisabled = Boolean(minDate && dayValue < minDate);
					const isSelected = value === dayValue;
					const isToday = todayValue === dayValue;
					const dayClasses = isDisabled
						? 'cursor-not-allowed text-gray-300'
						: isSelected
							? 'bg-blue-600 font-semibold text-white shadow-sm'
							: isToday
								? 'border border-blue-300 font-semibold text-blue-700 hover:bg-blue-50'
								: isCurrentMonth
									? 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
									: 'text-gray-400 hover:bg-blue-50 hover:text-blue-700';

					return (
						<button
							key={dayValue}
							type="button"
							aria-label={day.toLocaleDateString('pt-BR', {
								day: 'numeric',
								month: 'long',
								year: 'numeric',
							})}
							aria-pressed={isSelected}
							disabled={isDisabled}
							onClick={() => onSelect(dayValue)}
							className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg font-inter text-xs transition-colors ${dayClasses}`}
						>
							{day.getDate()}
						</button>
					);
				})}
			</div>

			<div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2">
				<button
					type="button"
					onClick={onClear}
					className="rounded-md px-2 py-1.5 font-inter-medium text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
				>
					Limpar
				</button>
				<button
					type="button"
					disabled={todayDisabled}
					onClick={() => onSelect(todayValue)}
					className={`rounded-md px-2 py-1.5 font-inter-semibold text-xs text-blue-700 transition-colors hover:bg-blue-50 ${todayDisabled ? 'cursor-not-allowed opacity-40 hover:bg-transparent' : ''}`}
				>
					Hoje
				</button>
			</div>
		</div>
	);
}

export function DateField({
	label,
	value,
	onChangeText,
	placeholder,
	minDate,
	onOpenChange,
}: DateFieldProps) {
	const [isPickerVisible, setIsPickerVisible] = useState(false);
	const minimumDate = minDate ? parseDateValue(minDate) : undefined;

	useEffect(() => {
		if (Platform.OS !== 'web' || !isPickerVisible) return;

		function handleOutsidePointerDown(event: PointerEvent) {
			const target = event.target;
			if (
				target instanceof Element &&
				!target.closest('[data-date-field-root]')
			) {
				setIsPickerVisible(false);
				onOpenChange?.(false);
			}
		}

		document.addEventListener('pointerdown', handleOutsidePointerDown);
		return () =>
			document.removeEventListener('pointerdown', handleOutsidePointerDown);
	}, [isPickerVisible, onOpenChange]);

	function openCalendar() {
		setIsPickerVisible((visible) => {
			onOpenChange?.(!visible);
			return !visible;
		});
	}

	function closeCalendar() {
		setIsPickerVisible(false);
		onOpenChange?.(false);
	}

	if (Platform.OS === 'web') {
		return (
			<div
				className="relative flex flex-1 flex-col gap-1.5"
				data-date-field-root
				style={{
					position: 'relative',
					zIndex: isPickerVisible ? 1000 : undefined,
				}}
			>
				<label className="font-inter font-semibold text-xs text-gray-800">
					{label}
				</label>
				<button
					type="button"
					aria-label={`Selecionar data: ${label}`}
					aria-expanded={isPickerVisible}
					onClick={openCalendar}
					className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 text-left font-inter text-sm text-gray-900 outline-none transition-colors hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
				>
					<span className={value ? 'text-gray-900' : 'text-gray-400'}>
						{value ? formatDisplayValue(value) : (placeholder ?? 'dd/mm/aaaa')}
					</span>
					<Calendar size={16} color="#6b7280" />
				</button>
				{isPickerVisible ? (
					<CalendarPopover
						value={value}
						minDate={minDate}
						onSelect={(selectedValue) => {
							onChangeText(selectedValue);
							closeCalendar();
						}}
						onClear={() => {
							onChangeText('');
							closeCalendar();
						}}
						onClose={closeCalendar}
					/>
				) : null}
			</div>
		);
	}

	function handleChange(event: DateTimePickerEvent, selectedDate?: Date) {
		if (Platform.OS === 'android') {
			closeCalendar();
		}

		if (event.type === 'dismissed') return;
		if (selectedDate) {
			const selectedValue = toDateInputValue(selectedDate);
			if (minDate && selectedValue < minDate) return;
			onChangeText(selectedValue);
		}
	}

	return (
		<View className="flex-1 gap-1.5">
			<Text className="font-inter font-semibold text-gray-800 text-xs">
				{label}
			</Text>

			<TouchableOpacity
				onPress={openCalendar}
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
					minimumDate={minimumDate}
					onChange={handleChange}
				/>
			)}

			{isPickerVisible && Platform.OS === 'ios' && (
				<TouchableOpacity
					onPress={closeCalendar}
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
