import { useEffect } from 'react';
import { View, SafeAreaView } from 'react-native';
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

	if (!fontsLoaded && !error) {
		return null;
	}
	const isLogin = pathname === '/login';
	if (!isLogin && !getSession()) return <Redirect href={'/login' as never} />;
	if (isLogin) return <Slot />;

	return (
		<SafeAreaView className="flex-1 bg-gray-50 flex-row">
			<SideBar />
			<View className="flex-1 overflow-hidden">
				<Slot />
			</View>
		</SafeAreaView>
	);
}
