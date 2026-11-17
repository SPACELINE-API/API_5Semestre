import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
	ClientesIcon,
	OrcamentoIcon,
	OrdemServicoIcon,
	RequisicoesIcon,
	SuporteIcon,
	TradutoresIcon,
} from '../../../shared/components/icon/icon';
import type { DashboardShortcut } from '../types/shortcut';

function getShortcutIcon(id: string) {
	switch (id) {
		case 'assignments':
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

/**
 * Atalho compacto: ícone + nome.
 * Mobile: coluna (3 por linha). Desktop: linha.
 * Hover: só troca de fundo/borda, sem sombra.
 */
export function DashboardCard({ shortcut }: DashboardCardProps) {
	const router = useRouter();
	const Icon = getShortcutIcon(shortcut.id);
	const displayTitle =
		shortcut.id === 'assignments' ? 'Tarefas Atribuídas' : shortcut.title;

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={`Acessar ${shortcut.title}`}
			onPress={() => router.push(shortcut.route as never)}
			className="group w-[31.5%] items-center gap-2 rounded-xl border border-border bg-surface px-2 py-3 transition-colors hover:border-border-strong hover:bg-surface-subtle active:bg-surface-muted md:w-auto md:max-w-[260px] md:flex-1 md:basis-[200px] md:flex-row md:gap-3 md:px-4 md:py-3.5"
		>
			<View className="h-9 w-9 items-center justify-center rounded-lg bg-primary-soft md:h-10 md:w-10">
				<Icon size={18} color="#2563eb" strokeWidth={2} />
			</View>
			<Text
				className="font-inter-medium text-center text-xs leading-tight text-foreground md:flex-1 md:text-left md:text-sm"
				numberOfLines={2}
			>
				{displayTitle}
			</Text>
		</Pressable>
	);
}
