import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
const REDIRECT_DELAY_MS = 3000;

type AccessDeniedProps = {
	redirectTo: string;
};

export function AccessDenied({ redirectTo }: AccessDeniedProps) {
	const themeColors = useThemeColors();
	const router = useRouter();
	const redirectMessage =
		redirectTo === '/dashboard'
			? 'Redirecionando para o dashboard em 3 segundos...'
			: 'Redirecionando para uma página permitida em 3 segundos...';

	useEffect(() => {
		const timeout = setTimeout(
			() => router.replace(redirectTo as never),
			REDIRECT_DELAY_MS,
		);
		return () => clearTimeout(timeout);
	}, [redirectTo, router]);

	return (
		<View
			style={{
				flex: 1,
				justifyContent: 'center',
				alignItems: 'center',
				padding: 24,
			}}
		>
			<Text
				style={{
					fontSize: 20,
					fontWeight: '600',
					color: themeColors.foreground,
				}}
			>
				Acesso negado
			</Text>
			<Text
				style={{
					fontSize: 16,
					textAlign: 'center',
					color: themeColors.foregroundSecondary,
					marginTop: 8,
				}}
			>
				Você não tem permissão para acessar esta página.
			</Text>
			<Text
				style={{
					fontSize: 14,
					textAlign: 'center',
					color: themeColors.foregroundMuted,
					marginTop: 12,
				}}
			>
				{redirectMessage}
			</Text>
		</View>
	);
}
