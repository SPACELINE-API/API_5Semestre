import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { acceptCookies, hasAcceptedCookies } from '../services/auth';
import { CookieConsentModal } from './CookieConsentModal';
import { LoginBackground } from './LoginBackground';
import { LoginForm } from './LoginForm';

export function LoginPage() {
	const [cookiesAccepted, setCookiesAccepted] = useState(false);
	const [showCookieModal, setShowCookieModal] = useState(false);
	const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

	useEffect(() => {
		if (typeof window !== 'undefined') {
			const params = new URLSearchParams(
				window.location.hash.replace(/^#/, ''),
			);
			setIsPasswordRecovery(params.get('type') === 'recovery');
		}
		const accepted = hasAcceptedCookies();
		setCookiesAccepted(accepted);
		setShowCookieModal(!accepted);
	}, []);

	function handleAcceptCookies() {
		acceptCookies();
		setCookiesAccepted(true);
		setShowCookieModal(false);
	}

	function handleDeclineCookies() {
		setCookiesAccepted(false);
		setShowCookieModal(false);
	}

	return (
		<View className="min-h-screen flex-1 overflow-hidden bg-[#dceeff]">
			<LoginBackground />
			<View
				className={`z-10 flex-1 px-6 py-6 sm:px-10 ${isPasswordRecovery ? 'items-center justify-center' : 'flex-col md:flex-row md:px-[7.5%] md:py-5'}`}
			>
				{!isPasswordRecovery ? (
					<>
						<View className="flex-1 justify-center md:py-2">
							<View className="max-w-xl">
								<View className="mb-7 self-start rounded-full border border-[#2f86d1]/35 bg-white/70 px-4 py-1.5">
									<Text className="text-[11px] font-bold tracking-[2px] text-[#2478c2]">
										• PORTAL DO CLIENTE
									</Text>
								</View>
								<Text className="text-5xl font-extrabold leading-[1.03] tracking-[-1.5px] text-[#101b35] sm:text-6xl">
									Traduções com{'\n'}
									<Text className="text-[#2783d4]">clareza</Text>, prazo e{'\n'}
									controle.
								</Text>
								<Text className="mt-6 max-w-md text-base leading-6 text-[#506481] sm:text-lg">
									Gerencie pedidos, acompanhe orçamentos e fale com a equipe sem
									perder o histórico.
								</Text>
							</View>
						</View>
					</>
				) : null}
				<View className="w-full items-center justify-center py-10 md:w-[46%] md:py-0">
					<LoginForm cookiesAccepted={cookiesAccepted} />
				</View>
			</View>
			{showCookieModal ? (
				<CookieConsentModal
					onAccept={handleAcceptCookies}
					onDecline={handleDeclineCookies}
				/>
			) : null}
		</View>
	);
}
