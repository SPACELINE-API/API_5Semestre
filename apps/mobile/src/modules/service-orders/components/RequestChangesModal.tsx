import {
	useEffect,
	useState,
	type ComponentProps,
	type ComponentType,
} from 'react';
import {
	ActivityIndicator,
	Modal,
	Pressable,
	Platform,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

export const MIN_CHANGES_NOTE_LENGTH = 3;
export const MAX_CHANGES_NOTE_LENGTH = 1000;

type RequestChangesModalProps = {
	visible: boolean;
	subtitle: string;
	isSubmitting: boolean;
	onClose: () => void;
	onSubmit: (note: string) => void;
};

export function RequestChangesModal({
	visible,
	subtitle,
	isSubmitting,
	onClose,
	onSubmit,
}: RequestChangesModalProps) {
	const KeyboardContainer = (
		Platform.OS === 'web' ? ScrollView : KeyboardAwareScrollView
	) as ComponentType<ComponentProps<typeof KeyboardAwareScrollView>>;
	const [note, setNote] = useState('');
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (visible) {
			setNote('');
			setError(null);
		}
	}, [visible]);

	function handleSubmit() {
		const trimmed = note.trim();
		if (trimmed.length < MIN_CHANGES_NOTE_LENGTH) {
			setError('Descreva os ajustes que o tradutor deve fazer.');
			return;
		}
		onSubmit(trimmed);
	}

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onClose}
		>
			<View className="flex-1">
				<KeyboardContainer
					className="flex-1"
					contentContainerClassName="grow"
					keyboardShouldPersistTaps="handled"
					{...(Platform.OS === 'web' ? {} : { bottomOffset: 24 })}
				>
					<View className="min-h-full flex-grow items-center justify-center px-4 py-6">
						<Pressable
							className="absolute inset-0 bg-black/40"
							onPress={isSubmitting ? undefined : onClose}
							accessibilityLabel="Fechar pedido de ajustes"
						/>
						<View className="w-full max-w-[480px] gap-4 rounded-xl bg-white p-5">
							<View className="flex-row items-start justify-between gap-3">
								<View className="min-w-0 flex-1 gap-0.5">
									<Text className="font-inter font-bold text-gray-900 text-lg">
										Pedir ajustes
									</Text>
									<Text className="font-inter text-gray-500 text-sm">
										{subtitle}
									</Text>
								</View>
								<TouchableOpacity onPress={onClose} disabled={isSubmitting}>
									<X size={20} color="#5A5A5A" />
								</TouchableOpacity>
							</View>

							<View className="gap-1.5">
								<Text className="font-inter font-semibold text-gray-800 text-xs">
									O que precisa ser ajustado?
								</Text>
								<TextInput
									value={note}
									onChangeText={(value) => {
										setNote(value);
										setError(null);
									}}
									placeholder="Ex.: revisar a terminologia jurídica e as datas"
									placeholderTextColor="#9CA3AF"
									multiline
									maxLength={MAX_CHANGES_NOTE_LENGTH}
									textAlignVertical="top"
									className="min-h-[110px] rounded-lg border border-gray-300 px-3 py-2.5 font-inter text-gray-900 text-sm"
								/>
								{error && (
									<Text className="font-inter text-red-900 text-xs">
										{error}
									</Text>
								)}
								<Text className="font-inter text-gray-400 text-xs">
									O tradutor verá este recado em "Meus itens" e poderá enviar
									uma nova versão.
								</Text>
							</View>

							<View className="flex-row justify-end gap-3">
								<TouchableOpacity
									onPress={onClose}
									disabled={isSubmitting}
									activeOpacity={0.7}
									className="rounded-lg border border-gray-300 px-4 py-2.5"
								>
									<Text className="font-inter text-gray-700 text-sm">
										Cancelar
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									onPress={handleSubmit}
									disabled={isSubmitting}
									activeOpacity={0.7}
									accessibilityRole="button"
									className={`flex-row items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 ${isSubmitting ? 'opacity-60' : ''}`}
								>
									{isSubmitting && (
										<ActivityIndicator size="small" color="#fff" />
									)}
									<Text className="font-inter-medium text-sm text-white">
										Enviar pedido
									</Text>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				</KeyboardContainer>
			</View>
		</Modal>
	);
}
