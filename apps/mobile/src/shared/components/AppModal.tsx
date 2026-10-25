import type { ReactNode } from 'react';
import {
	ActivityIndicator,
	Modal,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import {
	CheckCircle2,
	CircleHelp,
	TriangleAlert,
	X,
	XCircle,
	type LucideIcon,
} from 'lucide-react-native';

export type AppModalType = 'success' | 'warning' | 'error' | 'confirmation';

type AppModalProps = {
	visible: boolean;
	title: string;
	message?: string;
	/** Sem tipo, o modal funciona como contêiner de formulário (sem ícone). */
	type?: AppModalType;
	children?: ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	closeLabel?: string;
	hideCloseButton?: boolean;
	isLoading?: boolean;
	confirmDisabled?: boolean;
	size?: 'sm' | 'md';
	footer?: ReactNode;
	/** Quando informado, exibe as ações Cancelar e Confirmar. */
	onConfirm?: () => void;
	onClose: () => void;
};

const TYPE_STYLES: Record<
	AppModalType,
	{ icon: LucideIcon; color: string; background: string }
> = {
	success: { icon: CheckCircle2, color: '#15803D', background: 'bg-green-50' },
	warning: { icon: TriangleAlert, color: '#B45309', background: 'bg-amber-50' },
	error: { icon: XCircle, color: '#B91C1C', background: 'bg-red-50' },
	confirmation: {
		icon: CircleHelp,
		color: '#1D4ED8',
		background: 'bg-blue-50',
	},
};

// CABECALHO E BOTOES FICAM FORA DA AREA DE ROLAGEM (PADRAO DOS MODAIS DO PROJETO):
// EM ALGUNS ANDROIDS, BOTOES DENTRO DO SCROLLVIEW DE UM MODAL NAO RECEBEM O TOQUE
export function AppModal({
	visible,
	title,
	message,
	type,
	children,
	confirmLabel = 'Confirmar',
	cancelLabel = 'Cancelar',
	closeLabel = 'OK',
	hideCloseButton = false,
	isLoading = false,
	confirmDisabled = false,
	size = 'sm',
	footer,
	onConfirm,
	onClose,
}: AppModalProps) {
	if (!visible) return null;

	const style = type ? TYPE_STYLES[type] : null;
	const Icon = style?.icon;
	const hasConfirm = Boolean(onConfirm) || type === 'confirmation';
	const isCentered = Boolean(style);

	return (
		<Modal
			visible
			transparent
			animationType="fade"
			onRequestClose={isLoading ? undefined : onClose}
		>
			<View className="flex-1 items-center justify-center bg-black/40 px-4 py-6">
				<View
					accessibilityViewIsModal
					className={`max-h-[90%] w-full overflow-hidden rounded-xl bg-white ${
						size === 'md' ? 'max-w-[520px]' : 'max-w-[400px]'
					}`}
				>
					{isCentered && style && Icon ? (
						<View className="items-center gap-3 px-6 pt-6 md:px-7 md:pt-7">
							<View
								className={`h-14 w-14 items-center justify-center rounded-full ${style.background}`}
							>
								<Icon size={26} color={style.color} strokeWidth={2} />
							</View>
							<View className="gap-1.5">
								<Text
									accessibilityRole="header"
									className="text-center font-inter font-bold text-gray-900 text-lg"
								>
									{title}
								</Text>
								{message ? (
									<Text className="text-center font-inter text-gray-500 text-sm">
										{message}
									</Text>
								) : null}
							</View>
						</View>
					) : (
						<View className="flex-row items-start justify-between gap-3 px-6 pt-6 md:px-7 md:pt-7">
							<View className="flex-1 gap-1">
								<Text
									accessibilityRole="header"
									className="font-inter font-bold text-gray-900 text-lg"
								>
									{title}
								</Text>
								{message ? (
									<Text className="font-inter text-gray-500 text-sm">
										{message}
									</Text>
								) : null}
							</View>
							<TouchableOpacity
								onPress={onClose}
								disabled={isLoading}
								accessibilityRole="button"
								accessibilityLabel="Fechar"
								hitSlop={8}
								className="rounded-md p-1"
							>
								<X size={20} color="#6B7280" />
							</TouchableOpacity>
						</View>
					)}

					{children ? (
						<ScrollView
							bounces={false}
							className="shrink grow-0"
							contentContainerClassName="gap-4 px-6 pt-4 md:px-7"
							keyboardShouldPersistTaps="handled"
						>
							{children}
						</ScrollView>
					) : null}

					{footer ? (
						<View className="flex-row gap-3 px-6 pb-6 pt-5 md:px-7 md:pb-7">
							{footer}
						</View>
					) : (
						<View
							className={`flex-row gap-3 px-6 pb-6 pt-5 md:px-7 md:pb-7 ${
								isCentered ? '' : 'justify-end'
							}`}
						>
							{hasConfirm ? (
								<>
									<TouchableOpacity
										onPress={onClose}
										disabled={isLoading}
										accessibilityRole="button"
										className={`items-center rounded-lg border border-gray-300 px-4 py-2.5 ${
											isCentered ? 'flex-1' : ''
										}`}
									>
										<Text className="font-inter font-medium text-gray-800 text-sm">
											{cancelLabel}
										</Text>
									</TouchableOpacity>
									<TouchableOpacity
										onPress={onConfirm}
										disabled={isLoading || confirmDisabled}
										accessibilityRole="button"
										accessibilityState={{
											disabled: isLoading || confirmDisabled,
											busy: isLoading,
										}}
										className={`flex-row items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 ${
											isCentered ? 'flex-1' : ''
										} ${isLoading || confirmDisabled ? 'opacity-50' : ''}`}
									>
										{isLoading && (
											<ActivityIndicator size="small" color="#FFFFFF" />
										)}
										<Text className="font-inter font-semibold text-sm text-white">
											{isLoading ? 'Aguarde…' : confirmLabel}
										</Text>
									</TouchableOpacity>
								</>
							) : hideCloseButton ? null : (
								<TouchableOpacity
									onPress={onClose}
									accessibilityRole="button"
									className={`items-center rounded-lg bg-blue-600 px-4 py-2.5 ${
										isCentered ? 'flex-1' : ''
									}`}
								>
									<Text className="font-inter font-semibold text-sm text-white">
										{closeLabel}
									</Text>
								</TouchableOpacity>
							)}
						</View>
					)}
				</View>
			</View>
		</Modal>
	);
}
