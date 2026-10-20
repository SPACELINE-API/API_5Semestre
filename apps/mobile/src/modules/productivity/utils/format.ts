const EMPTY = '—';

export function formatInteger(value: number): string {
	return value.toLocaleString('pt-BR');
}

export function formatCurrencyValue(value: string | number | null): string {
	if (value === null || value === '') return EMPTY;
	const numeric = Number(value);
	if (Number.isNaN(numeric)) return EMPTY;
	return numeric.toLocaleString('pt-BR', {
		style: 'currency',
		currency: 'BRL',
	});
}

export function formatPercent(rate: number | null): string {
	if (rate === null) return EMPTY;
	return `${Math.round(rate * 100)}%`;
}

export function formatDays(days: number | null): string {
	if (days === null) return EMPTY;
	return `${days.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} d`;
}

export function formatIsoDate(value: string): string {
	const [year, month, day] = value.split('-');
	return `${day}/${month}/${year}`;
}

function oneDecimal(value: number): string {
	return String(Math.round(value * 10) / 10).replace('.', ',');
}

export function formatCompact(value: number): string {
	const magnitude = Math.abs(value);
	if (magnitude >= 1_000_000) return `${oneDecimal(value / 1_000_000)} mi`;
	if (magnitude >= 1_000) return `${oneDecimal(value / 1_000)} mil`;
	return oneDecimal(value);
}
