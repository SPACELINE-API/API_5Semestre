import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { ChevronDown, ChevronRight, Clock, Mail } from 'lucide-react-native';
import { describeExpiry } from '../../internal-users/utils/inviteExpiry';
import type { Translator } from '../types/translator';
import { pendingAccounts } from '../utils/translatorAccount';

type PendingAccountsCardProps = {
	translators: Translator[];
	busyId: string | null;
	canResend: boolean;
	onResend: (translator: Translator) => void;
};

// CONTAS DE TRADUTORES QUE AINDA AGUARDAM A DEFINICAO DE SENHA (MESMO PADRAO DAS PESSOAS INTERNAS)
export function PendingAccountsCard({
	translators,
	busyId,
	canResend,
	onResend,
}: PendingAccountsCardProps) {
	const [now, setNow] = useState(() => Date.now());
	const [expanded, setExpanded] = useState(true);

	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 60_000);
		return () => clearInterval(timer);
	}, []);

	const pending = pendingAccounts(translators);
	if (pending.length === 0) return null;

	const Chevron = expanded ? ChevronDown : ChevronRight;
	const expiredCount = pending.filter(
		(translator) =>
			describeExpiry(
				translator.account!.latest_link!.sent_at,
				translator.account!.latest_link!.expires_at,
				now,
			).expired,
	).length;

	return (
		<View className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50">
			<TouchableOpacity
				onPress={() => setExpanded((current) => !current)}
				accessibilityRole="button"
				accessibilityState={{ expanded }}
				accessibilityLabel="Contas de tradutores pendentes"
				className="flex-row items-center gap-3 px-4 py-3.5"
			>
				<View className="h-9 w-9 items-center justify-center rounded-full bg-amber-100">
					<Clock size={18} color="#B45309" />
				</View>
				<View className="min-w-0 flex-1">
					<Text className="font-inter font-semibold text-amber-900 text-sm">
						{pending.length === 1
							? '1 tradutor aguardando a definição de senha'
							: `${pending.length} tradutores aguardando a definição de senha`}
					</Text>
					<Text className="font-inter text-amber-800 text-xs">
						{expiredCount > 0
							? `${expiredCount} ${expiredCount === 1 ? 'link expirou' : 'links expiraram'}. Reenvie o link para o tradutor conseguir entrar.`
							: 'O link vale por 3 dias. Depois disso é preciso reenviar.'}
					</Text>
				</View>
				<Chevron size={18} color="#B45309" />
			</TouchableOpacity>

			{expanded &&
				pending.map((translator) => {
					const link = translator.account!.latest_link!;
					// LINK SUBSTITUIDO POR TROCA DE E-MAIL: NAO HA LINK VALIDO ATE O REENVIO
					const info =
						link.status === 'rejeitado'
							? {
									expired: true,
									urgent: true,
									label: 'Link anterior invalidado',
									progress: 1,
								}
							: describeExpiry(link.sent_at, link.expires_at, now);
					const busy = busyId === translator.id;
					const disabled = busy || !canResend;
					return (
						<View
							key={translator.id}
							className="flex-col gap-3 border-t border-amber-200 bg-white px-4 py-3 md:flex-row md:items-center md:gap-4"
						>
							<View className="min-w-0 md:flex-1">
								<Text
									className="font-inter font-semibold text-gray-900 text-sm"
									numberOfLines={1}
								>
									{translator.name}
								</Text>
								<Text
									className="font-inter text-gray-500 text-xs"
									numberOfLines={1}
								>
									{translator.email}
								</Text>
							</View>

							<View className="gap-1.5 md:w-[240px]">
								<Text
									className={`font-inter font-medium text-xs ${
										info.expired
											? 'text-red-700'
											: info.urgent
												? 'text-amber-700'
												: 'text-gray-700'
									}`}
								>
									{info.label}
								</Text>
								<View className="h-1.5 overflow-hidden rounded-full bg-gray-100">
									<View
										className={`h-full rounded-full ${
											info.expired
												? 'bg-red-500'
												: info.urgent
													? 'bg-amber-500'
													: 'bg-blue-500'
										}`}
										style={{ width: `${Math.round(info.progress * 100)}%` }}
									/>
								</View>
							</View>

							<TouchableOpacity
								onPress={() => onResend(translator)}
								disabled={disabled}
								accessibilityRole="button"
								accessibilityLabel={`Reenviar link para ${translator.name}`}
								accessibilityState={{ disabled, busy }}
								className={`flex-row items-center justify-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 ${
									disabled ? 'opacity-50' : ''
								}`}
							>
								{busy ? (
									<ActivityIndicator size="small" color="#1D4ED8" />
								) : (
									<Mail size={14} color="#1D4ED8" />
								)}
								<Text className="font-inter font-medium text-blue-700 text-xs">
									Reenviar link
								</Text>
							</TouchableOpacity>
						</View>
					);
				})}
		</View>
	);
}
