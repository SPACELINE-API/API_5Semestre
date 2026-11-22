import { useRef, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
const TOOLTIP_MAX_WIDTH = 256;
const SCREEN_GUTTER = 16;

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
	const themeColors = useThemeColors();
	const [open, setOpen] = useState(false);
	const [offset, setOffset] = useState(0);
	const hovered = useRef(false);
	const anchor = useRef<View>(null);
	const { width: screenWidth } = useWindowDimensions();
	const tooltipWidth = Math.min(
		TOOLTIP_MAX_WIDTH,
		screenWidth - SCREEN_GUTTER * 2,
	);

	function changeOpen(next: boolean) {
		setOpen(next);
		onOpenChange?.(next);
		if (!next) return;
		anchor.current?.measureInWindow((x) => {
			const overflow = x + tooltipWidth - (screenWidth - SCREEN_GUTTER);
			setOffset(overflow > 0 ? -Math.min(overflow, x - SCREEN_GUTTER) : 0);
		});
	}

	return (
		<View ref={anchor} className="relative" style={{ zIndex: open ? 50 : 0 }}>
			<Pressable
				accessibilityRole="image"
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
				className="h-6 w-6 items-center justify-center rounded-full bg-warning-soft"
			>
				<TriangleAlert size={14} color={themeColors.warning} />
			</Pressable>
			{open ? (
				<View
					accessibilityRole="alert"
					testID="reopened-quote-tooltip"
					className="absolute top-8 rounded-lg border border-warning/40 bg-warning-soft p-3 shadow-md"
					style={{ left: offset, width: tooltipWidth }}
				>
					<Text className="font-inter-semibold text-xs text-warning-text">
						Orçamento reaberto
					</Text>
					<Text className="mt-1 font-inter text-xs text-warning-text">
						{reopenedQuoteMessage({ reopenedAt, reopenedByEmail, reopenCount })}
					</Text>
					{reason ? (
						<Text className="mt-1 font-inter text-xs text-warning-text">
							Motivo: {reason}
						</Text>
					) : null}
				</View>
			) : null}
		</View>
	);
}
