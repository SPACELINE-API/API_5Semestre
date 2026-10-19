import { useCallback, useEffect, useState } from 'react';
import { listMyCertificates } from '../services/certificateService';
import type { TranslatorCertificate } from '../types/certificate';

export function useMyCertificates() {
	const [certificates, setCertificates] = useState<TranslatorCertificate[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			setCertificates(await listMyCertificates());
		} catch {
			setError('Não foi possível carregar os certificados. Tente novamente.');
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	return { certificates, isLoading, error, refresh };
}
