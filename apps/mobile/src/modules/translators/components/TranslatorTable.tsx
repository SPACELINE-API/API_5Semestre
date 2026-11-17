import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { ChevronRight, UserRound } from 'lucide-react-native';
import type { Translator } from '../types/translator';
import { PROFICIENCY_LABELS } from '../types/translator';
import { maskPhone } from '../../clients/utils/mask';

type Props = {
	translators: Translator[];
	onSelectTranslator?: (t: Translator) => void;
};

function translatorInitials(name: string) {
	const parts = name.trim().split(' ');
	if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
	return (
		(parts[0][0] ?? '').toUpperCase() +
		(parts[parts.length - 1][0] ?? '').toUpperCase()
	);
}

export function TranslatorTable({ translators, onSelectTranslator }: Props) {
	return (
		<View className="bg-surface">
			{/* CABECALHO - SO APARECE NO DESKTOP */}
			<View className="hidden h-11 flex-row items-center border-b border-border px-5 md:flex">
				<Text className="w-[28%] font-inter font-medium text-[11px] uppercase tracking-wide text-foreground-subtle">
					Tradutor
				</Text>
				<Text className="w-[22%] font-inter font-medium text-[11px] uppercase tracking-wide text-foreground-subtle">
					Contato
				</Text>
				<Text className="w-[30%] font-inter font-medium text-[11px] uppercase tracking-wide text-foreground-subtle">
					Idiomas
				</Text>
				<Text className="w-[12%] font-inter font-medium text-[11px] uppercase tracking-wide text-foreground-subtle">
					Qualificações
				</Text>
				<Text className="w-[8%] font-inter font-medium text-[11px] uppercase tracking-wide text-foreground-subtle">
					Status
				</Text>
			</View>

			<FlatList
				data={translators}
				keyExtractor={(t) => t.id}
				scrollEnabled={false}
				renderItem={({ item: t }) => (
					<TouchableOpacity
						onPress={() => onSelectTranslator?.(t)}
						activeOpacity={0.7}
						className="min-h-[72px] flex-row items-center border-b border-border-subtle px-4 py-3 md:px-5"
					>
						{/* AVATAR + NOME */}
						<View className="flex-1 flex-row items-center gap-3 md:w-[28%] md:flex-none md:pr-4">
							<View className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft">
								{t.name ? (
									<Text className="font-inter font-semibold text-primary-text text-xs">
										{translatorInitials(t.name)}
									</Text>
								) : (
									<UserRound size={17} color="#1C6FB0" />
								)}
							</View>
							<View className="min-w-0 flex-1">
								<Text
									className="font-inter font-semibold text-foreground text-sm"
									numberOfLines={1}
								>
									{t.name}
								</Text>
								<View
									className={`mt-1 flex-row items-center gap-1 rounded-full px-2 py-0.5 self-start md:hidden ${
										t.is_active ? 'bg-success-soft' : 'bg-surface-muted'
									}`}
								>
									<View
										className={`h-1.5 w-1.5 rounded-full ${
											t.is_active ? 'bg-success' : 'bg-foreground-subtle'
										}`}
									/>
									<Text
										className={`font-inter font-medium text-[10px] ${
											t.is_active
												? 'text-success-text'
												: 'text-foreground-muted'
										}`}
									>
										{t.is_active ? 'Ativo' : 'Inativo'}
									</Text>
								</View>
								{/* IDIOMAS RESUMIDOS NO MOBILE */}
								{t.languages.length > 0 && (
									<View className="mt-1 flex-row flex-wrap gap-1 md:hidden">
										{t.languages.slice(0, 2).map((language) => (
											<View
												key={language.id}
												className="rounded bg-primary-soft px-1.5 py-0.5"
											>
												<Text className="font-inter text-primary-text text-[10px]">
													{language.language_name} •{' '}
													{PROFICIENCY_LABELS[language.proficiency_level]}
												</Text>
											</View>
										))}
										{t.languages.length > 2 && (
											<Text className="font-inter text-foreground-subtle text-[10px]">
												+{t.languages.length - 2}
											</Text>
										)}
									</View>
								)}
							</View>
						</View>

						{/* CONTATO */}
						<View className="hidden w-[22%] min-w-0 flex-none pr-3 md:flex">
							<Text
								className="font-inter text-foreground-secondary text-sm"
								numberOfLines={1}
							>
								{t.email}
							</Text>
							<Text
								className="mt-0.5 font-inter text-foreground-subtle text-xs"
								numberOfLines={1}
							>
								{maskPhone(t.phone)}
							</Text>
						</View>

						{/* IDIOMAS */}
						<View className="hidden w-[30%] min-w-0 flex-none flex-row flex-wrap gap-1 pr-3 md:flex">
							{t.languages.length === 0 ? (
								<Text className="font-inter text-foreground-subtle text-xs">
									—
								</Text>
							) : (
								<>
									{t.languages.slice(0, 3).map((language) => (
										<View
											key={language.id}
											className="rounded-full bg-primary-soft px-2 py-0.5"
										>
											<Text className="font-inter text-primary-strong text-[11px]">
												{language.language_name}
												{'  '}
												<Text className="text-primary-text text-[10px]">
													{PROFICIENCY_LABELS[language.proficiency_level]}
												</Text>
											</Text>
										</View>
									))}
									{t.languages.length > 3 && (
										<Text className="self-center font-inter text-foreground-subtle text-[11px]">
											+{t.languages.length - 3}
										</Text>
									)}
								</>
							)}
						</View>

						{/* QUALIFICACOES */}
						<View className="hidden w-[12%] min-w-0 flex-none pr-3 md:flex">
							{t.qualifications.length === 0 ? (
								<Text className="font-inter text-foreground-subtle text-xs">
									—
								</Text>
							) : (
								<View className="flex-row flex-wrap gap-1">
									{t.qualifications.slice(0, 2).map((q) => (
										<View
											key={q.id}
											className="rounded-full bg-surface-muted px-2 py-0.5"
										>
											<Text
												className="font-inter text-foreground-secondary text-[10px]"
												numberOfLines={1}
											>
												{q.name}
											</Text>
										</View>
									))}
									{t.qualifications.length > 2 && (
										<Text className="font-inter text-foreground-subtle text-[10px]">
											+{t.qualifications.length - 2}
										</Text>
									)}
								</View>
							)}
						</View>

						{/* STATUS */}
						<View className="hidden w-[8%] min-w-0 flex-none md:flex">
							<View
								className={`flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1 ${
									t.is_active ? 'bg-surface-muted' : 'bg-surface-subtle'
								}`}
							>
								<View
									className={`h-1.5 w-1.5 rounded-full ${
										t.is_active ? 'bg-success' : 'bg-foreground-subtle'
									}`}
								/>
								<Text
									className={`font-inter font-medium text-[11px] ${
										t.is_active
											? 'text-foreground-secondary'
											: 'text-foreground-subtle'
									}`}
								>
									{t.is_active ? 'Ativo' : 'Inativo'}
								</Text>
							</View>
						</View>

						<View className="w-8 items-end justify-center">
							<ChevronRight size={17} color="#9CA3AF" />
						</View>
					</TouchableOpacity>
				)}
				ListEmptyComponent={
					<View className="items-center justify-center py-16">
						<View className="mb-3 h-10 w-10 items-center justify-center rounded-full bg-surface-muted">
							<UserRound size={18} color="#9CA3AF" />
						</View>
						<Text className="font-inter font-medium text-foreground text-sm">
							Nenhum tradutor encontrado
						</Text>
						<Text className="mt-1 font-inter text-foreground-subtle text-xs">
							Os tradutores cadastrados aparecerão aqui.
						</Text>
					</View>
				}
			/>
		</View>
	);
}
