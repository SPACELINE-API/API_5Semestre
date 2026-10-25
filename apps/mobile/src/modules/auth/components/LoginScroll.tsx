import type { ReactNode } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

export function LoginScroll({ children }: { children: ReactNode }) {
	if (Platform.OS === 'web') {
		return (
			<View className="min-h-screen flex-1 overflow-y-auto">{children}</View>
		);
	}

	return (
		<KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
			<ScrollView
				contentContainerStyle={{ flexGrow: 1 }}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{children}
			</ScrollView>
		</KeyboardAvoidingView>
	);
}
