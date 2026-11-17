import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { AlertCircle, FileText, RefreshCw } from 'lucide-react-native';

export function ProposalLoading() {
	return (
		<View className="items-center gap-3 rounded-xl border border-border bg-surface p-10">
			<ActivityIndicator color="#2563eb" />
			<Text className="font-inter text-foreground-muted text-sm">
				Carregando propostas...
			</Text>
		</View>
	);
}

export function ProposalError({
	message,
	onRetry,
}: {
	message: string;
	onRetry: () => void;
}) {
	return (
		<View className="rounded-2xl border border-danger/25 bg-surface p-5 md:p-6">
			<View className="flex-row items-start gap-3">
				<View className="h-10 w-10 items-center justify-center rounded-full bg-danger-soft">
					<AlertCircle size={20} color="#dc2626" />
				</View>
				<View className="flex-1 gap-1">
					<Text className="font-inter font-semibold text-foreground text-base">
						Não foi possível carregar as propostas
					</Text>
					<Text className="font-inter text-foreground-secondary text-sm leading-5">
						{message}
					</Text>
				</View>
			</View>
			<TouchableOpacity
				accessibilityRole="button"
				onPress={onRetry}
				className="mt-5 flex-row items-center gap-2 self-start rounded-lg bg-primary px-4 py-2.5"
			>
				<RefreshCw size={15} color="#ffffff" />
				<Text className="font-inter font-medium text-primary-foreground text-sm">
					Tentar novamente
				</Text>
			</TouchableOpacity>
		</View>
	);
}

export function ProposalEmpty({ filtered }: { filtered: boolean }) {
	return (
		<View className="items-center rounded-xl border border-border bg-surface px-6 py-12">
			<View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-primary-soft">
				<FileText size={22} color="#2563eb" />
			</View>
			<Text className="font-inter font-semibold text-foreground text-base">
				{filtered
					? 'Nenhuma proposta encontrada'
					: 'Nenhuma proposta cadastrada'}
			</Text>
			<Text className="mt-1 text-center font-inter text-foreground-muted text-sm">
				{filtered
					? 'Tente alterar o período ou a situação selecionada.'
					: 'As propostas comerciais aparecerão aqui quando estiverem disponíveis.'}
			</Text>
		</View>
	);
}
