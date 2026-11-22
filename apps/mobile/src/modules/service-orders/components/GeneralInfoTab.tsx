import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Settings, X } from 'lucide-react-native';
import type {
	ServiceOrder,
	UpdateServiceOrderInput,
} from '../types/serviceOrder';
import { StatusBadge } from './StatusBadge';
import { InfoField } from './InfoField';
import { FormField } from '../../clients/components/FormField';
import { DateField } from '../../../shared/components/DateField';
import {
	formatDate,
	formatDateInputValue,
	formatDeadline,
} from '../utils/format';
import { usePermission } from '../../auth/hooks/usePermission';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
function getTodayInputValue() {
	const today = new Date();
	const month = String(today.getMonth() + 1).padStart(2, '0');
	const day = String(today.getDate()).padStart(2, '0');
	return `${today.getFullYear()}-${month}-${day}`;
}

type GeneralInfoTabProps = {
	serviceOrder: ServiceOrder;
	onSave: (data: UpdateServiceOrderInput) => Promise<void>;
};

export function GeneralInfoTab({ serviceOrder, onSave }: GeneralInfoTabProps) {
	const themeColors = useThemeColors();
	const [isEditing, setIsEditing] = useState(false);
	const canWriteServiceOrders = usePermission('service_orders.write');
	const [projectName, setProjectName] = useState(serviceOrder.project_name);
	const [deadline, setDeadline] = useState(
		formatDateInputValue(serviceOrder.deadline),
	);
	const [deadlineError, setDeadlineError] = useState('');
	const [deadlineCalendarOpen, setDeadlineCalendarOpen] = useState(false);
	const [domainArea, setDomainArea] = useState(serviceOrder.domain_area ?? '');
	const [priceCategory, setPriceCategory] = useState(
		serviceOrder.price_category ?? '',
	);
	const [internalNotes, setInternalNotes] = useState(
		serviceOrder.internal_notes ?? '',
	);
	const [externalNotes, setExternalNotes] = useState(
		serviceOrder.external_notes ?? '',
	);
	const [isSaving, setIsSaving] = useState(false);

	function resetForm() {
		setProjectName(serviceOrder.project_name);
		setDeadline(formatDateInputValue(serviceOrder.deadline));
		setDeadlineError('');
		setDomainArea(serviceOrder.domain_area ?? '');
		setPriceCategory(serviceOrder.price_category ?? '');
		setInternalNotes(serviceOrder.internal_notes ?? '');
		setExternalNotes(serviceOrder.external_notes ?? '');
	}

	function handleCancel() {
		resetForm();
		setIsEditing(false);
	}

	async function handleSave() {
		if (deadline && deadline < getTodayInputValue()) {
			setDeadlineError('O prazo não pode ser anterior à data de hoje.');
			return;
		}
		setDeadlineError('');
		setIsSaving(true);

		try {
			await onSave({
				project_name: projectName.trim(),
				deadline: deadline ? new Date(deadline).toISOString() : null,
				domain_area: domainArea.trim() || null,
				price_category: priceCategory.trim() || null,
				internal_notes: internalNotes.trim() || null,
				external_notes: externalNotes.trim() || null,
			});
			setIsEditing(false);
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<View className="gap-8">
			<View className="flex-row items-start justify-between">
				<Text className="font-inter font-semibold text-foreground text-sm">
					Dados do projeto
				</Text>

				{!isEditing && (
					<TouchableOpacity
						onPress={() => setIsEditing(true)}
						disabled={!canWriteServiceOrders}
						activeOpacity={0.7}
						accessibilityRole="button"
						accessibilityLabel="Editar dados gerais"
						className={`h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-surface-subtle ${!canWriteServiceOrders ? 'opacity-40' : ''}`}
					>
						<Settings size={16} color={themeColors.foregroundMuted} />
					</TouchableOpacity>
				)}
			</View>

			{!isEditing ? (
				<>
					<View className="flex-row flex-wrap gap-x-10 gap-y-6">
						<InfoField
							label="Nome do projeto"
							value={serviceOrder.project_name}
						/>

						<View className="min-w-[180px] flex-1 gap-1">
							<Text className="font-inter text-foreground-subtle text-xs">
								Status
							</Text>
							<StatusBadge status={serviceOrder.status} />
						</View>

						<InfoField
							label="Orçamento de origem"
							value={serviceOrder.quote_id}
						/>
						<InfoField
							label="Prazo"
							value={formatDeadline(serviceOrder.deadline)}
						/>
						<InfoField
							label="Itens"
							value={String(serviceOrder.items.length)}
						/>
					</View>

					<View className="border-t border-border-subtle pt-7">
						<Text className="mb-4 font-inter font-semibold text-foreground text-sm">
							Propriedades
						</Text>

						<View className="flex-row flex-wrap gap-x-10 gap-y-6">
							<InfoField
								label="Área de domínio"
								value={serviceOrder.domain_area}
							/>
							<InfoField
								label="Categoria de preço"
								value={serviceOrder.price_category}
							/>
						</View>
					</View>

					<View className="border-t border-border-subtle pt-7 gap-4">
						<Text className="font-inter font-semibold text-foreground text-sm">
							Notas
						</Text>

						<View className="flex-row flex-wrap gap-x-10 gap-y-6">
							<InfoField
								label="Notas externas"
								value={serviceOrder.external_notes}
							/>
							<InfoField
								label="Notas internas"
								value={serviceOrder.internal_notes}
							/>
						</View>
					</View>
				</>
			) : (
				<>
					<View
						className="gap-4"
						style={deadlineCalendarOpen ? { zIndex: 50 } : undefined}
					>
						<View className="flex-row flex-wrap gap-x-10 gap-y-4">
							<FormField
								label="Nome do projeto"
								value={projectName}
								onChangeText={setProjectName}
								placeholder="Nome do projeto"
							/>

							<View className="min-w-[180px] gap-1">
								<Text className="font-inter text-foreground-subtle text-xs">
									Status
								</Text>
								<StatusBadge status={serviceOrder.status} />
							</View>

							<InfoField
								label="Orçamento de origem"
								value={serviceOrder.quote_id}
							/>
						</View>

						<View
							className="flex-row flex-wrap gap-x-10 gap-y-4"
							style={deadlineCalendarOpen ? { zIndex: 50 } : undefined}
						>
							<View
								className="min-w-[180px] flex-1 gap-1"
								style={deadlineCalendarOpen ? { zIndex: 51 } : undefined}
							>
								<DateField
									label="Prazo"
									value={deadline}
									minDate={getTodayInputValue()}
									onOpenChange={setDeadlineCalendarOpen}
									onChangeText={(value) => {
										setDeadline(value);
										setDeadlineError('');
									}}
								/>
								{deadlineError ? (
									<Text className="font-inter text-danger text-xs">
										{deadlineError}
									</Text>
								) : null}
							</View>
							<InfoField
								label="Itens"
								value={String(serviceOrder.items.length)}
							/>
						</View>
					</View>

					<View className="border-t border-border-subtle pt-7">
						<Text className="mb-4 font-inter font-semibold text-foreground text-sm">
							Propriedades
						</Text>

						<View className="flex-row flex-wrap gap-x-10 gap-y-4">
							<FormField
								label="Área de domínio"
								value={domainArea}
								onChangeText={setDomainArea}
								placeholder="Ex: Jurídico, Financeira"
							/>
							<FormField
								label="Categoria de preço"
								value={priceCategory}
								onChangeText={setPriceCategory}
								placeholder="Ex: Preços de Tradução Juramentada"
							/>
						</View>
					</View>

					<View className="border-t border-border-subtle pt-7 gap-3">
						<Text className="font-inter font-semibold text-foreground text-sm">
							Notas
						</Text>

						<View className="gap-1.5">
							<Text className="font-inter font-semibold text-foreground text-xs">
								Notas externas
							</Text>
							<TextInput
								value={externalNotes}
								onChangeText={setExternalNotes}
								placeholder="Visível para o cliente"
								placeholderTextColor={themeColors.foregroundMuted}
								multiline
								numberOfLines={3}
								className="rounded-lg border border-border-strong px-3 py-2.5 font-inter text-sm text-foreground outline-none min-h-[80px]"
							/>
						</View>

						<View className="gap-1.5">
							<Text className="font-inter font-semibold text-foreground text-xs">
								Notas internas
							</Text>
							<TextInput
								value={internalNotes}
								onChangeText={setInternalNotes}
								placeholder="Visível apenas para a equipe"
								placeholderTextColor={themeColors.foregroundMuted}
								multiline
								numberOfLines={3}
								className="rounded-lg border border-border-strong px-3 py-2.5 font-inter text-sm text-foreground outline-none min-h-[80px]"
							/>
						</View>
					</View>

					<View className="flex-row gap-3">
						<TouchableOpacity
							onPress={handleCancel}
							disabled={isSaving}
							activeOpacity={0.7}
							accessibilityRole="button"
							accessibilityLabel="Cancelar edição dos dados gerais"
							className="flex-row items-center gap-1.5 self-start rounded-lg border border-border px-5 py-2.5"
						>
							<X size={14} color={themeColors.foregroundSecondary} />
							<Text className="font-inter font-medium text-foreground-secondary text-sm">
								Cancelar
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={handleSave}
							disabled={isSaving}
							activeOpacity={0.85}
							accessibilityRole="button"
							accessibilityLabel="Salvar dados gerais"
							className={`self-start rounded-lg bg-primary px-5 py-2.5 ${isSaving ? 'opacity-60' : ''}`}
						>
							<Text className="font-inter font-semibold text-primary-foreground text-sm">
								{isSaving ? 'Salvando…' : 'Salvar'}
							</Text>
						</TouchableOpacity>
					</View>
				</>
			)}

			<View className="border-t border-border-subtle pt-7">
				<Text className="mb-4 font-inter font-semibold text-foreground text-sm">
					Registro
				</Text>

				<View className="flex-row flex-wrap gap-x-10 gap-y-6">
					<InfoField
						label="Criada em"
						value={formatDate(serviceOrder.created_at)}
					/>
					<InfoField
						label="Última atualização"
						value={formatDate(serviceOrder.updated_at)}
					/>
				</View>
			</View>
		</View>
	);
}
