import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';

type ReopenedQuoteIndicatorProps = {
	reopenedAt: string;
	reason?: string | null;
	reopenedByEmail?: string | null;
	reopenCount?: number;
	onOpenChange?: (open: boolean) => void;
};

function formatReopenDate(value: string) {
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

export function reopenedQuoteMessage({
	reopenedAt,
	reopenedByEmail,
	reopenCount = 1,
}: Pick<
	ReopenedQuoteIndicatorProps,
	'reopenedAt' | 'reopenedByEmail' | 'reopenCount'
>) {
	const when = formatReopenDate(reopenedAt);
	const author = reopenedByEmail ? ` por ${reopenedByEmail}` : '';
	if (reopenCount > 1) {
		return `Este orçamento foi reaberto ${reopenCount} vezes. A última reabertura foi em ${when}${author}.`;
	}
	return `Este orçamento foi reaberto em ${when}${author}.`;
}

export function ReopenedQuoteIndicator({
	reopenedAt,
	reason,
	reopenedByEmail,
	reopenCount = 1,
	onOpenChange,
}: ReopenedQuoteIndicatorProps) {
	const [open, setOpen] = useState(false);
	const hovered = useRef(false);

	function changeOpen(next: boolean) {
		setOpen(next);
		onOpenChange?.(next);
	}

	return (
		<View className="relative" style={{ zIndex: open ? 50 : 0 }}>
			<Pressable
				accessibilityRole="img"
				accessibilityLabel="Orçamento reaberto"
				accessibilityHint="Mostra quando e por que o orçamento foi reaberto"
				accessibilityState={{ expanded: open }}
				testID="reopened-quote-indicator"
				hitSlop={8}
				onPress={() => changeOpen(hovered.current ? true : !open)}
				onHoverIn={() => {
					hovered.current = true;
					changeOpen(true);
				}}
				onHoverOut={() => {
					hovered.current = false;
					changeOpen(false);
				}}
				className="h-6 w-6 items-center justify-center rounded-full bg-amber-100"
			>
				<TriangleAlert size={14} color="#d97706" />
			</Pressable>
			{open ? (
				<View
					accessibilityRole="alert"
					testID="reopened-quote-tooltip"
					className="absolute left-0 top-8 w-64 rounded-lg border border-amber-200 bg-amber-50 p-3 shadow-md"
				>
					<Text className="font-inter-semibold text-xs text-amber-900">
						Orçamento reaberto
					</Text>
					<Text className="mt-1 font-inter text-xs text-amber-800">
						{reopenedQuoteMessage({ reopenedAt, reopenedByEmail, reopenCount })}
					</Text>
					{reason ? (
						<Text className="mt-1 font-inter text-xs text-amber-800">
							Motivo: {reason}
						</Text>
					) : null}
				</View>
			) : null}
		</View>
	);
}
