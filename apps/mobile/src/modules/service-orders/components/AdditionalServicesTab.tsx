import { ActivityIndicator, Text, View } from 'react-native';
import { AlertCircle, PackagePlus } from 'lucide-react-native';
import type { AdditionalService } from '../../quotes/services/additionalService';
import { AdditionalServiceCard } from '../../quotes/components/AdditionalServiceCard';

type AdditionalServicesTabProps = {
	services: AdditionalService[];
	isLoading: boolean;
	error: string | null;
	onEditService?: (service: AdditionalService) => void;
	onCompleteService?: (service: AdditionalService) => Promise<void>;
};

export function AdditionalServicesTab({
	services,
	isLoading,
	error,
	onEditService,
	onCompleteService,
}: AdditionalServicesTabProps) {
	if (isLoading) {
		return (
			<View className="items-center justify-center py-12">
				<ActivityIndicator size="small" color="#6B7280" />
				<Text className="mt-3 font-inter text-gray-400 text-sm">
					Carregando serviços adicionais...
				</Text>
			</View>
		);
	}

	if (error) {
		return (
			<View className="flex-row items-center gap-2 py-8">
				<AlertCircle size={16} color="#DC2626" />
				<Text className="font-inter text-red-600 text-sm">{error}</Text>
			</View>
		);
	}

	if (services.length === 0) {
		return (
			<View className="items-center justify-center gap-4 py-12">
				<View className="items-center">
					<View className="mb-3 h-10 w-10 items-center justify-center rounded-full bg-gray-100">
						<PackagePlus size={18} color="#9CA3AF" />
					</View>

					<Text className="text-center font-inter font-medium text-gray-800 text-sm">
						Esta ordem de serviço não possui serviços adicionais
					</Text>
					<Text className="mt-1 text-center font-inter text-gray-400 text-xs">
						Os serviços cadastrados no orçamento de origem aparecem nesta lista
					</Text>
				</View>
			</View>
		);
	}

	return (
		<View className="gap-4">
			{services.map((service) => (
				<AdditionalServiceCard
					key={service.id}
					service={service}
					onEdit={() => onEditService!(service)}
					onMarkAsCompleted={() => onCompleteService!(service)}
					isInServiceOrder={true}
				/>
			))}
		</View>
	);
}
