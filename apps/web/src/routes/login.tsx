import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { FormEvent, useState } from 'react';
import { login, saveSession } from '../modules/auth/services/auth';
import '../modules/auth/components/LoginPage.css';

export const Route = createFileRoute('/login')({ component: LoginPage });

function LoginPage() {
	const navigate = useNavigate();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [remember, setRemember] = useState(false);
	const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
	const [loading, setLoading] = useState(false);

	async function handleSubmit(event: FormEvent) {
		event.preventDefault();
		const nextErrors = { email: !email.trim() ? 'Informe seu e-mail.' : undefined, password: !password ? 'Informe sua senha.' : undefined };
		if (nextErrors.email || nextErrors.password) return setErrors(nextErrors);
		setErrors({}); setLoading(true);
		try { const session = await login(email, password); saveSession(session, remember); await navigate({ to: '/' }); }
		catch (error) { setErrors({ form: error instanceof Error ? error.message : 'Não foi possível entrar.' }); }
		finally { setLoading(false); }
	}

	return <main className="login-page"><section className="login-panel">
		<div className="brand"><div className="brand-mark" aria-hidden="true">A</div><span>Aliança Traduções</span></div>
		<h1>Acesse sua conta</h1><p className="intro">Entre para acompanhar orçamentos, solicitações e<br className="desktop-break" /> documentos de tradução em um só lugar.</p>
		<form className="login-card" onSubmit={handleSubmit} noValidate>
			<label htmlFor="email">E-mail</label><input id="email" type="email" autoComplete="email" placeholder="seuemail@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} />{errors.email && <span className="field-error">{errors.email}</span>}
			<label htmlFor="password">Senha</label><input id="password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} />{errors.password && <span className="field-error">{errors.password}</span>}
			<div className="login-options"><label className="remember"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> <span>Lembrar-me</span></label><a href="/forgot-password">Esqueci minha senha</a></div>
			{errors.form && <div role="alert" className="form-error">{errors.form}</div>}<button type="submit" disabled={loading}>{loading ? 'ENTRANDO...' : 'ENTRAR'}</button>
		</form><p className="register">Ainda não tem acesso? <a href="/register">Solicite seu cadastro</a></p>
	</section><div className="login-art" aria-hidden="true"><div className="bubble bubble-top" /><div className="bubble bubble-bottom" /></div></main>;
}
