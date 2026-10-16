import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../shared/services/publicApiClient';
import { getMyProfile } from '../services/profileService';
import type { TranslatorProfile } from '../types/profile';

export function useMyProfile() {
	const [profile, setProfile] = useState<TranslatorProfile | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			setProfile(await getMyProfile());
		} catch (cause) {
			setError(
				cause instanceof ApiError && cause.status === 404
					? 'Nenhum perfil de tradutor está associado a este usuário.'
					: 'Não foi possível carregar o perfil. Tente novamente.',
			);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	return { profile, setProfile, isLoading, error, refresh };
}
