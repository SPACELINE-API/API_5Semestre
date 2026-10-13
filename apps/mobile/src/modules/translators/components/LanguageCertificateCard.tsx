import { Text, TouchableOpacity, View } from 'react-native';
import { FileText, Plus } from 'lucide-react-native';
import {
	MOCK_CERTIFICATE_REQUESTS,
	MOCK_CERTIFICATE_STATUS_LABELS,
} from '../services/certificateMock';
import { PROFICIENCY_LABELS } from '../types/translator';

const STATUS_STYLES = {
	pending: 'bg-amber-50 text-amber-800',
	approved: 'bg-green-50 text-green-800',
	rejected: 'bg-red-50 text-red-800',
} as const;

type LanguageCertificateCardProps = {
	onNewCertificate?: () => void;
};

export function LanguageCertificateCard({
	onNewCertificate,
}: LanguageCertificateCardProps) {
	return (
		<View className="gap-4">
			<View className="flex-row items-center justify-between gap-3">
				<Text className="font-inter font-bold text-gray-900 text-sm">
					Certificados enviados
				</Text>
				<TouchableOpacity
					onPress={onNewCertificate}
					activeOpacity={0.7}
					accessibilityRole="button"
					className="flex-row items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5"
				>
					<Plus size={16} color="#ffffff" />
					<Text className="font-inter-medium text-sm text-white">
						Novo certificado
					</Text>
				</TouchableOpacity>
			</View>

			{MOCK_CERTIFICATE_REQUESTS.map((request) => (
				<View
					key={request.id}
					className="gap-2 rounded-lg border border-gray-200 p-3"
				>
					<View className="flex-row items-center justify-between gap-2">
						<Text
							className="flex-1 font-inter font-semibold text-gray-900 text-sm"
							numberOfLines={1}
						>
							{request.language_name} ·{' '}
							{PROFICIENCY_LABELS[request.proficiency_level]}
						</Text>
						<View
							className={`rounded-full px-2.5 py-0.5 ${STATUS_STYLES[request.status].split(' ')[0]}`}
						>
							<Text
								className={`font-inter font-medium text-xs ${STATUS_STYLES[request.status].split(' ')[1]}`}
							>
								{MOCK_CERTIFICATE_STATUS_LABELS[request.status]}
							</Text>
						</View>
					</View>
					<View className="flex-row items-center gap-2">
						<FileText size={14} color="#6B7280" />
						<Text
							className="flex-1 font-inter text-gray-500 text-xs"
							numberOfLines={1}
						>
							{request.filename}
						</Text>
					</View>
				</View>
			))}
		</View>
	);
}
