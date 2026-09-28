import { useCallback, useEffect, useState } from 'react';
import {
	ActivityIndicator,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { CircleAlert, RefreshCw } from 'lucide-react-native';

import CardRequest from '../components/CardRequest';
import { fetchRequests } from '../services/requests';
import type { RequestItem } from '../services/requests';

export default function ViewRequestPage() {
	const [requests, setRequests] = useState<RequestItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const loadRequests = useCallback(async () => {
		setLoading(true);
		setError('');
		try {
			setRequests(await fetchRequests());
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: 'Não foi possível carregar as solicitações.',
			);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadRequests();
	}, [loadRequests]);

	return (
		<ScrollView className="flex-1 bg-gray-50">
			<View className="p-4 md:p-8">
				<Text className="font-poppins-bold text-2xl text-gray-900">
					Requisições
				</Text>
				<Text className="mt-1 font-inter text-sm text-gray-500">
					{requests.length}{' '}
					{requests.length === 1
						? 'solicitação cadastrada'
						: 'solicitações cadastradas'}
				</Text>

				{loading ? (
					<View className="mt-8 items-center gap-3 rounded-xl border border-gray-200 bg-white p-8">
						<ActivityIndicator color="#2563eb" />
						<Text className="font-inter text-sm text-gray-500">
							Carregando solicitações...
						</Text>
					</View>
				) : error ? (
					<View className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5">
						<View className="flex-row items-start gap-3">
							<CircleAlert size={20} color="#dc2626" />
							<Text className="flex-1 font-inter text-sm text-red-800">
								{error}
							</Text>
						</View>
						<TouchableOpacity
							accessibilityRole="button"
							onPress={() => void loadRequests()}
							className="mt-4 flex-row items-center gap-2 self-start rounded-lg border border-red-200 px-4 py-2.5"
						>
							<RefreshCw size={15} color="#b91c1c" />
							<Text className="font-inter-medium text-sm text-red-800">
								Tentar novamente
							</Text>
						</TouchableOpacity>
					</View>
				) : requests.length > 0 ? (
					<View className="mt-8 flex-row flex-wrap gap-4">
						{requests.map((request) => (
							<CardRequest key={request.id} {...request} />
						))}
					</View>
				) : (
					<View className="mt-8 rounded-xl border border-gray-200 bg-white p-8">
						<Text className="font-inter text-sm text-gray-500">
							Nenhuma solicitação disponível no momento.
						</Text>
					</View>
				)}
			</View>
		</ScrollView>
	);
}
