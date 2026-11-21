import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { Send } from 'lucide-react-native';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
export function SendQuoteDialog({
	visible,
	quoteLabel,
	validUntil,
	sending,
	isResend,
	onConfirm,
	onCancel,
}: {
	visible: boolean;
	quoteLabel: string;
	validUntil: string | null;
	sending: boolean;
	isResend: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}) {
	const themeColors = useThemeColors();
	if (!visible) return null;

	return (
		<Modal visible transparent animationType="none" onRequestClose={onCancel}>
			<View className="flex-1 items-center justify-center bg-overlay/40 px-4">
				<View className="w-full max-w-[440px] gap-4 rounded-xl bg-surface p-6">
					<View className="flex-row items-center gap-3">
						<View className="h-11 w-11 items-center justify-center rounded-full bg-primary-soft">
							<Send size={20} color={themeColors.primaryText} />
						</View>
						<Text className="flex-1 font-inter font-bold text-foreground text-lg">
							{isResend
								? `Reenviar orçamento #${quoteLabel}?`
								: `Enviar orçamento #${quoteLabel}?`}
						</Text>
					</View>

					<View className="gap-2">
						<Text className="font-inter text-sm leading-5 text-foreground-secondary">
							O cliente vai receber um e-mail com os itens, os valores e um link
							para aprovar ou reprovar
							{validUntil ? ` até ${validUntil}` : ''}.
						</Text>
						{isResend ? (
							<Text className="font-inter text-sm leading-5 text-foreground-secondary">
								O e-mail informa que o orçamento foi atualizado e o link enviado
								antes deixa de valer.
							</Text>
						) : null}
						<Text className="font-inter text-sm leading-5 text-foreground-secondary">
							Depois do envio, o orçamento fica bloqueado para edição.
						</Text>
					</View>

					<View className="flex-row flex-wrap justify-end gap-3">
						<TouchableOpacity
							accessibilityRole="button"
							disabled={sending}
							onPress={onCancel}
							className="rounded-lg border border-border-strong px-4 py-2.5"
						>
							<Text className="font-inter-medium text-sm text-foreground-secondary">
								Cancelar
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							accessibilityRole="button"
							disabled={sending}
							onPress={onConfirm}
							className={`rounded-lg px-4 py-2.5 ${sending ? 'bg-border-strong' : 'bg-primary'}`}
						>
							<Text className="font-inter-medium text-sm text-primary-foreground">
								{sending ? 'Enviando...' : 'Confirmar envio'}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
}
