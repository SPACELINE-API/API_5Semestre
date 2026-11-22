import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
	CalendarDays,
	ChevronDown,
	ChevronUp,
	Inbox,
} from 'lucide-react-native';
import { usePermission } from '@/modules/auth/hooks/usePermission';

import { formatDateOnly } from '../../../shared/utils/dateOnly';

export interface CardRequestProps {
	id: number | string;
	customer_name: string;
	enterprise: string;
	email?: string;
	original_language: string;
	translation_language: string;
	customer_need: string;
	status: string;
	request_date: string;
	quote_id?: string | null;
}

function formatRequestDate(request_date: string): string {
	const formatted = formatDateOnly(request_date, 'long');
	return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function DetailField({ label, value }: { label: string; value: string }) {
	return (
		<View className="min-w-[180px] flex-1 gap-1">
			<Text className="font-inter text-xs text-gray-400">{label}</Text>
			<Text className="font-inter-medium text-sm text-gray-800">{value}</Text>
		</View>
	);
}

export default function CardRequest({
	id,
	customer_name,
	enterprise,
	email,
	original_language,
	translation_language,
	customer_need,
	status,
	request_date,
	quote_id,
}: CardRequestProps) {
	const router = useRouter();
	const [expanded, setExpanded] = useState(false);
	const canReadRequests = usePermission('requests.read');
	const canWriteRequests = usePermission('requests.write');
	const canWriteQuotes = usePermission('quotes.write');
	const canOpen =
		status === 'approved'
			? canWriteQuotes
			: status === 'reproved'
				? canReadRequests
				: canWriteRequests;
	const statusLabel =
		status === 'approved'
			? 'Aprovada'
			: status === 'reproved'
				? 'Reprovada'
				: 'Pendente';
	const statusStyle =
		status === 'approved'
			? { container: 'bg-green-50', text: 'text-green-800' }
			: status === 'reproved'
				? { container: 'bg-red-50', text: 'text-red-800' }
				: { container: 'bg-orange-100', text: 'text-orange-800' };
	const actionLabel =
		status === 'approved'
			? 'Revisar e gerar orçamento'
			: status === 'reproved'
				? 'Ver decisão da solicitação'
				: 'Revisar solicitação';

	const shouldShowAction = !(status === 'approved' && quote_id);

	return (
		<View className="mb-5 rounded-2xl border border-gray-200 bg-white">
			<TouchableOpacity
				activeOpacity={0.7}
				accessibilityRole="button"
				accessibilityState={{ expanded }}
				accessibilityLabel={`${expanded ? 'Recolher' : 'Expandir'} solicitação de ${customer_name}`}
				onPress={() => setExpanded((current) => !current)}
				className={`flex-row flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-6 ${expanded ? 'border-b border-gray-100' : ''}`}
			>
				<View className="max-w-full flex-row items-center gap-3">
					<View className="h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
						<Inbox size={21} color="#2563eb" />
					</View>
					<View className="min-w-0 shrink gap-1">
						<Text
							className="font-inter-bold text-base text-gray-900"
							numberOfLines={1}
						>
							{customer_name}
						</Text>
						<Text
							className="font-inter-medium text-sm text-gray-700"
							numberOfLines={1}
						>
							{enterprise}
						</Text>
						<View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
							<View
								className={`rounded-full px-2.5 py-1 ${statusStyle.container}`}
							>
								<Text
									className={`font-inter-medium text-xs ${statusStyle.text}`}
								>
									{statusLabel}
								</Text>
							</View>
							<Text className="font-inter text-xs text-gray-500">
								{customer_need}
							</Text>
							<Text className="font-inter text-xs text-gray-500">
								{original_language} → {translation_language}
							</Text>
						</View>
					</View>
				</View>
				<View className="flex-row flex-wrap items-center gap-3">
					<View className="flex-row items-center gap-2">
						<CalendarDays size={15} color="#6b7280" />
						<Text className="font-inter text-xs text-gray-500">
							Solicitado em {formatDateOnly(request_date)}
						</Text>
					</View>
					{expanded ? (
						<ChevronUp size={18} color="#6b7280" />
					) : (
						<ChevronDown size={18} color="#6b7280" />
					)}
				</View>
			</TouchableOpacity>

			{expanded && (
				<View className="gap-5 p-5 md:p-6">
					<View className="flex-row flex-wrap gap-x-6 gap-y-4">
						<DetailField label="Cliente" value={customer_name} />
						<DetailField label="Empresa" value={enterprise} />
						{email ? <DetailField label="E-mail" value={email} /> : null}
						<DetailField label="Documento" value={customer_need} />
						<DetailField
							label="Idiomas"
							value={`${original_language} → ${translation_language}`}
						/>
						<DetailField
							label="Data da solicitação"
							value={formatRequestDate(request_date)}
						/>
					</View>

					{shouldShowAction ? (
						<TouchableOpacity
							accessibilityRole="button"
							accessibilityLabel={`${actionLabel} de ${customer_name}`}
							onPress={() => router.push(`/orcamento/gerar/${id}` as never)}
							disabled={!canOpen}
							className={`items-center self-start rounded-lg px-4 py-2.5 ${
								status === 'reproved' ? 'bg-gray-500' : 'bg-blue-600'
							} ${!canOpen ? 'opacity-40' : ''}`}
						>
							<Text className="font-inter-semibold text-sm text-white">
								{actionLabel}
							</Text>
						</TouchableOpacity>
					) : null}
				</View>
			)}
		</View>
	);
}
