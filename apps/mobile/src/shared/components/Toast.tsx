import { View, Text } from 'react-native';
import { CheckCircle2, XCircle } from 'lucide-react-native';

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
		icon: string;
	}
> = {
	success: {
		title: 'Sucesso',
		bg: 'bg-green-50',
		border: 'border-green-100',
		title_color: 'text-green-900',
		text_color: 'text-green-800',
		icon: '#085041',
	},
	error: {
		title: 'Erro',
		bg: 'bg-red-50',
		border: 'border-red-100',
		title_color: 'text-red-900',
		text_color: 'text-red-800',
		icon: '#791F1F',
	},
};

export function ToastMessage({ toast }: { toast: ToastData }) {
	const style = TOAST_STYLE[toast.type];
	const Icon = toast.type === 'success' ? CheckCircle2 : XCircle;

	return (
		<View
			className={`w-[320px] flex-row items-start gap-3 rounded-xl border px-4 py-3.5 shadow-lg ${style.bg} ${style.border}`}
		>
			<Icon size={20} color={style.icon} />
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
