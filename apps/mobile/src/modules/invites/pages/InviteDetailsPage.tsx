import { useEffect, useState } from 'react';
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	Linking,
} from 'react-native';
import {
	ArrowLeft,
	AlertCircle,
	Download,
	Check,
	X,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getSession } from '../../auth/services/auth';
import { useInviteDetails } from '../hooks/useInviteDetails';
import { InviteStatusBadge } from '../components/InviteStatusBadge';
import { FilePreview } from '../../../shared/components/FilePreview';
import { formatDate, formatPrice } from '../utils/format';
import { acceptInvite, declineInvite } from '../services/inviteService';
import { Toast } from '../../../shared/components/Toast';
import { useToast } from '../../../shared/hooks/useToast';

type InviteDetailsPageProps = {
	id: string;
};

export function InviteDetailsPage({ id }: InviteDetailsPageProps) {
	const router = useRouter();
	const { invite, item, isLoading, error, setInvite } = useInviteDetails(id);
	const { toast, showToast } = useToast();
	const [isResponding, setIsResponding] = useState(false);

	useEffect(() => {
		if (!getSession()) {
			router.replace('/login');
		}
	}, [router]);

	if (!getSession()) return null;

	async function handleAccept() {
		setIsResponding(true);

		try {
			const updated = await acceptInvite(id);
			setInvite(updated);
			showToast('Convite aceito com sucesso!', 'success');
			router.replace('/convites');
		} catch (respondError) {
			showToast(
				respondError instanceof Error
					? respondError.message
					: 'Não foi possível aceitar o convite.',
				'error',
			);
			setIsResponding(false);
		}
	}

	async function handleDecline() {
		setIsResponding(true);

		try {
			const updated = await declineInvite(id);
			setInvite(updated);
			showToast('Convite recusado.', 'success');
			router.replace('/convites');
		} catch (respondError) {
			showToast(
				respondError instanceof Error
					? respondError.message
					: 'Não foi possível recusar o convite.',
				'error',
			);
			setIsResponding(false);
		}
	}

	const canRespond = invite?.status === 'pendente';

	return (
		<View className="relative flex-1 bg-white">
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerClassName="
					px-6
					py-6
					md:px-10
					md:py-8
					md:max-w-[720px]
					md:w-full
					md:self-center
				"
			>
				<TouchableOpacity
					onPress={() => router.push('/convites')}
					activeOpacity={0.7}
					className="mb-7 flex-row items-center gap-2"
				>
					<ArrowLeft size={16} color="#6B7280" />

					<Text className="font-inter text-gray-500 text-sm">
						Voltar para meus convites
					</Text>
				</TouchableOpacity>

				{isLoading && (
					<View className="min-h-[400px] items-center justify-center">
						<ActivityIndicator size="large" color="#6B7280" />

						<Text className="mt-4 font-inter text-gray-400 text-sm">
							Carregando dados do convite...
						</Text>
					</View>
				)}

				{!isLoading && error && (
					<View className="gap-1 border-t border-gray-200 py-8">
						<View className="flex-row items-center gap-2">
							<AlertCircle size={16} color="#DC2626" />

							<Text className="font-inter font-semibold text-red-600 text-sm">
								Não foi possível carregar o convite
							</Text>
						</View>

						<Text className="font-inter text-gray-500 text-sm">{error}</Text>
					</View>
				)}

				{!isLoading && !error && invite && (
					<View className="gap-6">
						<View className="flex-row flex-wrap items-center gap-3 border-b border-gray-200 pb-6">
							<Text className="font-inter font-bold text-gray-950 text-xl">
								Convite de tradução
							</Text>

							<InviteStatusBadge status={invite.status} />
						</View>

						{item ? (
							<View className="gap-4">
								<Text className="font-inter font-semibold text-gray-900 text-sm">
									{item.source_language} → {item.target_language}
								</Text>

								<View className="flex-row flex-wrap gap-x-10 gap-y-4">
									<View className="gap-0.5">
										<Text className="font-inter text-gray-400 text-xs">
											Tipo de documento
										</Text>
										<Text className="font-inter font-medium text-gray-800 text-sm">
											{item.document_type ?? 'Não informado'}
										</Text>
									</View>

									<View className="gap-0.5">
										<Text className="font-inter text-gray-400 text-xs">
											Preço
										</Text>
										<Text className="font-inter font-medium text-gray-800 text-sm">
											{formatPrice(item.price)}
										</Text>
									</View>

									<View className="gap-0.5">
										<Text className="font-inter text-gray-400 text-xs">
											Prazo
										</Text>
										<Text className="font-inter font-medium text-gray-800 text-sm">
											{formatDate(item.deadline)}
										</Text>
									</View>

									<View className="gap-0.5">
										<Text className="font-inter text-gray-400 text-xs">
											Quantidade de palavras
										</Text>
										<Text className="font-inter font-medium text-gray-800 text-sm">
											{item.word_count ?? 'Não informado'}
										</Text>
									</View>
								</View>

								<View className="gap-2">
									<Text className="font-inter text-gray-400 text-xs">
										Documento
									</Text>
									{item.file_url ? (
										<>
											<FilePreview fileUrl={item.file_url} height={420} />

											{invite.status === 'aceito' ? (
												<TouchableOpacity
													onPress={() =>
														Linking.openURL(item.file_url as string)
													}
													activeOpacity={0.7}
													accessibilityRole="link"
													accessibilityLabel="Baixar documento"
													className="flex-row items-center gap-1.5 self-start"
												>
													<Download size={14} color="#1C6FB0" />
													<Text className="font-inter font-medium text-blue-600 text-sm">
														Baixar arquivo
													</Text>
												</TouchableOpacity>
											) : (
												<Text className="font-inter text-gray-400 text-xs">
													O download do arquivo só é liberado após você aceitar
													o convite.
												</Text>
											)}
										</>
									) : (
										<Text className="font-inter font-medium text-gray-400 text-sm">
											Nenhum documento anexado
										</Text>
									)}
								</View>
							</View>
						) : (
							<Text className="font-inter text-gray-400 text-sm">
								Não foi possível carregar os detalhes do item associado a este
								convite.
							</Text>
						)}

						<View className="flex-row items-center gap-3 border-t border-gray-100 pt-6">
							{canRespond ? (
								<>
									<TouchableOpacity
										onPress={handleAccept}
										disabled={isResponding}
										accessibilityRole="button"
										accessibilityLabel="Aceitar convite"
										className={`flex-row items-center gap-1.5 rounded-lg bg-green-600 px-5 py-2.5 ${
											isResponding ? 'opacity-60' : ''
										}`}
									>
										<Check size={15} color="#FFFFFF" />
										<Text className="font-inter font-semibold text-white text-sm">
											Aceitar
										</Text>
									</TouchableOpacity>

									<TouchableOpacity
										onPress={handleDecline}
										disabled={isResponding}
										accessibilityRole="button"
										accessibilityLabel="Recusar convite"
										className={`flex-row items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-5 py-2.5 ${
											isResponding ? 'opacity-60' : ''
										}`}
									>
										<X size={15} color="#791F1F" />
										<Text className="font-inter font-semibold text-red-900 text-sm">
											Recusar
										</Text>
									</TouchableOpacity>
								</>
							) : (
								<Text className="font-inter text-gray-500 text-sm">
									Este convite já foi respondido e não pode mais ser alterado.
								</Text>
							)}
						</View>
					</View>
				)}
			</ScrollView>

			<Toast toast={toast} />
		</View>
	);
}
