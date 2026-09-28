import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { ChevronRight, UserRound } from 'lucide-react-native';
import type { Translator } from '../types/translator';
import {
	PROFICIENCY_LABELS,
	formatLanguagePairCode,
} from '../types/translator';

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
		<View className="bg-white">
			{/* CABECALHO - SO APARECE NO DESKTOP */}
			<View className="hidden h-11 flex-row items-center border-b border-gray-200 px-5 md:flex">
				<Text className="w-[28%] font-inter font-medium text-[11px] uppercase tracking-wide text-gray-400">
					Tradutor
				</Text>
				<Text className="w-[22%] font-inter font-medium text-[11px] uppercase tracking-wide text-gray-400">
					Contato
				</Text>
				<Text className="w-[30%] font-inter font-medium text-[11px] uppercase tracking-wide text-gray-400">
					Pares de Idioma
				</Text>
				<Text className="w-[12%] font-inter font-medium text-[11px] uppercase tracking-wide text-gray-400">
					Qualificações
				</Text>
				<Text className="w-[8%] font-inter font-medium text-[11px] uppercase tracking-wide text-gray-400">
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
						className="min-h-[72px] flex-row items-center border-b border-gray-100 px-4 py-3 md:px-5"
					>
						{/* AVATAR + NOME */}
						<View className="flex-1 flex-row items-center gap-3 md:w-[28%] md:flex-none md:pr-4">
							<View className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50">
								{t.name ? (
									<Text className="font-inter font-semibold text-blue-700 text-xs">
										{translatorInitials(t.name)}
									</Text>
								) : (
									<UserRound size={17} color="#1C6FB0" />
								)}
							</View>
							<View className="min-w-0 flex-1">
								<Text
									className="font-inter font-semibold text-gray-900 text-sm"
									numberOfLines={1}
								>
									{t.name}
								</Text>
								{/* PARES RESUMIDOS NO MOBILE */}
								{t.language_pairs.length > 0 && (
									<View className="mt-1 flex-row flex-wrap gap-1 md:hidden">
										{t.language_pairs.slice(0, 2).map((p) => (
											<View
												key={p.id}
												className="rounded bg-blue-50 px-1.5 py-0.5"
											>
												<Text className="font-inter text-blue-700 text-[10px]">
													{formatLanguagePairCode(p)} •{' '}
													{PROFICIENCY_LABELS[p.proficiency_level]}
												</Text>
											</View>
										))}
										{t.language_pairs.length > 2 && (
											<Text className="font-inter text-gray-400 text-[10px]">
												+{t.language_pairs.length - 2}
											</Text>
										)}
									</View>
								)}
							</View>
						</View>

						{/* CONTATO */}
						<View className="hidden w-[22%] min-w-0 flex-none pr-3 md:flex">
							<Text
								className="font-inter text-gray-700 text-sm"
								numberOfLines={1}
							>
								{t.email}
							</Text>
							<Text
								className="mt-0.5 font-inter text-gray-400 text-xs"
								numberOfLines={1}
							>
								{t.phone}
							</Text>
						</View>

						{/* PARES DE IDIOMA */}
						<View className="hidden w-[30%] min-w-0 flex-none flex-row flex-wrap gap-1 pr-3 md:flex">
							{t.language_pairs.length === 0 ? (
								<Text className="font-inter text-gray-400 text-xs">—</Text>
							) : (
								<>
									{t.language_pairs.slice(0, 3).map((p) => (
										<View
											key={p.id}
											className="rounded-full bg-blue-50 px-2 py-0.5"
										>
											<Text className="font-inter text-blue-800 text-[11px]">
												{formatLanguagePairCode(p)}
												{'  '}
												<Text className="text-blue-500 text-[10px]">
													{PROFICIENCY_LABELS[p.proficiency_level]}
												</Text>
											</Text>
										</View>
									))}
									{t.language_pairs.length > 3 && (
										<Text className="self-center font-inter text-gray-400 text-[11px]">
											+{t.language_pairs.length - 3}
										</Text>
									)}
								</>
							)}
						</View>

						{/* QUALIFICACOES */}
						<View className="hidden w-[12%] min-w-0 flex-none pr-3 md:flex">
							{t.qualifications.length === 0 ? (
								<Text className="font-inter text-gray-400 text-xs">—</Text>
							) : (
								<View className="flex-row flex-wrap gap-1">
									{t.qualifications.slice(0, 2).map((q) => (
										<View
											key={q.id}
											className="rounded-full bg-gray-100 px-2 py-0.5"
										>
											<Text
												className="font-inter text-gray-700 text-[10px]"
												numberOfLines={1}
											>
												{q.name}
											</Text>
										</View>
									))}
									{t.qualifications.length > 2 && (
										<Text className="font-inter text-gray-400 text-[10px]">
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
									t.is_active ? 'bg-gray-100' : 'bg-gray-50'
								}`}
							>
								<View
									className={`h-1.5 w-1.5 rounded-full ${
										t.is_active ? 'bg-green-500' : 'bg-gray-400'
									}`}
								/>
								<Text
									className={`font-inter font-medium text-[11px] ${
										t.is_active ? 'text-gray-700' : 'text-gray-400'
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
						<View className="mb-3 h-10 w-10 items-center justify-center rounded-full bg-gray-100">
							<UserRound size={18} color="#9CA3AF" />
						</View>
						<Text className="font-inter font-medium text-gray-800 text-sm">
							Nenhum tradutor encontrado
						</Text>
						<Text className="mt-1 font-inter text-gray-400 text-xs">
							Os tradutores cadastrados aparecerão aqui.
						</Text>
					</View>
				}
			/>
		</View>
	);
}
