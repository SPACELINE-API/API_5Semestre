import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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
import { getSession } from '../modules/auth/services/auth';

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

	if (!fontsLoaded && !error) {
		return null;
	}
	const isLogin = pathname === '/login';
	if (!isLogin && !getSession()) return <Redirect href={'/login' as never} />;
	if (isLogin) return <Slot />;

	return (
		<SafeAreaProvider>
			<AppShell
				isMobileNavOpen={isMobileNavOpen}
				onCloseMobileNav={() => setIsMobileNavOpen(false)}
				onOpenMobileNav={() => setIsMobileNavOpen(true)}
			/>
		</SafeAreaProvider>
	);
}

type AppShellProps = {
	isMobileNavOpen: boolean;
	onCloseMobileNav: () => void;
	onOpenMobileNav: () => void;
};

function AppShell({
	isMobileNavOpen,
	onCloseMobileNav,
	onOpenMobileNav,
}: AppShellProps) {
	const insets = useSafeAreaInsets();

	return (
		<View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#f9fafb' }}>
			<SideBar mobileOpen={isMobileNavOpen} onCloseMobile={onCloseMobileNav} />
			<View style={{ flex: 1, overflow: 'hidden' }}>
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

				<Slot />
			</View>
		</View>
	);
}
