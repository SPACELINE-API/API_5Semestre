import React from 'react';
import { Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FileText, ExternalLink } from 'lucide-react-native';

import type { RequestItem } from '../../requests/services/requests';
import { openRequestDocument } from '../../requests/services/requests';

function formatDate(value?: string) {
	if (!value) return '—';
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? value
		: date.toLocaleDateString('pt-BR', {
				day: '2-digit',
				month: 'long',
				year: 'numeric',
			});
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
	return (
		<View className="flex-1 min-w-[180px] gap-1">
			<Text className="font-inter-medium text-xs text-gray-500">{label}</Text>
			<Text className="font-inter text-sm text-gray-900">
				{value?.trim() || 'Não informado'}
			</Text>
		</View>
	);
}

function RequestDocumentButton({ request }: { request: RequestItem }) {
	const [opening, setOpening] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const handlePress = async () => {
		setOpening(true);
		setError(null);
		try {
			if (request.document_url) {
				await openRequestDocument(request.document_url);
			}
		} catch {
			setError('Erro ao abrir documento');
		} finally {
			setOpening(false);
		}
	};

	return (
		<View className="gap-2">
			<TouchableOpacity
				onPress={handlePress}
				disabled={opening}
				className="min-h-[44px] bg-blue-50 border border-blue-200 rounded-lg flex-row items-center justify-center gap-2 px-4"
			>
				{opening ? (
					<ActivityIndicator size="small" color="#2563eb" />
				) : (
					<>
						<FileText size={20} color="#2563eb" />
						<ExternalLink size={20} color="#2563eb" />
					</>
				)}
				<Text
					className="font-inter-medium text-sm text-blue-700"
					numberOfLines={1}
				>
					{request.document_filename || 'Abrir documento'}
				</Text>
			</TouchableOpacity>
			{error && (
				<Text className="font-inter text-xs text-red-600">{error}</Text>
			)}
		</View>
	);
}

export function RequestSummarySections({ request }: { request: RequestItem }) {
	return (
		<>
			<View className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 mb-6">
				<View className="flex-row items-center gap-3 mb-5">
					<View className="h-10 w-10 rounded-lg bg-blue-50 items-center justify-center">
						<FileText size={20} color="#2563eb" />
					</View>
					<View className="flex-1">
						<Text className="font-inter-bold text-sm text-gray-900">
							Dados da requisição
						</Text>
						<Text className="font-inter text-xs text-gray-500 mt-0.5">
							Solicitação #{request.id.slice(0, 8).toUpperCase()}
						</Text>
					</View>
				</View>
				<View className="flex-row flex-wrap gap-x-8 gap-y-5">
					<InfoField label="Cliente" value={request.customer_name} />
					<InfoField label="Empresa" value={request.enterprise} />
					<InfoField label="E-mail" value={request.email} />
					<InfoField
						label="Data da solicitação"
						value={formatDate(request.request_date)}
					/>
					{request.approved_at && (
						<InfoField
							label="Aprovada em"
							value={formatDate(request.approved_at)}
						/>
					)}
					{request.reproved_at && (
						<InfoField
							label="Reprovada em"
							value={formatDate(request.reproved_at)}
						/>
					)}
				</View>
				<View className="mt-5 gap-2">
					<Text className="font-inter-medium text-xs text-gray-500">
						Documento anexado
					</Text>
					{request.has_document ? (
						<RequestDocumentButton request={request} />
					) : (
						<Text className="font-inter text-sm text-gray-500">
							Nenhum documento anexado.
						</Text>
					)}
				</View>
			</View>
			<View className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 mb-6">
				<Text className="font-inter-bold text-sm text-gray-900 mb-5">
					Dados do serviço solicitado
				</Text>
				<View className="flex-row flex-wrap gap-x-8 gap-y-5">
					<InfoField
						label="Idioma de origem"
						value={request.original_language}
					/>
					<InfoField
						label="Idioma de destino"
						value={request.translation_language}
					/>
					<View className="w-full gap-1">
						<Text className="font-inter-medium text-xs text-gray-500">
							Necessidade
						</Text>
						<Text className="font-inter text-sm text-gray-900">
							{request.customer_need?.trim() || 'Não informado'}
						</Text>
					</View>
				</View>
			</View>
		</>
	);
}
