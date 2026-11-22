import { Text, TouchableOpacity, View } from 'react-native';
import { ExternalLink, FileText } from 'lucide-react-native';
import { openDocument } from '../../../shared/components/FilePreview';
import { formatDate } from '../../invites/utils/format';
import type { ProductivityDocument } from '../types/productivity';
import { formatCurrencyValue, formatInteger } from '../utils/format';
import { PunctualityBadge } from './PunctualityBadge';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
type FileLinkProps = { label: string; filename: string; url: string };

function FileLink({ label, filename, url }: FileLinkProps) {
	const themeColors = useThemeColors();
	return (
		<TouchableOpacity
			onPress={() => openDocument(url)}
			activeOpacity={0.7}
			accessibilityRole="link"
			accessibilityLabel={`Abrir ${label}: ${filename}`}
			className="min-w-0 flex-row items-center gap-2"
		>
			<FileText size={14} color={themeColors.primary} />
			<Text
				className="min-w-0 flex-shrink font-inter font-medium text-primary-text text-sm"
				numberOfLines={1}
			>
				{filename}
			</Text>
			<ExternalLink size={12} color={themeColors.primaryText} />
		</TouchableOpacity>
	);
}

function Metadata({ label, value }: { label: string; value: string }) {
	return (
		<View className="min-w-[110px] gap-0.5">
			<Text className="font-inter text-foreground-subtle text-xs">{label}</Text>
			<Text className="font-inter font-medium text-foreground text-sm">
				{value}
			</Text>
		</View>
	);
}

type DocumentsListProps = { documents: ProductivityDocument[] };

export function DocumentsList({ documents }: DocumentsListProps) {
	return (
		<View className="gap-3">
			{documents.map((document) => (
				<View
					key={document.item_id}
					className="gap-4 rounded-xl border border-border p-4"
				>
					<View className="flex-row flex-wrap items-start justify-between gap-2">
						<View className="min-w-0 flex-1 gap-0.5">
							<Text className="font-inter font-semibold text-foreground text-sm">
								{document.source_language} → {document.target_language}
								{document.document_type ? ` · ${document.document_type}` : ''}
							</Text>
							<Text className="font-inter text-foreground-muted text-xs">
								{document.project_name}
							</Text>
						</View>
						<PunctualityBadge onTime={document.on_time} />
					</View>

					<View className="flex-row flex-wrap gap-x-6 gap-y-3">
						<Metadata
							label="Palavras"
							value={
								document.word_count === null
									? 'Não informado'
									: formatInteger(document.word_count)
							}
						/>
						<Metadata
							label="Valor"
							value={formatCurrencyValue(document.price)}
						/>
						<Metadata label="Prazo" value={formatDate(document.deadline)} />
						<Metadata
							label="Concluído em"
							value={formatDate(document.completed_at)}
						/>
					</View>

					<View className="gap-2 border-t border-border-subtle pt-3">
						<Text className="font-inter font-semibold text-foreground-subtle text-xs uppercase tracking-wide">
							Arquivos
						</Text>
						{document.original_file_url ? (
							<FileLink
								label="documento original"
								filename="Documento original"
								url={document.original_file_url}
							/>
						) : (
							<Text className="font-inter text-foreground-subtle text-sm">
								Sem documento original anexado
							</Text>
						)}
						{document.delivered_files.map((file) => (
							<View key={file.id} className="gap-0.5">
								<FileLink
									label="tradução entregue"
									filename={file.filename}
									url={file.file_url}
								/>
								<Text className="pl-6 font-inter text-foreground-subtle text-xs">
									Enviado em {formatDate(file.uploaded_at)}
								</Text>
							</View>
						))}
					</View>
				</View>
			))}
		</View>
	);
}
