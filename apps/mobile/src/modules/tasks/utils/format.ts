// O PRAZO E SO UMA DATA (AAAA-MM-DD); CONVERTER PARA FUSO HORARIO MOSTRARIA O DIA ANTERIOR
export function formatDueDate(value: string | null): string {
	if (!value) return 'Sem prazo';
	const [year, month, day] = value.slice(0, 10).split('-');
	if (!year || !month || !day) return 'Sem prazo';
	return `${day}/${month}/${year}`;
}

export function formatDateTime(value: string | null): string {
	if (!value) return '—';
	return new Date(value).toLocaleString('pt-BR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'America/Sao_Paulo',
	});
}

export function personName(person: { name: string | null; email: string }) {
	return person.name?.trim() || person.email;
}
