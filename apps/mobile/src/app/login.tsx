import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { login, requestPasswordRecovery, resetPassword, saveSession } from '../modules/auth/services/auth';

export default function LoginRoute() {
	const router = useRouter();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [recovery, setRecovery] = useState(false);
	const [token, setToken] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmation, setConfirmation] = useState('');
	const [message, setMessage] = useState('');
	const params = useLocalSearchParams<{ access_token?: string; type?: string }>();

	useEffect(() => {
		if (params.type === 'recovery' && params.access_token) {
			setToken(params.access_token);
			setRecovery(true);
		}
	}, [params.access_token, params.type]);

	async function submit() {
		if (recovery && !token) {
			if (!email.trim()) return setError('Digite o e-mail para recuperar sua senha.');
			setLoading(true); setError('');
			try { setMessage((await requestPasswordRecovery(email.trim())).message); }
			catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível enviar o link.'); }
			finally { setLoading(false); }
			return;
		}
		if (token) {
			if (!newPassword || newPassword !== confirmation) return setError('As senhas não coincidem.');
			setLoading(true); setError('');
			try { setMessage((await resetPassword(token, newPassword, confirmation)).message); }
			catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a senha.'); }
			finally { setLoading(false); }
			return;
		}
		if (!email.trim() || !password) return setError('Informe seu e-mail e sua senha.');
		setLoading(true); setError('');
		try { saveSession(await login(email.trim(), password)); router.replace('/dashboard' as never); }
		catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível entrar.'); }
		finally { setLoading(false); }
	}

	return <View className="flex-1 items-center justify-center bg-[#dceeff] px-6">
		<View className="w-full max-w-[450px] rounded-[28px] bg-white p-8">
			<Text className="mb-1 text-3xl font-bold text-slate-900">{token ? 'Crie uma nova senha' : 'Acesse sua conta'}</Text>
			<Text className="mb-7 text-slate-500">{token ? 'Defina uma nova senha para continuar.' : 'Bem-vindo de volta.'}</Text>
			{token ? <>
				<TextInput className="mb-5 h-12 rounded-xl border border-slate-200 bg-slate-50 px-4" placeholder="Digite sua nova senha" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
				<TextInput className="mb-4 h-12 rounded-xl border border-slate-200 bg-slate-50 px-4" placeholder="Digite a senha novamente" secureTextEntry value={confirmation} onChangeText={setConfirmation} />
			</> : <>
			<Text className="mb-2 font-bold text-slate-900">E-mail</Text>
			<TextInput className="mb-5 h-12 rounded-xl border border-slate-200 bg-slate-50 px-4" placeholder={recovery ? 'Digite seu e-mail' : 'seuemail@exemplo.com'} autoCapitalize="none" value={email} onChangeText={setEmail} />
			<Text className="mb-2 font-bold text-slate-900">Senha</Text>
			{!recovery ? <><TextInput className="mb-4 h-12 rounded-xl border border-slate-200 bg-slate-50 px-4" placeholder="••••••••" secureTextEntry value={password} onChangeText={setPassword} onSubmitEditing={submit} />
			<Pressable className="mb-4" onPress={() => { setRecovery(true); setEmail(''); setError(''); }}><Text className="font-bold text-blue-700">Esqueci minha senha</Text></Pressable></> : null}
			</>}
			{error ? <Text className="mb-4 text-red-600">{error}</Text> : null}
			{message ? <Text className="mb-4 text-emerald-600">{message}</Text> : null}
			<Pressable className="h-12 items-center justify-center rounded-full bg-blue-600" disabled={loading} onPress={submit}><Text className="font-bold text-white">{loading ? 'AGUARDE...' : token ? 'ATUALIZAR SENHA' : recovery ? 'ENVIAR LINK' : 'ENTRAR'}</Text></Pressable>
		</View>
	</View>;
}
