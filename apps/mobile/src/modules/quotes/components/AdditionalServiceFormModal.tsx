import { useEffect, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';
import type {
	AdditionalService,
	AdditionalServiceFormData,
} from '../services/additionalService';
import { FormField } from '../../clients/components/FormField';
import {
	decimalStringToBRL,
	maskCurrencyDigits,
} from '../../../shared/utils/currency';

type AdditionalServiceFormModalProps = {
	visible: boolean;
	service?: AdditionalService | null;
	onClose: () => void;
	onSubmit: (data: AdditionalServiceFormData) => Promise<void>;
};

export function AdditionalServiceFormModal({
	visible,
	service,
	onClose,
	onSubmit,
}: AdditionalServiceFormModalProps) {
	const [description, setDescription] = useState('');
	const [price, setPrice] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const isEditing = Boolean(service);

	useEffect(() => {
		if (!visible) return;
		setDescription(service?.description ?? '');
		setPrice(service ? Number(service.price).toFixed(2) : '');
		setError(null);
	}, [visible, service]);

	function resetForm() {
		setDescription('');
		setPrice('');
		setError(null);
	}

	function handleClose() {
		resetForm();
		onClose();
	}

	async function handleSubmit() {
		setError(null);

		if (!description.trim()) {
			setError('Informe a descrição do serviço adicional.');
			return;
		}

		if (!price) {
			setError('Informe o valor do serviço adicional.');
			return;
		}

		setIsSubmitting(true);

		try {
			await onSubmit({
				description: description.trim(),
				price: Number(price),
			});
			handleClose();
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: isEditing
						? 'Não foi possível salvar o serviço adicional.'
						: 'Não foi possível cadastrar o serviço adicional.',
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<Modal
			visible={visible}
			transparent
			animationType="none"
			onRequestClose={handleClose}
		>
			<View className="flex-1 items-center justify-center bg-black/40 px-4">
				<View className="w-full max-w-[480px] max-h-[85%] rounded-xl bg-white overflow-hidden">
					<View className="flex-row items-center justify-between border-b border-gray-300 px-6 py-4">
						<View className="min-w-0 flex-1 gap-0.5">
							<Text className="font-inter font-bold text-gray-900 text-lg">
								{isEditing
									? 'Editar serviço adicional'
									: 'Novo serviço adicional'}
							</Text>
						</View>
						<TouchableOpacity onPress={handleClose}>
							<X size={20} color="#5A5A5A" />
						</TouchableOpacity>
					</View>

					<ScrollView
						className="px-6 py-4"
						contentContainerClassName="gap-4 pb-6"
						keyboardShouldPersistTaps="handled"
					>
						<FormField
							label="Descrição"
							value={description}
							onChangeText={setDescription}
							placeholder="Ex: Revisão técnica"
							maxLength={255}
						/>

						<FormField
							label="Valor"
							value={price ? decimalStringToBRL(price) : ''}
							onChangeText={(value) => setPrice(maskCurrencyDigits(value))}
							placeholder="R$ 0,00"
						/>

						{error && (
							<View className="rounded-lg bg-red-50 px-3 py-2.5">
								<Text className="font-inter text-red-900 text-sm">{error}</Text>
							</View>
						)}
					</ScrollView>

					<View className="flex-row flex-wrap items-center justify-end gap-3 border-t border-gray-300 px-6 py-4">
						<TouchableOpacity
							onPress={handleClose}
							className="rounded-lg border border-gray-300 px-5 py-2.5"
						>
							<Text className="font-inter font-medium text-gray-800 text-sm">
								Cancelar
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={handleSubmit}
							disabled={isSubmitting}
							accessibilityRole="button"
							accessibilityLabel={
								isEditing
									? 'Confirmar edição do serviço adicional'
									: 'Confirmar cadastro do serviço adicional'
							}
							className={`rounded-lg bg-blue-600 px-5 py-2.5 ${isSubmitting ? 'opacity-60' : ''}`}
						>
							<Text className="font-inter font-semibold text-white text-sm">
								{isSubmitting
									? isEditing
										? 'Salvando…'
										: 'Cadastrando…'
									: isEditing
										? 'Salvar alterações'
										: 'Cadastrar serviço'}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
}
