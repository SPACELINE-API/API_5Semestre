import {
	ActivityIndicator,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
	Platform,
} from 'react-native';
import { useState, type ComponentProps, type ComponentType } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { AlertCircle } from 'lucide-react-native';
import { TabBar } from '../../../shared/components/TabBar';
import { Toast } from '../../../shared/components/Toast';
import { useToast } from '../../../shared/hooks/useToast';
import { LanguagesList } from '../components/LanguagesList';
import { CertificateDetailsModal } from '../components/CertificateDetailsModal';
import { CertificateUploadModal } from '../components/CertificateUploadModal';
import { LanguageCertificateCard } from '../components/LanguageCertificateCard';
import { ProfileDataCard } from '../components/ProfileDataCard';
import { ProfilePhotoCard } from '../components/ProfilePhotoCard';
import { useMyCertificates } from '../hooks/useMyCertificates';
import { useMyProfile } from '../hooks/useMyProfile';
import type { TranslatorCertificate } from '../types/certificate';

type ProfileTab = 'data' | 'languages' | 'certificates';

const TABS: { key: ProfileTab; label: string }[] = [
	{ key: 'data', label: 'Dados pessoais' },
	{ key: 'languages', label: 'Idiomas' },
	{ key: 'certificates', label: 'Certificados' },
];

export function MyProfilePage() {
	const KeyboardContainer = (
		Platform.OS === 'web' ? ScrollView : KeyboardAwareScrollView
	) as ComponentType<ComponentProps<typeof KeyboardAwareScrollView>>;
	const { profile, setProfile, isLoading, error, refresh } = useMyProfile();
	const { toast, showToast } = useToast();
	const certificates = useMyCertificates();
	const [activeTab, setActiveTab] = useState<ProfileTab>('data');
	const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
	const [certificateToReplace, setCertificateToReplace] =
		useState<TranslatorCertificate | null>(null);
	const [selectedCertificate, setSelectedCertificate] =
		useState<TranslatorCertificate | null>(null);
	const [unavailableIds, setUnavailableIds] = useState<ReadonlySet<string>>(
		new Set(),
	);

	if (isLoading && !profile) {
		return (
			<View className="flex-1 items-center justify-center bg-white">
				<ActivityIndicator color="#6B7280" />
				<Text className="mt-3 font-inter text-gray-400 text-sm">
					Carregando perfil...
				</Text>
			</View>
		);
	}

	if (error || !profile) {
		return (
			<View className="flex-1 items-center justify-center bg-white px-6">
				<AlertCircle size={32} color="#DC2626" />
				<Text className="mt-3 text-center font-inter font-semibold text-gray-800 text-base">
					{error ?? 'Perfil não encontrado'}
				</Text>
				<TouchableOpacity
					onPress={() => void refresh()}
					className="mt-4 rounded-lg border border-gray-300 px-4 py-2"
				>
					<Text className="font-inter text-gray-700 text-sm">
						Tentar novamente
					</Text>
				</TouchableOpacity>
			</View>
		);
	}

	return (
		<View className="relative flex-1 bg-white">
			<KeyboardContainer
				className="flex-1"
				showsVerticalScrollIndicator={false}
				contentContainerClassName="px-5 py-6 md:px-10 md:py-8"
				{...(Platform.OS === 'web'
					? {}
					: {
							bottomOffset: 20,
							keyboardShouldPersistTaps: 'handled' as const,
						})}
			>
				<View className="mb-6 border-b border-gray-200 pb-6">
					<Text className="font-inter font-bold text-gray-950 text-2xl">
						Meu perfil
					</Text>
					<Text className="mt-2 font-inter text-gray-500 text-sm">
						Mantenha seus dados atualizados e solicite novos idiomas de
						trabalho.
					</Text>
				</View>

				<TabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

				<View className="py-6">
					<View className={`gap-4 ${activeTab === 'data' ? '' : 'hidden'}`}>
						<ProfilePhotoCard
							profile={profile}
							onChange={setProfile}
							onSuccess={(message) => showToast(message, 'success')}
						/>
						<ProfileDataCard
							profile={profile}
							onChange={setProfile}
							onSuccess={(message) => showToast(message, 'success')}
						/>
					</View>

					{activeTab === 'languages' && (
						<LanguagesList languages={profile.languages} />
					)}

					<View className={activeTab === 'certificates' ? '' : 'hidden'}>
						<LanguageCertificateCard
							certificates={certificates.certificates}
							isLoading={certificates.isLoading}
							error={certificates.error}
							unavailableIds={unavailableIds}
							onRetry={() => void certificates.refresh()}
							onSelect={setSelectedCertificate}
							onNewCertificate={() => {
								setCertificateToReplace(null);
								setIsCertificateModalOpen(true);
							}}
						/>
					</View>
				</View>
			</KeyboardContainer>

			<CertificateDetailsModal
				certificate={selectedCertificate}
				isUnavailable={
					selectedCertificate
						? unavailableIds.has(selectedCertificate.id)
						: false
				}
				onClose={() => setSelectedCertificate(null)}
				onUnavailable={(certificateId) =>
					setUnavailableIds((current) => new Set(current).add(certificateId))
				}
				onReplace={(certificate) => {
					setSelectedCertificate(null);
					setCertificateToReplace(certificate);
					setIsCertificateModalOpen(true);
				}}
			/>

			<CertificateUploadModal
				visible={isCertificateModalOpen}
				certificateToReplace={certificateToReplace}
				onClose={() => {
					setIsCertificateModalOpen(false);
					setCertificateToReplace(null);
				}}
				onSubmitted={(certificate) => {
					setUnavailableIds((current) => {
						const next = new Set(current);
						next.delete(certificate.id);
						return next;
					});
					void certificates.refresh();
				}}
			/>

			<Toast toast={toast} />
		</View>
	);
}
