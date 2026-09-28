export function formatDate(value: string | null): string {
	if (!value) return 'Não definido';

	return new Date(value).toLocaleDateString('pt-BR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	});
}

export function formatPrice(value: string | null): string {
	if (!value) return 'Não informado';

	const numeric = Number(value);
	if (Number.isNaN(numeric)) return value;

	return numeric.toLocaleString('pt-BR', {
		style: 'currency',
		currency: 'BRL',
	});
}
