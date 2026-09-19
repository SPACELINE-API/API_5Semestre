export function maskCnpj(value: string): string {
	const normalized = value
		.replace(/[^0-9A-Za-z]/g, '')
		.toUpperCase()
		.slice(0, 14);

	const parts = [
		normalized.slice(0, 2),
		normalized.slice(2, 5),
		normalized.slice(5, 8),
		normalized.slice(8, 12),
		normalized.slice(12, 14),
	];

	let masked = parts[0];
	if (parts[1]) masked += `.${parts[1]}`;
	if (parts[2]) masked += `.${parts[2]}`;
	if (parts[3]) masked += `/${parts[3]}`;
	if (parts[4]) masked += `-${parts[4]}`;

	return masked;
}

export function maskPhone(value: string): string {
	const digits = value.replace(/\D/g, '').slice(0, 11);

	if (digits.length === 0) return '';
	if (digits.length <= 2) return `(${digits}`;

	const ddd = digits.slice(0, 2);
	const rest = digits.slice(2);

	if (rest.length <= 4) {
		return `(${ddd}) ${rest}`;
	}

	const splitAt = digits.length > 10 ? 5 : 4;
	const prefix = rest.slice(0, splitAt);
	const suffix = rest.slice(splitAt);

	return suffix ? `(${ddd}) ${prefix}-${suffix}` : `(${ddd}) ${prefix}`;
}
