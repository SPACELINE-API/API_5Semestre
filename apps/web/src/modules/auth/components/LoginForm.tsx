import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { login, saveSession } from '../services/auth';

export function LoginForm() {
	const router = useRouter();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [remember, setRemember] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	async function handleSubmit() {
		if (!email.trim() || !password) {
			setError('Informe seu e-mail e sua senha.');
			return;
		}
		setError('');
		setLoading(true);
		try {
			const session = await login(email.trim(), password);
			saveSession(session, remember);
			router.replace('/dashboard' as never);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Não foi possível entrar.');
		} finally {
			setLoading(false);
		}
	}

	return (
		<View className="w-full max-w-2xl rounded-3xl border border-white/60 bg-white/20 px-6 py-8 shadow-lg shadow-slate-900/10 sm:px-12 sm:py-10">
			<Text className="mb-2 text-base font-bold text-white">E-mail</Text>
			<TextInput
				className="mb-6 h-14 rounded-xl border-2 border-white/70 bg-white/90 px-5 text-base text-slate-900"
				placeholder="seuemail@exemplo.com"
				placeholderTextColor="#94a3b8"
				keyboardType="email-address"
				autoCapitalize="none"
				value={email}
				onChangeText={setEmail}
			/>
			<Text className="mb-2 text-base font-bold text-white">Senha</Text>
			<TextInput
				className="h-14 rounded-xl border-2 border-white/70 bg-white/90 px-5 text-base text-slate-900"
				placeholder="••••••••"
				placeholderTextColor="#94a3b8"
				secureTextEntry
				value={password}
				onChangeText={setPassword}
			/>
			<View className="mb-7 mt-5 flex-row items-center justify-between">
				<Pressable className="flex-row items-center gap-3" onPress={() => setRemember(!remember)}>
					<View className={`h-6 w-6 rounded-md border-2 ${remember ? 'border-sky-500 bg-sky-400' : 'border-sky-300 bg-white'}`} />
					<Text className="text-sm text-slate-600">Lembrar-me</Text>
				</Pressable>
				<Pressable onPress={() => setError('A recuperação de senha estará disponível em breve.') }>
					<Text className="text-sm font-bold text-blue-600">Esqueci minha senha</Text>
				</Pressable>
			</View>
			{error ? <Text className="mb-4 text-sm text-red-600">{error}</Text> : null}
			<Pressable className="h-14 items-center justify-center rounded-full bg-blue-600 shadow-md shadow-blue-600/30" disabled={loading} onPress={handleSubmit}>
				<Text className="font-bold text-white">{loading ? 'ENTRANDO...' : 'ENTRAR'}</Text>
			</Pressable>
		</View>
	);
}
