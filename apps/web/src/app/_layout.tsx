import { Slot } from 'expo-router';
import { SafeAreaView, View } from 'react-native';
import { SideBar } from '../components/SideBar';

import '../shared/styles/global.css';

export default function WebLayout() {
	return (
		<SafeAreaView className="flex-1 flex-row bg-gray-50">
			<SideBar />
			<View className="flex-1 overflow-hidden">
				<Slot />
			</View>
		</SafeAreaView>
	);
}
