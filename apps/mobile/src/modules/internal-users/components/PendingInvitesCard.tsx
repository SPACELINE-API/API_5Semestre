import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { ChevronDown, ChevronRight, Clock, Mail } from 'lucide-react-native';
import type { InternalUser } from '../types/internalUser';
import { displayName } from '../utils/departments';
import { describeExpiry, pendingInvites } from '../utils/inviteExpiry';

type PendingInvitesCardProps = {
	people: InternalUser[];
	busyId: string | null;
	onResend: (person: InternalUser) => void;
};

export function PendingInvitesCard({
	people,
	busyId,
	onResend,
}: PendingInvitesCardProps) {
	const [now, setNow] = useState(() => Date.now());
	const [expanded, setExpanded] = useState(true);

	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 60_000);
		return () => clearInterval(timer);
	}, []);

	const invites = pendingInvites(people);
	if (invites.length === 0) return null;

	const Chevron = expanded ? ChevronDown : ChevronRight;
	const expiredCount = invites.filter(
		(person) =>
			describeExpiry(
				person.latest_link!.sent_at,
				person.latest_link!.expires_at,
				now,
			).expired,
	).length;

	return (
		<View className="mb-5 overflow-hidden rounded-xl border border-warning/40 bg-warning-soft">
			<TouchableOpacity
				onPress={() => setExpanded((current) => !current)}
				accessibilityRole="button"
				accessibilityState={{ expanded }}
				accessibilityLabel="Convites pendentes"
				className="flex-row items-center gap-3 px-4 py-3.5"
			>
				<View className="h-9 w-9 items-center justify-center rounded-full bg-warning-soft">
					<Clock size={18} color="#B45309" />
				</View>
				<View className="min-w-0 flex-1">
					<Text className="font-inter font-semibold text-warning-text text-sm">
						{invites.length === 1
							? '1 convite aguardando a definição de senha'
							: `${invites.length} convites aguardando a definição de senha`}
					</Text>
					<Text className="font-inter text-warning-text text-xs">
						{expiredCount > 0
							? `${expiredCount} ${expiredCount === 1 ? 'expirou' : 'expiraram'}. Reenvie o link para a pessoa conseguir entrar.`
							: 'O link vale por 3 dias. Depois disso é preciso reenviar.'}
					</Text>
				</View>
				<Chevron size={18} color="#B45309" />
			</TouchableOpacity>

			{expanded &&
				invites.map((person) => {
					const link = person.latest_link!;
					const info = describeExpiry(link.sent_at, link.expires_at, now);
					const busy = busyId === person.id;
					return (
						<View
							key={person.id}
							className="flex-col gap-3 border-t border-warning/40 bg-surface px-4 py-3 md:flex-row md:items-center md:gap-4"
						>
							<View className="min-w-0 md:flex-1">
								<Text
									className="font-inter font-semibold text-foreground text-sm"
									numberOfLines={1}
								>
									{displayName(person)}
								</Text>
								<Text
									className="font-inter text-foreground-muted text-xs"
									numberOfLines={1}
								>
									{person.email}
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
								onPress={() => onResend(person)}
								disabled={busy}
								accessibilityRole="button"
								accessibilityLabel={`Reenviar link para ${displayName(person)}`}
								className={`flex-row items-center justify-center gap-1.5 rounded-lg border border-primary/30 px-3 py-2 ${
									busy ? 'opacity-50' : ''
								}`}
							>
								{busy ? (
									<ActivityIndicator size="small" color="#1D4ED8" />
								) : (
									<Mail size={14} color="#1D4ED8" />
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
