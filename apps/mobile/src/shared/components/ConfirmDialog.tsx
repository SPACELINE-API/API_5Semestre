import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';

type ConfirmDialogProps = {
	visible: boolean;
	title: string;
	message: string;
	confirmLabel?: string;
	cancelLabel?: string;
	destructive?: boolean;
	isLoading?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
};

export function ConfirmDialog({
	visible,
	title,
	message,
	confirmLabel = 'Confirmar',
	cancelLabel = 'Cancelar',
	destructive = false,
	isLoading = false,
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	if (!visible) return null;

	return (
		<Modal visible transparent animationType="none" onRequestClose={onCancel}>
			<View className="flex-1 items-center justify-center bg-black/40 px-4">
				<View className="w-full max-w-[400px] items-center gap-4 rounded-xl bg-white p-7">
					<View className="h-14 w-14 items-center justify-center rounded-full bg-red-50">
						<TriangleAlert size={26} color="#B91C1C" strokeWidth={2} />
					</View>

					<View className="gap-1.5">
						<Text className="text-center font-inter font-bold text-gray-900 text-lg">
							{title}
						</Text>
						<Text className="text-center font-inter text-gray-500 text-sm">
							{message}
						</Text>
					</View>

					<View className="mt-2 w-full flex-row gap-3">
						<TouchableOpacity
							onPress={onCancel}
							disabled={isLoading}
							className="flex-1 items-center rounded-lg border border-gray-300 px-4 py-2.5"
						>
							<Text className="font-inter font-medium text-gray-800 text-sm">
								{cancelLabel}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={onConfirm}
							disabled={isLoading}
							className={`flex-1 items-center rounded-lg px-4 py-2.5 ${
								destructive ? 'bg-red-500' : 'bg-blue-300'
							} ${isLoading ? 'opacity-60' : ''}`}
						>
							<Text
								className={`font-inter font-semibold text-sm ${
									destructive ? 'text-white' : 'text-blue-900'
								}`}
							>
								{isLoading ? 'Aguarde…' : confirmLabel}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
}
