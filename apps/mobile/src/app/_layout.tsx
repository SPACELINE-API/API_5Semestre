import { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import {
	SafeAreaProvider,
	useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Menu } from 'lucide-react-native';
import { Redirect, Slot, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SideBar } from '../components/SideBar';
import {
	Inter_400Regular,
	Inter_500Medium,
	Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
	Poppins_400Regular,
	Poppins_500Medium,
	Poppins_700Bold,
} from '@expo-google-fonts/poppins';

import '../shared/styles/global.css';
import {
	getSession,
	loadAuthorizationContext,
	getAuthorizationContext,
} from '../modules/auth/services/auth';
import {
	canAccess,
	firstAllowedRoute,
	requiredPermission,
} from '../modules/auth/services/authorization';

SplashScreen.preventAutoHideAsync();

export default function AppLayout() {
	const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
	const [fontsLoaded, error] = useFonts({
		Inter: Inter_400Regular,
		'Inter-Medium': Inter_500Medium,
		'Inter-Bold': Inter_700Bold,
		Poppins: Poppins_400Regular,
		'Poppins-Medium': Poppins_500Medium,
		'Poppins-Bold': Poppins_700Bold,
	});
	const pathname = usePathname();
	const isPublic = pathname === '/login' || pathname === '/solicitar-servico';
	const [authorizationLoaded, setAuthorizationLoaded] = useState(false);
	const [authorizationError, setAuthorizationError] = useState(false);
	const [authorizationVersion, setAuthorizationVersion] = useState(0);
	const [hasMounted, setHasMounted] = useState(false);
	const session = getSession();

	useEffect(() => {
		setHasMounted(true);
	}, []);

	useEffect(() => {
		if (typeof document !== 'undefined') {
			document.documentElement.lang = 'pt-BR';
		}

		if (fontsLoaded || error) {
			SplashScreen.hideAsync();
		}
	}, [fontsLoaded, error]);

	useEffect(() => {
		setIsMobileNavOpen(false);
	}, [pathname]);

	useEffect(() => {
		let active = true;
		if (
			!session ||
			pathname === '/login' ||
			pathname === '/solicitar-servico'
		) {
			setAuthorizationLoaded(false);
			setAuthorizationError(false);
			return () => {
				active = false;
			};
		}
		setAuthorizationLoaded(false);
		loadAuthorizationContext()
			.then(() => {
				if (active) {
					setAuthorizationError(false);
					setAuthorizationLoaded(true);
					setAuthorizationVersion((version) => version + 1);
				}
			})
			.catch(() => {
				if (active) {
					setAuthorizationError(true);
					setAuthorizationLoaded(true);
				}
			});
		return () => {
			active = false;
		};
	}, [
		session?.access_token,
		pathname === '/login' || pathname === '/solicitar-servico',
	]);

	if (!fontsLoaded && !error) {
		return null;
	}

	if (isPublic)
		return (
			<KeyboardProvider>
				<Slot />
			</KeyboardProvider>
		);
	const authorizationContext = getAuthorizationContext();
	if (!isPublic && hasMounted && !session && !authorizationContext)
		return <Redirect href={'/login' as never} />;
	if (!isPublic && !authorizationLoaded && !authorizationContext) return null;
	if (!isPublic && authorizationLoaded && authorizationError)
		return <AuthorizationUnavailable />;
	if (
		!isPublic &&
		authorizationLoaded &&
		requiredPermission(pathname) &&
		!canAccess(authorizationContext, pathname)
	) {
		return <Redirect href={firstAllowedRoute(authorizationContext) as never} />;
	}
	const showAppShell = !isPublic && Boolean(session || authorizationContext);

	return (
		<SafeAreaProvider>
			<KeyboardProvider>
				<AppShell
					authorizationVersion={authorizationVersion}
					permissions={authorizationContext?.permissions ?? []}
					showNavigation={showAppShell}
					isMobileNavOpen={isMobileNavOpen}
					onCloseMobileNav={() => setIsMobileNavOpen(false)}
					onOpenMobileNav={() => setIsMobileNavOpen(true)}
				/>
			</KeyboardProvider>
		</SafeAreaProvider>
	);
}

function AuthorizationUnavailable() {
	return (
		<View
			style={{
				flex: 1,
				justifyContent: 'center',
				alignItems: 'center',
				padding: 24,
			}}
		>
			<Text style={{ fontSize: 16, textAlign: 'center', color: '#374151' }}>
				Não foi possível carregar suas permissões. Faça login novamente ou tente
				mais tarde.
			</Text>
		</View>
	);
}

type AppShellProps = {
	permissions: string[];
	showNavigation: boolean;
	authorizationVersion: number;
	isMobileNavOpen: boolean;
	onCloseMobileNav: () => void;
	onOpenMobileNav: () => void;
};

function AppShell({
	isMobileNavOpen,
	permissions,
	showNavigation,
	authorizationVersion,
	onCloseMobileNav,
	onOpenMobileNav,
}: AppShellProps) {
	const insets = useSafeAreaInsets();

	return (
		<View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#f9fafb' }}>
			{showNavigation ? (
				<SideBar
					key={authorizationVersion}
					permissions={permissions}
					mobileOpen={isMobileNavOpen}
					onCloseMobile={onCloseMobileNav}
				/>
			) : null}
			<View style={{ flex: 1, overflow: 'hidden' }}>
				{showNavigation ? (
					<View
						style={{ paddingTop: insets.top }}
						className="flex-row items-center gap-3 border-b border-gray-100 bg-white px-4 py-3 md:hidden"
					>
						<TouchableOpacity
							onPress={onOpenMobileNav}
							activeOpacity={0.7}
							accessibilityRole="button"
							accessibilityLabel="Abrir menu"
							className="h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-50"
						>
							<Menu size={22} color="#1f2937" strokeWidth={2} />
						</TouchableOpacity>
					</View>
				) : null}

				<Slot />
			</View>
		</View>
	);
}
