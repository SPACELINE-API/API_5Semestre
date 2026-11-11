import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { History } from 'lucide-react-native';
import { listServiceOrderVersions } from '../services/serviceOrderService';
import type {
	ServiceOrderVersion,
	ServiceOrderVersionChange,
} from '../types/serviceOrder';

const FIELD_LABELS: Record<string, string> = {
	source_language: 'Idioma de origem',
	target_language: 'Idioma de destino',
	document_type: 'Tipo de documento',
	file_url: 'Arquivo',
	price: 'Valor',
};

const ACTION_STYLES: Record<
	ServiceOrderVersionChange['action'],
	{ label: string; classes: string }
> = {
	added: { label: 'Adicionado', classes: 'bg-emerald-50 text-emerald-700' },
	updated: { label: 'Alterado', classes: 'bg-blue-50 text-blue-700' },
	removed: { label: 'Removido', classes: 'bg-red-50 text-red-700' },
};

function formatDateTime(value: string) {
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? value
		: date.toLocaleString('pt-BR', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			});
}

function formatValue(field: string, value: unknown) {
	if (value === null || value === undefined || value === '') return '—';
	if (field === 'price') {
		return Number(value).toLocaleString('pt-BR', {
			style: 'currency',
			currency: 'BRL',
		});
	}
	if (field === 'file_url') {
		const text = String(value);
		return decodeURIComponent(text.split('/').pop() ?? text);
	}
	return String(value);
}

function ChangeRow({ change }: { change: ServiceOrderVersionChange }) {
	const style = ACTION_STYLES[change.action];
	const fields = Object.entries(change.fields ?? {});
	return (
		<View className="gap-1.5 border-t border-gray-100 pt-2">
			<View className="flex-row flex-wrap items-center gap-2">
				<View
					className={`rounded-full px-2 py-0.5 ${style.classes.split(' ')[0]}`}
				>
					<Text
						className={`font-inter font-medium text-xs ${style.classes.split(' ')[1]}`}
					>
						{style.label}
					</Text>
				</View>
				<Text className="font-inter text-sm text-gray-800">{change.item}</Text>
			</View>
			{fields.map(([field, diff]) => (
				<Text key={field} className="font-inter text-xs text-gray-500">
					{FIELD_LABELS[field] ?? field}: {formatValue(field, diff.before)} →{' '}
					{formatValue(field, diff.after)}
				</Text>
			))}
		</View>
	);
}

export function ServiceOrderVersionsTab({
	serviceOrderId,
	refreshToken,
}: {
	serviceOrderId: string;
	refreshToken: number;
}) {
	const [versions, setVersions] = useState<ServiceOrderVersion[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		let active = true;
		setLoading(true);
		setError('');
		listServiceOrderVersions(serviceOrderId)
			.then((data) => {
				if (active) setVersions(data);
			})
			.catch(() => {
				if (active)
					setError('Não foi possível carregar o histórico de versões.');
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [serviceOrderId, refreshToken]);

	if (loading) {
		return (
			<View className="items-center gap-2 py-10">
				<ActivityIndicator color="#6B7280" />
				<Text className="font-inter text-sm text-gray-400">
					Carregando versões...
				</Text>
			</View>
		);
	}

	if (error) {
		return <Text className="font-inter text-sm text-red-600">{error}</Text>;
	}

	if (!versions.length) {
		return (
			<Text className="font-inter text-sm text-gray-500">
				Esta ordem de serviço ainda não possui histórico de versões.
			</Text>
		);
	}

	return (
		<View className="gap-4">
			{versions.map((version, index) => (
				<View
					key={version.id}
					className="gap-3 rounded-xl border border-gray-200 bg-white p-4"
				>
					<View className="flex-row flex-wrap items-center justify-between gap-2">
						<View className="flex-row items-center gap-2">
							<History size={16} color="#4b5563" />
							<Text className="font-inter font-semibold text-gray-900 text-sm">
								Versão {version.version}
								{index === 0 ? ' (atual)' : ''}
							</Text>
						</View>
						<Text className="font-inter text-xs text-gray-500">
							{formatDateTime(version.created_at)}
						</Text>
					</View>
					<Text className="font-inter text-sm text-gray-700">
						{version.origin === 'quote_reapproval'
							? 'Atualizada após o orçamento ser reaberto e aprovado novamente.'
							: 'Criada a partir da aprovação do orçamento.'}
					</Text>
					{version.reason ? (
						<Text className="font-inter text-sm text-gray-700">
							Motivo da reabertura: {version.reason}
						</Text>
					) : null}
					{version.actor_email ? (
						<Text className="font-inter text-xs text-gray-500">
							Aprovado por: {version.actor_email}
						</Text>
					) : null}
					{version.changes.length ? (
						<View className="gap-2">
							{version.changes.map((change, changeIndex) => (
								<ChangeRow
									key={`${version.id}-${changeIndex}`}
									change={change}
								/>
							))}
						</View>
					) : version.origin === 'quote_reapproval' ? (
						<Text className="font-inter text-xs text-gray-500">
							Nenhum item foi alterado nesta versão.
						</Text>
					) : null}
				</View>
			))}
		</View>
	);
}
