const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

type DateOnlyStyle = 'short' | 'long';

export function formatDateOnly(
	value: string | null | undefined,
	style: DateOnlyStyle = 'short',
): string {
	if (!value) return '';
	const match = DATE_ONLY_PATTERN.exec(value);
	if (!match) return value;
	const [, year, month, day] = match;
	const date = new Date(
		Date.UTC(Number(year), Number(month) - 1, Number(day), 12),
	);
	return date.toLocaleDateString('pt-BR', {
		day: '2-digit',
		month: style === 'long' ? 'long' : '2-digit',
		year: 'numeric',
		timeZone: 'UTC',
	});
}
