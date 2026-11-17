import { View, Text } from 'react-native';
import { CheckCircle2, XCircle } from 'lucide-react-native';

import { useThemeColors } from '../theme/ThemeProvider';
import { type ThemeColors } from '../theme/types';
export type ToastType = 'success' | 'error';

export type ToastData = {
	message: string;
	type: ToastType;
};

const TOAST_STYLE: Record<
	ToastType,
	{
		title: string;
		bg: string;
		border: string;
		title_color: string;
		text_color: string;
		icon: keyof ThemeColors;
	}
> = {
	success: {
		title: 'Sucesso',
		bg: 'bg-success-soft',
		border: 'border-success/25',
		title_color: 'text-success-text',
		text_color: 'text-success-text',
		icon: 'successText',
	},
	error: {
		title: 'Erro',
		bg: 'bg-danger-soft',
		border: 'border-danger/25',
		title_color: 'text-danger-text',
		text_color: 'text-danger-text',
		icon: 'dangerText',
	},
};

export function ToastMessage({ toast }: { toast: ToastData }) {
	const themeColors = useThemeColors();
	const style = TOAST_STYLE[toast.type];
	const Icon = toast.type === 'success' ? CheckCircle2 : XCircle;

	return (
		<View
			className={`w-[320px] flex-row items-start gap-3 rounded-xl border px-4 py-3.5 shadow-lg ${style.bg} ${style.border}`}
		>
			<Icon size={20} color={themeColors[style.icon]} />
			<View className="flex-1 gap-0.5">
				<Text className={`font-inter font-bold text-sm ${style.title_color}`}>
					{style.title}
				</Text>
				<Text className={`font-inter text-sm ${style.text_color}`}>
					{toast.message}
				</Text>
			</View>
		</View>
	);
}

type ToastProps = {
	toast: ToastData | null;
};

export function Toast({ toast }: ToastProps) {
	if (!toast) return null;

	return (
		<View pointerEvents="none" className="absolute bottom-6 left-6 z-50">
			<ToastMessage toast={toast} />
		</View>
	);
}
