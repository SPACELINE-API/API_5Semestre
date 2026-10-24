import { useEffect, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';
import type { RoleFormData } from '../../types/roles';
import { FormField } from '../../../clients/components/FormField';

type RoleFormModalProps = {
	visible: boolean;
	onClose: () => void;
	onSubmit: (data: RoleFormData) => Promise<void>;
};

export function RoleFormModal({
	visible,
	onClose,
	onSubmit,
}: RoleFormModalProps) {
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (!visible) return;
		setName('');
		setDescription('');
		setError(null);
	}, [visible]);

	async function handleSubmit() {
		setError(null);

		if (!name.trim()) {
			setError('Informe o nome do perfil.');
			return;
		}

		setIsSubmitting(true);

		try {
			await onSubmit({
				name: name.trim(),
				description: description.trim() || null,
			});
			onClose();
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: 'Não foi possível cadastrar o perfil.',
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
			onRequestClose={onClose}
		>
			<View className="flex-1 items-center justify-center bg-black/40 px-4">
				<View className="w-full max-w-[480px] max-h-[85%] rounded-xl bg-white overflow-hidden">
					<View className="flex-row items-center justify-between border-b border-gray-300 px-6 py-4">
						<View className="min-w-0 flex-1 gap-0.5">
							<Text className="font-inter font-bold text-gray-900 text-lg">
								Novo perfil de acesso
							</Text>
						</View>
						<TouchableOpacity onPress={onClose}>
							<X size={20} color="#5A5A5A" />
						</TouchableOpacity>
					</View>

					<ScrollView
						className="px-6 py-4"
						contentContainerClassName="gap-4 pb-6"
						keyboardShouldPersistTaps="handled"
					>
						<FormField
							label="Nome"
							value={name}
							onChangeText={setName}
							placeholder="Ex: Comercial"
							maxLength={255}
						/>

						<FormField
							label="Descrição"
							value={description}
							onChangeText={setDescription}
							placeholder="Ex: Acompanha propostas e clientes"
							maxLength={1000}
						/>

						{error && (
							<View className="rounded-lg bg-red-50 px-3 py-2.5">
								<Text className="font-inter text-red-900 text-sm">{error}</Text>
							</View>
						)}
					</ScrollView>

					<View className="flex-row flex-wrap items-center justify-end gap-3 border-t border-gray-300 px-6 py-4">
						<TouchableOpacity
							onPress={onClose}
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
							accessibilityLabel="Confirmar cadastro do perfil de acesso"
							className={`rounded-lg bg-blue-600 px-5 py-2.5 ${isSubmitting ? 'opacity-60' : ''}`}
						>
							<Text className="font-inter font-semibold text-white text-sm">
								{isSubmitting ? 'Cadastrando…' : 'Cadastrar perfil'}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
}
