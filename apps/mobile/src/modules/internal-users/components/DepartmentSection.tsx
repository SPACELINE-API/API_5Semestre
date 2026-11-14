import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import type { Department, InternalUser } from '../types/internalUser';
import { PersonRow } from './PersonRow';

type DepartmentSectionProps = {
	department: Department;
	currentUserEmail: string | null;
	busyId: string | null;
	onEdit: (person: InternalUser) => void;
	onSendLink: (person: InternalUser) => void;
	onDeactivate: (person: InternalUser) => void;
};

export function DepartmentSection({
	department,
	currentUserEmail,
	busyId,
	onEdit,
	onSendLink,
	onDeactivate,
}: DepartmentSectionProps) {
	const [expanded, setExpanded] = useState(true);
	const Chevron = expanded ? ChevronDown : ChevronRight;
	const activeCount = department.people.filter(
		(person) => person.is_active,
	).length;

	return (
		<View className="overflow-hidden rounded-xl border border-gray-200 bg-white">
			<TouchableOpacity
				onPress={() => setExpanded((current) => !current)}
				accessibilityRole="button"
				accessibilityState={{ expanded }}
				accessibilityLabel={`Departamento ${department.name}`}
				className="flex-row items-center justify-between gap-3 bg-gray-50 px-4 py-3"
			>
				<View className="min-w-0 flex-1 flex-row items-center gap-3">
					<Chevron size={18} color="#4B5563" />
					<Text
						className="font-inter font-bold text-gray-900 text-sm"
						numberOfLines={1}
					>
						{department.name}
					</Text>
				</View>
				<View className="flex-row items-center gap-2">
					<View className="rounded-full bg-white px-2.5 py-0.5">
						<Text className="font-inter font-semibold text-gray-700 text-xs">
							{department.people.length}{' '}
							{department.people.length === 1 ? 'pessoa' : 'pessoas'}
						</Text>
					</View>
					<View className="hidden rounded-full bg-green-50 px-2.5 py-0.5 sm:flex">
						<Text className="font-inter font-medium text-green-800 text-xs">
							{activeCount} {activeCount === 1 ? 'ativa' : 'ativas'}
						</Text>
					</View>
				</View>
			</TouchableOpacity>
			{expanded &&
				department.people.map((person) => (
					<PersonRow
						key={person.id}
						person={person}
						isSelf={person.email === currentUserEmail}
						isBusy={busyId === person.id}
						onEdit={onEdit}
						onSendLink={onSendLink}
						onDeactivate={onDeactivate}
					/>
				))}
		</View>
	);
}
