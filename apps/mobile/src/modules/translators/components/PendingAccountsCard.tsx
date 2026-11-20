import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { ChevronDown, ChevronRight, Clock, Mail } from 'lucide-react-native';
import { describeExpiry } from '../../internal-users/utils/inviteExpiry';
import type { Translator } from '../types/translator';
import { pendingAccounts } from '../utils/translatorAccount';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
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
	const themeColors = useThemeColors();
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
		<View className="overflow-hidden rounded-xl border border-warning/40 bg-warning-soft">
			<TouchableOpacity
				onPress={() => setExpanded((current) => !current)}
				accessibilityRole="button"
				accessibilityState={{ expanded }}
				accessibilityLabel="Contas de tradutores pendentes"
				className="flex-row items-center gap-3 px-4 py-3.5"
			>
				<View className="h-9 w-9 items-center justify-center rounded-full bg-warning-soft">
					<Clock size={18} color={themeColors.warningText} />
				</View>
				<View className="min-w-0 flex-1">
					<Text className="font-inter font-semibold text-warning-text text-sm">
						{pending.length === 1
							? '1 tradutor aguardando a definição de senha'
							: `${pending.length} tradutores aguardando a definição de senha`}
					</Text>
					<Text className="font-inter text-warning-text text-xs">
						{expiredCount > 0
							? `${expiredCount} ${expiredCount === 1 ? 'link expirou' : 'links expiraram'}. Reenvie o link para o tradutor conseguir entrar.`
							: 'O link vale por 3 dias. Depois disso é preciso reenviar.'}
					</Text>
				</View>
				<Chevron size={18} color={themeColors.warningText} />
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
							className="flex-col gap-3 border-t border-warning/40 bg-surface px-4 py-3 md:flex-row md:items-center md:gap-4"
						>
							<View className="min-w-0 md:flex-1">
								<Text
									className="font-inter font-semibold text-foreground text-sm"
									numberOfLines={1}
								>
									{translator.name}
								</Text>
								<Text
									className="font-inter text-foreground-muted text-xs"
									numberOfLines={1}
								>
									{translator.email}
								</Text>
							</View>

							<View className="gap-1.5 md:w-[240px]">
								<Text
									className={`font-inter font-medium text-xs ${
										info.expired
											? 'text-danger'
											: info.urgent
												? 'text-warning-text'
												: 'text-foreground-secondary'
									}`}
								>
									{info.label}
								</Text>
								<View className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
									<View
										className={`h-full rounded-full ${
											info.expired
												? 'bg-danger'
												: info.urgent
													? 'bg-warning'
													: 'bg-primary'
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
								className={`flex-row items-center justify-center gap-1.5 rounded-lg border border-primary/30 px-3 py-2 ${
									disabled ? 'opacity-50' : ''
								}`}
							>
								{busy ? (
									<ActivityIndicator
										size="small"
										color={themeColors.primaryText}
									/>
								) : (
									<Mail size={14} color={themeColors.primaryText} />
								)}
								<Text className="font-inter font-medium text-primary-text text-xs">
									Reenviar link
								</Text>
							</TouchableOpacity>
						</View>
					);
				})}
		</View>
	);
}
