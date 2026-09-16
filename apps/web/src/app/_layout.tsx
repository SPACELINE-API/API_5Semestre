import { Redirect, Slot, usePathname } from 'expo-router';
import { SafeAreaView, View } from 'react-native';
import { SideBar } from '../components/SideBar';
import { getSession } from '../modules/auth/services/auth';

import '../shared/styles/global.css';

const PUBLIC_ROUTES = new Set(['/login']);

export default function WebLayout() {
	const pathname = usePathname();
	const isPublicRoute = PUBLIC_ROUTES.has(pathname);
	const session = getSession();

	if (!isPublicRoute && !session) {
		return <Redirect href="/login" />;
	}

	if (isPublicRoute) {
		return (
			<SafeAreaView className="flex-1 bg-slate-50">
				<Slot />
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView className="flex-1 flex-row bg-gray-50">
			<SideBar />
			<View className="flex-1 overflow-hidden">
				<Slot />
			</View>
		</SafeAreaView>
	);
}
