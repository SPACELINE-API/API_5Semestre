import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Slot } from 'expo-router';
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

	useEffect(() => {
		if (fontsLoaded || error) {
			SplashScreen.hideAsync();
		}
	}, [fontsLoaded, error]);

	if (!fontsLoaded && !error) {
		return null;
	}

	return (
		<SafeAreaView className="flex-1 bg-gray-50 flex-row">
			<SideBar />
			<View className="flex-1 overflow-hidden">
				<Slot />
			</View>
		</SafeAreaView>
	);
}
