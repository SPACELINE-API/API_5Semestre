import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Mail, Pencil, UserX } from 'lucide-react-native';
import { maskPhone } from '../../clients/utils/mask';
import type { InternalUser } from '../types/internalUser';
import {
	canResendLink,
	canSendInitialLink,
	displayName,
	initials,
} from '../utils/departments';
import { AccountBadge, LinkBadge } from './StatusBadges';

type PersonRowProps = {
	person: InternalUser;
	isSelf: boolean;
	isBusy: boolean;
	onEdit: (person: InternalUser) => void;
	onSendLink: (person: InternalUser) => void;
	onDeactivate: (person: InternalUser) => void;
};

export function PersonRow({
	person,
	isSelf,
	isBusy,
	onEdit,
	onSendLink,
	onDeactivate,
}: PersonRowProps) {
	const showSend = canSendInitialLink(person);
	const showResend = canResendLink(person);
	const linkLabel = showSend ? 'Enviar link' : 'Reenviar link';

	return (
		<View className="flex-col gap-3 border-t border-gray-100 px-4 py-4 md:flex-row md:items-center md:gap-4">
			<View className="min-w-0 flex-1 flex-row items-center gap-3">
				<View className="h-10 w-10 items-center justify-center rounded-full bg-blue-50">
					<Text className="font-inter font-bold text-blue-700 text-sm">
						{initials(person)}
					</Text>
				</View>
				<View className="min-w-0 flex-1 gap-0.5">
					<View className="flex-row flex-wrap items-center gap-2">
						<Text
							className="font-inter font-semibold text-gray-900 text-sm"
							numberOfLines={1}
						>
							{displayName(person)}
						</Text>
						{isSelf && (
							<View className="rounded-full bg-blue-50 px-2 py-0.5">
								<Text className="font-inter font-medium text-blue-700 text-[11px]">
									Você
								</Text>
							</View>
						)}
					</View>
					<Text className="font-inter text-gray-500 text-xs" numberOfLines={1}>
						{person.email}
						{person.phone ? ` · ${maskPhone(person.phone)}` : ''}
					</Text>
					<View className="mt-1.5 flex-row flex-wrap gap-1.5">
						{person.roles.map((role) => (
							<View
								key={role.id}
								className="rounded-full bg-gray-100 px-2 py-0.5"
							>
								<Text className="font-inter text-gray-700 text-[11px]">
									{role.name}
								</Text>
							</View>
						))}
					</View>
				</View>
			</View>

			<View className="flex-row flex-wrap items-center gap-2 md:justify-end">
				<AccountBadge active={person.is_active} />
				{person.latest_link && <LinkBadge status={person.latest_link.status} />}
			</View>

			<View className="flex-row flex-wrap items-center gap-2 md:justify-end">
				{(showSend || showResend) && (
					<TouchableOpacity
						onPress={() => onSendLink(person)}
						disabled={isBusy}
						accessibilityRole="button"
						accessibilityLabel={`${linkLabel} para ${displayName(person)}`}
						className={`flex-row items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 ${
							isBusy ? 'opacity-50' : ''
						}`}
					>
						{isBusy ? (
							<ActivityIndicator size="small" color="#1D4ED8" />
						) : (
							<Mail size={14} color="#1D4ED8" />
						)}
						<Text className="font-inter font-medium text-blue-700 text-xs">
							{linkLabel}
						</Text>
					</TouchableOpacity>
				)}
				<TouchableOpacity
					onPress={() => onEdit(person)}
					disabled={isBusy}
					accessibilityRole="button"
					accessibilityLabel={`Editar ${displayName(person)}`}
					className="flex-row items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2"
				>
					<Pencil size={14} color="#374151" />
					<Text className="font-inter font-medium text-gray-800 text-xs">
						Editar
					</Text>
				</TouchableOpacity>
				{person.is_active && !isSelf && (
					<TouchableOpacity
						onPress={() => onDeactivate(person)}
						disabled={isBusy}
						accessibilityRole="button"
						accessibilityLabel={`Desativar ${displayName(person)}`}
						className="flex-row items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2"
					>
						<UserX size={14} color="#B91C1C" />
						<Text className="font-inter font-medium text-red-700 text-xs">
							Desativar
						</Text>
					</TouchableOpacity>
				)}
			</View>
		</View>
	);
}
