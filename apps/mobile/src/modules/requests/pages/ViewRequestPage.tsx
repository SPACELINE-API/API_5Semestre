import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import CardRequest from '../components/CardRequest';
import { fetchRequests, RequestItem } from '../services/requests';

export default function ViewRequestPage() {
	const [requests, setRequests] = useState<RequestItem[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchRequests().then((data) => {
			setRequests(data);
			setLoading(false);
		});
	}, []);

	return (
		<View className="p-6">
			<Text className="text-2xl font-bold text-gray-900 mb-1">Requisições</Text>
			<Text className="text-sm text-gray-500 mb-4">
				{requests.length} solicitações aguardando orçamento
			</Text>

			{loading ? (
				<Text className="text-gray-500 mt-8">Carregando...</Text>
			) : requests.length > 0 ? (
				<View className="flex-row flex-wrap gap-4 mt-8">
					{requests.map((request) => (
						<CardRequest key={request.id} {...request} />
					))}
				</View>
			) : (
				<Text className="text-gray-500">
					Nenhuma requisição disponível no momento
				</Text>
			)}
		</View>
	);
}
