export function centsToBRL(cents: number): string {
	return (cents / 100).toLocaleString('pt-BR', {
		style: 'currency',
		currency: 'BRL',
	});
}

export function decimalStringToBRL(value: string): string {
	const cents = value ? Math.round(Number(value) * 100) : 0;
	return centsToBRL(Number.isNaN(cents) ? 0 : cents);
}

export function maskCurrencyDigits(rawText: string): string {
	const digits = rawText.replace(/\D/g, '');
	if (!digits) return '';
	return (parseInt(digits, 10) / 100).toFixed(2);
}
