import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
	ClientesIcon,
	OrcamentoIcon,
	OrdemServicoIcon,
	RequisicoesIcon,
	SuporteIcon,
	TradutoresIcon,
	ChevronRight,
} from '../../../shared/components/icon/icon';
import type { DashboardShortcut } from '../types/shortcut';

function getShortcutIcon(id: string) {
	switch (id) {
		case 'assignments':
			return RequisicoesIcon;
		case 'requests':
			return RequisicoesIcon;
		case 'quotes':
			return OrcamentoIcon;
		case 'service-orders':
			return OrdemServicoIcon;
		case 'clients':
			return ClientesIcon;
		case 'translators':
			return TradutoresIcon;
		case 'support':
			return SuporteIcon;
		default:
			return RequisicoesIcon;
	}
}

type DashboardCardProps = {
	shortcut: DashboardShortcut;
};

export function DashboardCard({ shortcut }: DashboardCardProps) {
	const router = useRouter();
	const Icon = getShortcutIcon(shortcut.id);
	const displayTitle =
		shortcut.id === 'assignments' ? 'Tarefas Atribuídas' : shortcut.title;

	return (
		<TouchableOpacity
			accessibilityRole="button"
			accessibilityLabel={`Acessar ${shortcut.title}`}
			onPress={() => router.push(shortcut.route as never)}
			activeOpacity={0.7}
			className="min-w-[140px] flex-1 basis-[140px] md:basis-[280px] max-w-[calc(50%-5px)] md:max-w-[380px] justify-between rounded-xl md:rounded-2xl border border-gray-200 bg-white p-3.5 md:p-5 shadow-xs hover:border-blue-300 hover:shadow-md transition-all"
		>
			<View>
				<View className="flex-row items-center justify-between">
					<View className="h-8 w-8 md:h-11 md:w-11 items-center justify-center rounded-lg md:rounded-xl bg-blue-50">
						<Icon size={18} color="#2563eb" strokeWidth={2} />
					</View>
					<View className="rounded-full bg-gray-100 px-2 py-0.5">
						<Text className="font-inter-medium text-[10px] md:text-xs text-gray-600">
							{shortcut.category}
						</Text>
					</View>
				</View>

				<Text
					className="mt-2.5 md:mt-3 font-inter font-bold text-xs md:text-base text-gray-900"
					numberOfLines={1}
				>
					{displayTitle}
				</Text>
				<Text
					className="mt-1 font-inter text-[11px] md:text-xs text-gray-500 leading-snug"
					numberOfLines={2}
				>
					{shortcut.description}
				</Text>
			</View>

			<View className="mt-2.5 md:mt-4 flex-row items-center justify-between border-t border-gray-100 pt-2 md:pt-3">
				<Text className="font-inter font-semibold text-[11px] md:text-xs text-blue-600">
					Acessar
				</Text>
				<ChevronRight size={14} color="#2563eb" strokeWidth={2} />
			</View>
		</TouchableOpacity>
	);
}
