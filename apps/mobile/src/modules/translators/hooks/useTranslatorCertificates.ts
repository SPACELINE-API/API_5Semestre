import { useCallback, useEffect, useState } from 'react';
import { listTranslatorCertificates } from '../services/certificateService';
import type { TranslatorCertificate } from '../types/certificate';

// CERTIFICADOS DE UM TRADUTOR, VISTOS PELO ADMINISTRADOR
export function useTranslatorCertificates(translatorId: string | undefined) {
	const [certificates, setCertificates] = useState<TranslatorCertificate[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		if (!translatorId) return;
		setIsLoading(true);
		setError(null);

		try {
			setCertificates(await listTranslatorCertificates(translatorId));
		} catch {
			setError('Não foi possível carregar as solicitações. Tente novamente.');
		} finally {
			setIsLoading(false);
		}
	}, [translatorId]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const pendingCount = certificates.filter(
		(certificate) => certificate.status === 'pending',
	).length;

	return { certificates, pendingCount, isLoading, error, refresh };
}
