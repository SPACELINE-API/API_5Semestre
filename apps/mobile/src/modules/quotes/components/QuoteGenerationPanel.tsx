import { Text, TouchableOpacity, View } from 'react-native';
import { CircleAlert } from 'lucide-react-native';
import { usePermission } from '../../auth/hooks/usePermission';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
type MissingField = { key: string; label: string };

type QuoteGenerationPanelProps = {
	missingFields: MissingField[];
	error: string;
	canGenerate: boolean;
	generating: boolean;
	onGenerate: () => void;
};

export function QuoteGenerationPanel({
	missingFields,
	error,
	canGenerate,
	generating,
	onGenerate,
}: QuoteGenerationPanelProps) {
	const themeColors = useThemeColors();
	const canWriteQuotes = usePermission('quotes.write');
	const isDisabled = !canGenerate || generating || !canWriteQuotes;

	return (
		<>
			{missingFields.length > 0 && (
				<View className="mb-6 flex-row items-start gap-3 rounded-lg border border-danger/30 bg-danger-soft p-4">
					<CircleAlert size={19} color={themeColors.danger} />
					<View className="flex-1">
						<Text className="font-inter-bold text-sm text-danger-text">
							Dados obrigatórios ausentes
						</Text>
						<Text className="mt-1 font-inter text-sm text-danger-text">
							Preencha na requisição:{' '}
							{missingFields.map((field) => field.label).join(', ')}.
						</Text>
					</View>
				</View>
			)}
			{error ? (
				<View className="mb-6 flex-row items-start gap-3 rounded-lg border border-danger/30 bg-danger-soft p-4">
					<CircleAlert size={19} color={themeColors.danger} />
					<Text className="flex-1 font-inter text-sm text-danger-text">
						{error}
					</Text>
				</View>
			) : null}

			<View className="flex-col items-start justify-between gap-4 rounded-lg border border-border bg-surface p-4 md:flex-row md:items-center md:p-6">
				<View className="flex-1">
					<Text className="font-inter-bold text-sm text-foreground">
						Revisão do orçamento
					</Text>
					<Text className="mt-1 font-inter text-sm text-foreground-muted">
						Os dados aprovados serão usados para criar o orçamento. Documentos e
						documentos poderão ser incluídos depois.
					</Text>
				</View>
				<TouchableOpacity
					accessibilityRole="button"
					accessibilityState={{ disabled: isDisabled }}
					disabled={isDisabled}
					onPress={onGenerate}
					className={`w-full items-center rounded-lg px-6 py-3 md:w-auto ${isDisabled ? 'bg-border-strong' : 'bg-primary hover:bg-primary-hover'}`}
				>
					<Text className="font-inter-medium text-sm text-primary-foreground">
						{generating ? 'Gerando orçamento...' : 'Confirmar geração'}
					</Text>
				</TouchableOpacity>
			</View>
		</>
	);
}
