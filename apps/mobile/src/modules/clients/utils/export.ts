import { Platform } from 'react-native';
import type { Company } from '../types/company';

export function exportCompaniesAsJson(companies: Company[]): boolean {
	if (Platform.OS !== 'web') {
		return false;
	}

	const json = JSON.stringify(companies, null, 2);
	const blob = new Blob([json], { type: 'application/json' });
	const url = URL.createObjectURL(blob);

	const link = document.createElement('a');
	link.href = url;
	link.download = `empresas-${new Date().toISOString().slice(0, 10)}.json`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);

	URL.revokeObjectURL(url);

	return true;
}
