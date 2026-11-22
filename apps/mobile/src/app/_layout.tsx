import { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import {
	SafeAreaProvider,
	useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Menu } from 'lucide-react-native';
import { Redirect, Slot, usePathname } from 'expo-router';
import Head from 'expo-router/head';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SideBar } from '../components/SideBar';
import { AccessDenied } from '../modules/auth/components/AccessDenied';
import { NotificationCenter } from '../modules/notifications/components/NotificationCenter';
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
import { ThemeProvider } from '../shared/theme/ThemeProvider';
import { ThemeToggle } from '../shared/theme/ThemeToggle';
import {
	getSession,
	loadAuthorizationContext,
	getAuthorizationContext,
	subscribeAuthorizationContext,
	clearSession,
} from '../modules/auth/services/auth';
import { ApiError } from '../shared/services/publicApiClient';
import {
	canAccess,
	firstAllowedRoute,
	isInternalUserPath,
	isPublicPath,
	requiredPermission,
} from '../modules/auth/services/authorization';
import { useInactivityLogout } from '../modules/auth/hooks/useInactivityLogout';

import { useThemeColors } from '../shared/theme/ThemeProvider';
SplashScreen.preventAutoHideAsync();

export default function AppLayout() {
	return (
		<>
			<Head>
				<title>SpaceLang</title>
			</Head>
			<ThemeProvider>
				<AppLayoutContent />
			</ThemeProvider>
		</>
	);
}

function AppLayoutContent() {
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
	const isPublic = isPublicPath(pathname);
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

	useEffect(
		() =>
			subscribeAuthorizationContext(() =>
				setAuthorizationVersion((version) => version + 1),
			),
		[],
	);

	useEffect(() => {
		let active = true;
		if (!session || isPublicPath(pathname)) {
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
			.catch((cause: unknown) => {
				if (active) {
					if (cause instanceof ApiError && cause.status === 401) {
						clearSession();
						setAuthorizationError(false);
						setAuthorizationLoaded(true);
						return;
					}
					setAuthorizationError(true);
					setAuthorizationLoaded(true);
				}
			});
		return () => {
			active = false;
		};
	}, [session?.access_token, isPublicPath(pathname)]);

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
	if (!isPublic && authorizationLoaded && authorizationError) {
		if (!session && !authorizationContext)
			return <Redirect href={'/login' as never} />;
		return <AuthorizationUnavailable />;
	}
	if (
		!isPublic &&
		authorizationLoaded &&
		(requiredPermission(pathname) || isInternalUserPath(pathname)) &&
		!canAccess(authorizationContext, pathname)
	) {
		const redirectTo = canAccess(authorizationContext, '/dashboard')
			? '/dashboard'
			: firstAllowedRoute(authorizationContext);
		return <AccessDenied redirectTo={redirectTo} />;
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
	const themeColors = useThemeColors();
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
					fontSize: 16,
					textAlign: 'center',
					color: themeColors.foregroundSecondary,
				}}
			>
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
	const themeColors = useThemeColors();
	const insets = useSafeAreaInsets();
	const registerActivity = useInactivityLogout(showNavigation);

	return (
		<View
			onTouchStart={registerActivity}
			style={{
				flex: 1,
				flexDirection: 'row',
				backgroundColor: themeColors.background,
			}}
		>
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
						className="flex-row items-center border-b border-border-subtle bg-surface px-4 py-3 pr-16 md:hidden"
					>
						<TouchableOpacity
							onPress={onOpenMobileNav}
							activeOpacity={0.7}
							accessibilityRole="button"
							accessibilityLabel="Abrir menu"
							className="h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-subtle md:invisible"
						>
							<Menu size={22} color={themeColors.foreground} strokeWidth={2} />
						</TouchableOpacity>
					</View>
				) : null}
				{showNavigation ? (
					<View
						style={{ paddingTop: insets.top, minHeight: 56 + insets.top }}
						className="hidden flex-row items-center justify-end border-b border-border-subtle bg-surface pr-[76px] md:flex"
					>
						<ThemeToggle />
					</View>
				) : null}
				{showNavigation ? (
					<View pointerEvents="box-none" className="absolute inset-0 z-50">
						<NotificationCenter topOffset={insets.top - 4} />
						<View
							pointerEvents="box-none"
							className="absolute z-50 md:hidden"
							style={{ top: insets.top + 3, right: 60 }}
						>
							<ThemeToggle />
						</View>
					</View>
				) : null}

				<Slot />
			</View>
		</View>
	);
}
