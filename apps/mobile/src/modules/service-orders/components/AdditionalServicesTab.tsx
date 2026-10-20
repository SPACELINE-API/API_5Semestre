import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { AlertCircle, PackagePlus, Plus } from 'lucide-react-native';
import type { AdditionalService } from '../../quotes/services/additionalService';
import { AdditionalServiceCard } from '../../quotes/components/AdditionalServiceCard';
import { useIsDesktop } from '../../../shared/hooks/useIsDesktop';

type AdditionalServicesTabProps = {
	services: AdditionalService[];
	isLoading: boolean;
	error: string | null;
	onAddService: () => void;
	onEditService: (service: AdditionalService) => void;
	onCompleteService: (service: AdditionalService) => Promise<void>;
};

function AddServiceButton({ onPress }: { onPress: () => void }) {
	const isDesktop = useIsDesktop();

	if (!isDesktop) {
		return (
			<TouchableOpacity
				onPress={onPress}
				activeOpacity={0.7}
				accessibilityRole="button"
				accessibilityLabel="Novo serviço adicional"
				className="h-11 w-11 items-center justify-center self-end rounded-full bg-blue-300"
			>
				<Plus size={20} color="#042C53" />
			</TouchableOpacity>
		);
	}

	return (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.7}
			accessibilityRole="button"
			accessibilityLabel="Novo serviço adicional"
			className="flex-row items-center gap-1.5 self-start rounded-lg border border-gray-300 px-3 py-2"
		>
			<Plus size={14} color="#353535" />
			<Text className="font-inter font-semibold text-gray-800 text-xs">
				Novo serviço adicional
			</Text>
		</TouchableOpacity>
	);
}

export function AdditionalServicesTab({
	services,
	isLoading,
	error,
	onAddService,
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

					<Text className="font-inter font-medium text-gray-800 text-sm">
						Esta ordem de serviço não possui serviços adicionais
					</Text>
					<Text className="mt-1 font-inter text-gray-400 text-xs">
						Os serviços cadastrados aqui ou no orçamento de origem aparecem
						nesta lista
					</Text>
					<View className="mt-7">
						<AddServiceButton onPress={onAddService} />
					</View>
				</View>
			</View>
		);
	}

	return (
		<View className="gap-4">
			<AddServiceButton onPress={onAddService} />
			{services.map((service) => (
				<AdditionalServiceCard
					key={service.id}
					service={service}
					onEdit={() => onEditService(service)}
					onMarkAsCompleted={() => onCompleteService(service)}
				/>
			))}
		</View>
	);
}
