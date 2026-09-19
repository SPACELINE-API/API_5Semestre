export function formatCnpj(value: string): string {
	const normalized = value.replace(/[^0-9A-Za-z]/g, '');

	if (normalized.length !== 14) {
		return value;
	}

	return `${normalized.slice(0, 2)}.${normalized.slice(2, 5)}.${normalized.slice(5, 8)}/${normalized.slice(8, 12)}-${normalized.slice(12, 14)}`;
}

export function formatDate(value: string): string {
	return new Date(value).toLocaleDateString('pt-BR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	});
}

export function companyInitials(tradeName: string): string {
	const words = tradeName.trim().split(/\s+/).filter(Boolean);

	if (words.length === 0) return '?';
	if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

	return `${words[0][0]}${words[1][0]}`.toUpperCase();
}
