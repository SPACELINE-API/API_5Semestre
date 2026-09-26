import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, UserRound, Mail, Phone, AlertCircle, Trash2 } from 'lucide-react-native';
import { getTranslator, deleteTranslator } from '../../modules/translators/services/translatorService';
import { PROFICIENCY_LABELS, formatLanguagePairDisplay } from '../../modules/translators/types/translator';
import type { Translator } from '../../modules/translators/types/translator';
import { Toast } from '../../shared/components/Toast';
import { useToast } from '../../shared/hooks/useToast';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';

export default function TranslatorDetailsScreen() {
	const router = useRouter();
	const { id } = useLocalSearchParams();
	const [translator, setTranslator] = useState(null as Translator | null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null as string | null);
	const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const { toast, showToast } = useToast();

	useEffect(() => {
		if (!id) return;
		setIsLoading(true);
		getTranslator(id as string)
			.then(setTranslator)
			.catch(() => setError('Nao foi possivel carregar os dados do tradutor.'))
			.finally(() => setIsLoading(false));
	}, [id]);

	async function handleDelete() {
		if (!translator) return;
		setIsDeleting(true);
		try {
			await deleteTranslator(translator.id);
			router.replace({ pathname: '/tradutores', params: { deleted: '1' } });
		} catch {
			showToast('Nao foi possivel excluir o tradutor.', 'error');
			setIsDeleting(false);
			setIsDeleteConfirmVisible(false);
		}
	}

	if (isLoading) {
		return (
			<View className="flex-1 items-center justify-center bg-white">
				<ActivityIndicator color="#6B7280" />
				<Text className="mt-3 font-inter text-gray-400 text-sm">Carregando...</Text>
			</View>
		);
	}

	if (error || !translator) {
		return (
			<View className="flex-1 items-center justify-center bg-white px-6">
				<AlertCircle size={32} color="#DC2626" />
				<Text className="mt-3 font-inter font-semibold text-gray-800 text-base">
					{error ?? 'Tradutor nao encontrado'}
				</Text>
				<TouchableOpacity onPress={() => router.back()} className="mt-4 rounded-lg border border-gray-300 px-4 py-2">
					<Text className="font-inter text-gray-700 text-sm">Voltar</Text>
				</TouchableOpacity>
			</View>
		);
	}

	return (
		<View className="relative flex-1 bg-white">
			<ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-5 py-6 md:px-10 md:py-8 md:max-w-[800px] md:w-full md:self-center">
				<TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} className="mb-6 flex-row items-center gap-2 self-start">
					<ArrowLeft size={18} color="#6B7280" />
					<Text className="font-inter text-gray-500 text-sm">Tradutores</Text>
				</TouchableOpacity>

				<View className="mb-6 flex-row items-center gap-4">
					<View className="h-16 w-16 items-center justify-center rounded-full bg-blue-50">
						<UserRound size={28} color="#1C6FB0" />
					</View>
					<View className="flex-1">
						<Text className="font-inter font-bold text-gray-900 text-xl">{translator.name}</Text>
						<View className={"mt-1.5 flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1 " + (translator.is_active ? 'bg-green-50' : 'bg-gray-100')}>
							<View className={"h-1.5 w-1.5 rounded-full " + (translator.is_active ? 'bg-green-500' : 'bg-gray-400')} />
							<Text className={"font-inter font-medium text-xs " + (translator.is_active ? 'text-green-800' : 'text-gray-500')}>
								{translator.is_active ? 'Ativo' : 'Inativo'}
							</Text>
						</View>
					</View>
					<TouchableOpacity onPress={() => setIsDeleteConfirmVisible(true)} activeOpacity={0.7} className="h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50">
						<Trash2 size={16} color="#DC2626" />
					</TouchableOpacity>
				</View>

				<View className="mb-4 gap-3 rounded-xl border border-gray-100 p-4">
					<Text className="font-inter font-semibold text-gray-400 text-xs uppercase tracking-wide">Contato</Text>
					<View className="flex-row items-center gap-3">
						<Mail size={16} color="#6B7280" />
						<Text className="font-inter text-gray-700 text-sm">{translator.email}</Text>
					</View>
					<View className="flex-row items-center gap-3">
						<Phone size={16} color="#6B7280" />
						<Text className="font-inter text-gray-700 text-sm">{translator.phone}</Text>
					</View>
				</View>

				<View className="mb-4 gap-3 rounded-xl border border-gray-100 p-4">
					<Text className="font-inter font-semibold text-gray-400 text-xs uppercase tracking-wide">Pares de Idioma</Text>
					{translator.language_pairs.length === 0 ? (
						<Text className="font-inter text-gray-400 text-sm">Nenhum par de idioma cadastrado.</Text>
					) : (
						translator.language_pairs.map((p) => (
							<View key={p.id} className="flex-row items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
								<Text className="font-inter font-medium text-gray-800 text-sm">{formatLanguagePairDisplay(p)}</Text>
								<View className="rounded-full bg-blue-100 px-2.5 py-0.5">
									<Text className="font-inter font-medium text-blue-800 text-xs">{PROFICIENCY_LABELS[p.proficiency_level]}</Text>
								</View>
							</View>
						))
					)}
				</View>

				<View className="mb-4 gap-3 rounded-xl border border-gray-100 p-4">
					<Text className="font-inter font-semibold text-gray-400 text-xs uppercase tracking-wide">Qualificacoes Tecnicas</Text>
					{translator.qualifications.length === 0 ? (
						<Text className="font-inter text-gray-400 text-sm">Nenhuma qualificacao cadastrada.</Text>
					) : (
						<View className="flex-row flex-wrap gap-2">
							{translator.qualifications.map((q) => (
								<View key={q.id} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5">
									<Text className="font-inter font-medium text-gray-700 text-sm">{q.name}</Text>
								</View>
							))}
						</View>
					)}
				</View>
			</ScrollView>

			<ConfirmDialog
				visible={isDeleteConfirmVisible}
				title="Excluir tradutor"
				message={"Tem certeza que deseja excluir \"" + translator.name + "\"? Essa acao nao pode ser desfeita."}
				confirmLabel="Excluir"
				destructive
				isLoading={isDeleting}
				onConfirm={handleDelete}
				onCancel={() => setIsDeleteConfirmVisible(false)}
			/>

			<Toast toast={isDeleteConfirmVisible ? null : toast} />
		</View>
	);
}
