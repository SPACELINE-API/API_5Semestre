import { View, Text, FlatList } from 'react-native';
import { Languages } from 'lucide-react-native';

import type { Translator } from '../types/translator';
import { translatorInitials } from '../utils/format';

type TranslatorTableProps = {
	translators: Translator[];
};

export function TranslatorTable({ translators }: TranslatorTableProps) {
	return (
		<View className="bg-white">
			<View className="hidden h-11 flex-row items-center border-b border-gray-200 px-5 md:flex">
				<Text className="w-[26%] font-inter font-medium text-[11px] uppercase tracking-wide text-gray-400">
					Tradutor
				</Text>
				<Text className="w-[24%] font-inter font-medium text-[11px] uppercase tracking-wide text-gray-400">
					Contato
				</Text>
				<Text className="w-[24%] font-inter font-medium text-[11px] uppercase tracking-wide text-gray-400">
					Especialidades
				</Text>
				<Text className="w-[16%] font-inter font-medium text-[11px] uppercase tracking-wide text-gray-400">
					Idiomas
				</Text>
				<Text className="w-[10%] font-inter font-medium text-[11px] uppercase tracking-wide text-gray-400">
					Disponibilidade
				</Text>
			</View>

			<FlatList
				data={translators}
				keyExtractor={(translator) => translator.id}
				scrollEnabled={false}
				renderItem={({ item: translator }) => (
					<View className="min-h-[78px] flex-row items-center border-b border-gray-100 px-4 py-4 md:px-5">
						<View className="flex-1 flex-row items-center gap-3 md:w-[26%] md:flex-none md:pr-4">
							<View className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
								<Text className="font-inter font-semibold text-gray-600 text-xs">
									{translatorInitials(translator.name)}
								</Text>
							</View>

							<View className="min-w-0 flex-1">
								<Text
									className="font-inter font-semibold text-gray-900 text-sm"
									numberOfLines={1}
								>
									{translator.name}
								</Text>
							</View>
						</View>

						<View className="hidden w-[24%] min-w-0 flex-none pr-3 md:flex">
							<Text
								className="font-inter text-gray-700 text-sm"
								numberOfLines={1}
							>
								{translator.email}
							</Text>
							{translator.phone && (
								<Text
									className="mt-0.5 font-inter text-gray-400 text-xs"
									numberOfLines={1}
								>
									{translator.phone}
								</Text>
							)}
						</View>

						<View className="hidden w-[24%] min-w-0 flex-none pr-3 md:flex">
							<Text
								className="font-inter text-gray-600 text-sm"
								numberOfLines={2}
							>
								{translator.qualifications.length > 0
									? translator.qualifications.map((q) => q.name).join(', ')
									: 'Nenhuma cadastrada'}
							</Text>
						</View>

						<View className="hidden w-[16%] min-w-0 flex-none flex-row items-center gap-1.5 pr-3 md:flex">
							<Languages size={14} color="#9CA3AF" />
							<Text className="font-inter text-gray-600 text-sm">
								{translator.language_pairs.length}
							</Text>
						</View>

						<View className="hidden w-[10%] min-w-0 flex-none md:flex">
							<View
								className={`flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1 ${
									translator.is_active ? 'bg-gray-100' : 'bg-gray-50'
								}`}
							>
								<View
									className={`h-1.5 w-1.5 rounded-full ${
										translator.is_active ? 'bg-green-500' : 'bg-gray-400'
									}`}
								/>
								<Text
									className={`font-inter font-medium text-[11px] ${
										translator.is_active ? 'text-gray-700' : 'text-gray-400'
									}`}
								>
									{translator.is_active ? 'Ativo' : 'Inativo'}
								</Text>
							</View>
						</View>
					</View>
				)}
				ListEmptyComponent={
					<View className="items-center justify-center py-16">
						<View className="mb-3 h-10 w-10 items-center justify-center rounded-full bg-gray-100">
							<Languages size={18} color="#9CA3AF" />
						</View>
						<Text className="font-inter font-medium text-gray-800 text-sm">
							Nenhum recurso encontrado
						</Text>
						<Text className="mt-1 font-inter text-gray-400 text-xs">
							Ajuste os filtros ou tente outra busca.
						</Text>
					</View>
				}
			/>
		</View>
	);
}
