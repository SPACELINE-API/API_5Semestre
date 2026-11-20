import type { Translator } from '../types/translator';

// A CONTA AGUARDA A SENHA ENQUANTO NAO FOI ATIVADA PELO PROPRIO TRADUTOR
export function isAwaitingPassword(translator: Translator) {
	const account = translator.account;
	return Boolean(
		account && account.status === 'inativa' && !account.password_defined,
	);
}

// O REENVIO VALE ANTES OU DEPOIS DE O LINK EXPIRAR, ENQUANTO A CONTA NAO FOI ATIVADA
export function canResendPasswordLink(translator: Translator) {
	return (
		isAwaitingPassword(translator) && Boolean(translator.account?.latest_link)
	);
}

export function pendingAccounts(translators: Translator[]) {
	return translators
		.filter(canResendPasswordLink)
		.sort(
			(a, b) =>
				new Date(a.account!.latest_link!.expires_at).getTime() -
				new Date(b.account!.latest_link!.expires_at).getTime(),
		);
}
