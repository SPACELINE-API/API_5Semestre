import { useMemo, useState } from 'react';
import {
	Modal,
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ScrollView,
	Platform,
	useWindowDimensions,
} from 'react-native';
import { X, Search, Check, User, Upload, FileText } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useRef } from 'react';
import type { Company } from '../../clients/types/company';
import type { Contact, ManualServiceOrderInput } from '../types/serviceOrder';
import { FormField } from '../../clients/components/FormField';
import { LanguageSelect } from '../../quotes/components/LanguageSelect';
import { DateField } from '../../../shared/components/DateField';
import { ToastMessage, type ToastData } from '../../../shared/components/Toast';
import {
	decimalStringToBRL,
	maskCurrencyDigits,
} from '../../../shared/utils/currency';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { pickDocument } from '../../../shared/utils/pickDocument';
import type { UploadableFile } from '../../../shared/types/file';

function getTodayInputValue() {
	const today = new Date();
	const month = String(today.getMonth() + 1).padStart(2, '0');
	const day = String(today.getDate()).padStart(2, '0');
	return `${today.getFullYear()}-${month}-${day}`;
}

type GenerateOrderModalProps = {
	visible: boolean;
	companies: Company[];
	contacts: Contact[];
	onClose: () => void;
	onSubmit: (
		data: ManualServiceOrderInput,
		files: (UploadableFile | null)[],
	) => Promise<void>;
	toast?: ToastData | null;
};

type FormState = {
	company_id: string;
	project_name: string;
	deadline: string;
	domain_area: string;
	internal_notes: string;
	external_notes: string;
};

type ManualItemState = {
	id: string;
	source_language: string;
	target_language: string;
	document_type: string;
	word_count: string;
	price: string;
	deadline: string;
	file: UploadableFile | null;
};

const EMPTY_FORM: FormState = {
	company_id: '',
	project_name: '',
	deadline: '',
	domain_area: '',
	internal_notes: '',
	external_notes: '',
};

function SectionLabel({ step, label }: { step: number; label: string }) {
	return (
		<View className="flex-row items-center gap-2">
			<View className="h-5 w-5 items-center justify-center rounded-full bg-gray-900">
				<Text className="font-inter font-bold text-white text-[10px]">
					{step}
				</Text>
			</View>
			<Text className="font-inter font-semibold text-gray-800 text-sm">
				{label}
			</Text>
		</View>
	);
}

function createManualItem(): ManualItemState {
	return {
		id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
		source_language: '',
		target_language: '',
		document_type: '',
		word_count: '',
		price: '',
		deadline: '',
		file: null,
	};
}

function DropdownPanel({ children }: { children: ReactNode }) {
	if (Platform.OS !== 'web') {
		return (
			<View className="rounded-xl border border-gray-100 bg-white shadow-lg overflow-hidden">
				<View>{children}</View>
			</View>
		);
	}

	return (
		<View className="rounded-xl border border-gray-100 bg-white shadow-lg max-h-[220px] overflow-hidden">
			<ScrollView showsVerticalScrollIndicator={false}>
				<View>{children}</View>
			</ScrollView>
		</View>
	);
}

function DropdownRow({
	selected,
	onPress,
	accessibilityLabel,
	children,
}: {
	selected: boolean;
	onPress: () => void;
	accessibilityLabel: string;
	children: ReactNode;
}) {
	return (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.7}
			accessibilityRole="radio"
			accessibilityState={{ checked: selected }}
			accessibilityLabel={accessibilityLabel}
			className={`flex-row items-center justify-between gap-2.5 border-b border-gray-50 px-3.5 py-3 last:border-b-0 ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
		>
			{children}
			{selected && (
				<View className="h-5 w-5 items-center justify-center rounded-full bg-blue-500">
					<Check size={12} color="#FFFFFF" strokeWidth={3} />
				</View>
			)}
		</TouchableOpacity>
	);
}

export function GenerateOrderModal({
	visible,
	companies,
	contacts,
	onClose,
	onSubmit,
	toast,
}: GenerateOrderModalProps) {
	const { width } = useWindowDimensions();
	const KeyboardContainer = (
		Platform.OS === 'web' ? ScrollView : KeyboardAwareScrollView
	) as typeof ScrollView;
	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [manualItems, setManualItems] = useState<ManualItemState[]>([
		createManualItem(),
	]);
	const [error, setError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<{
		company?: string;
		project_name?: string;
		deadline?: string;
		items?: string;
	}>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [companySearch, setCompanySearch] = useState('');
	const [isCompanyPickerOpen, setIsCompanyPickerOpen] = useState(false);
	const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

	const filteredCompanies = useMemo(() => {
		const query = companySearch.trim().toLowerCase();
		if (!query) return companies;
		return companies.filter(
			(company) =>
				company.trade_name.toLowerCase().includes(query) ||
				company.legal_name.toLowerCase().includes(query),
		);
	}, [companies, companySearch]);

	const primaryContact = useMemo(() => {
		if (!form.company_id) return null;
		return (
			contacts.find((contact) => contact.company_id === form.company_id) ?? null
		);
	}, [contacts, form.company_id]);

	const selectedCompany = useMemo(
		() => companies.find((company) => company.id === form.company_id) ?? null,
		[companies, form.company_id],
	);

	function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
		setForm((current) => ({ ...current, [key]: value }));
	}

	function handleClose() {
		setForm(EMPTY_FORM);
		setManualItems([createManualItem()]);
		setError(null);
		setFieldErrors({});
		setCompanySearch('');
		setIsCompanyPickerOpen(false);
		onClose();
	}

	function updateManualItem(id: string, changes: Partial<ManualItemState>) {
		setManualItems((current) =>
			current.map((item) => (item.id === id ? { ...item, ...changes } : item)),
		);
	}

	function handleSelectCompany(companyId: string) {
		setForm((current) => ({ ...current, company_id: companyId }));
		setFieldErrors((current) => ({ ...current, company: undefined }));
		setCompanySearch('');
		setIsCompanyPickerOpen(false);
	}

	function handleChangeCompany() {
		setForm((current) => ({ ...current, company_id: '' }));
		setIsCompanyPickerOpen(true);
	}

	async function handleSubmit() {
		setError(null);

		const nextFieldErrors: typeof fieldErrors = {};
		if (!form.company_id) {
			nextFieldErrors.company = 'Selecione a empresa.';
		}
		if (!form.project_name.trim()) {
			nextFieldErrors.project_name = 'Informe o nome do projeto.';
		}
		if (form.deadline && form.deadline < getTodayInputValue()) {
			nextFieldErrors.deadline =
				'O prazo não pode ser anterior à data de hoje.';
		}
		if (
			manualItems.some((item) => !item.source_language || !item.target_language)
		) {
			nextFieldErrors.items = 'Informe os idiomas de todos os itens.';
		}
		if (
			manualItems.some(
				(item) => item.deadline && item.deadline < getTodayInputValue(),
			)
		) {
			nextFieldErrors.items =
				'O prazo dos itens não pode ser anterior à data de hoje.';
		}

		setFieldErrors(nextFieldErrors);

		if (Object.keys(nextFieldErrors).length > 0) {
			setError('Preencha os campos obrigatórios destacados abaixo.');
			return;
		}

		setIsSubmitting(true);

		try {
			const payload: ManualServiceOrderInput = {
				company_id: form.company_id,
				project_name: form.project_name.trim(),
				deadline: form.deadline.trim()
					? new Date(form.deadline).toISOString()
					: null,
				domain_area: form.domain_area.trim() || null,
				internal_notes: form.internal_notes.trim() || null,
				external_notes: form.external_notes.trim() || null,
				total_price: manualItems.reduce(
					(total, item) => total + (item.price ? Number(item.price) : 0),
					0,
				),
				items: manualItems.map((item) => ({
					source_language: item.source_language,
					target_language: item.target_language,
					document_type: item.document_type.trim() || null,
					word_count: item.word_count ? Number(item.word_count) : null,
					price: item.price ? Number(item.price) : null,
					deadline: item.deadline
						? new Date(item.deadline).toISOString()
						: null,
				})),
			};
			await onSubmit(
				payload,
				manualItems.map((item) => item.file),
			);
			handleClose();
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: 'Não foi possível gerar a ordem de serviço.',
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<Modal
			visible={visible}
			transparent
			animationType="none"
			onRequestClose={handleClose}
		>
			<View className="flex-1 items-center justify-center bg-black/40 px-4">
				<View className="w-full max-w-[560px] max-h-[88%] rounded-2xl bg-white overflow-hidden shadow-2xl">
					<View className="flex-row items-center justify-between gap-3 border-b border-gray-100 px-6 py-5">
						<View className="flex-1">
							<Text className="font-inter font-bold text-gray-900 text-lg">
								Gerar ordem de serviço
							</Text>
							<Text className="mt-0.5 font-inter text-gray-400 text-xs">
								Crie uma ordem de serviço manual
							</Text>
						</View>
						<TouchableOpacity
							onPress={handleClose}
							activeOpacity={0.7}
							className="h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-gray-100"
						>
							<X size={18} color="#6B7280" />
						</TouchableOpacity>
					</View>

					<KeyboardContainer
						className="px-6 py-5"
						contentContainerClassName="gap-5 pb-6"
						keyboardShouldPersistTaps="handled"
					>
						<View className="gap-2">
							<SectionLabel step={1} label="Selecione a empresa" />

							{selectedCompany && !isCompanyPickerOpen ? (
								<TouchableOpacity
									onPress={handleChangeCompany}
									activeOpacity={0.7}
									className="flex-row items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5"
								>
									<View className="min-w-0 flex-1 flex-row items-center gap-2.5">
										<View className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
											<Text className="font-inter font-bold text-blue-700 text-xs">
												{selectedCompany.trade_name.slice(0, 2).toUpperCase()}
											</Text>
										</View>
										<Text
											className="flex-1 font-inter font-medium text-gray-800 text-sm"
											numberOfLines={1}
										>
											{selectedCompany.trade_name}
										</Text>
									</View>
									<Text className="shrink-0 font-inter font-semibold text-blue-600 text-xs">
										Trocar
									</Text>
								</TouchableOpacity>
							) : (
								<>
									<View
										className={`flex-row items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2.5 ${
											fieldErrors.company ? 'border-red-900' : 'border-gray-200'
										}`}
									>
										<Search size={16} color="#9CA3AF" />
										<TextInput
											value={companySearch}
											onChangeText={setCompanySearch}
											onFocus={() => setIsCompanyPickerOpen(true)}
											placeholder={
												width < 768
													? 'Buscar empresa'
													: 'Buscar empresa por nome'
											}
											placeholderTextColor="#9CA3AF"
											className="flex-1 font-inter text-sm text-gray-900 outline-none max-md:min-w-0 max-md:shrink max-md:leading-5"
											accessibilityLabel="Buscar empresa"
										/>
									</View>

									{fieldErrors.company && (
										<Text className="font-inter text-red-900 text-xs">
											{fieldErrors.company}
										</Text>
									)}

									{isCompanyPickerOpen && (
										<DropdownPanel>
											{filteredCompanies.map((company) => {
												const isSelected = form.company_id === company.id;

												return (
													<DropdownRow
														key={company.id}
														selected={isSelected}
														onPress={() => handleSelectCompany(company.id)}
														accessibilityLabel={`Selecionar empresa ${company.trade_name}`}
													>
														<View className="flex-row items-center gap-2.5">
															<View className="h-8 w-8 items-center justify-center rounded-full bg-blue-100">
																<Text className="font-inter font-bold text-blue-700 text-xs">
																	{company.trade_name.slice(0, 2).toUpperCase()}
																</Text>
															</View>
															<Text className="font-inter font-medium text-gray-800 text-sm">
																{company.trade_name}
															</Text>
														</View>
													</DropdownRow>
												);
											})}

											{filteredCompanies.length === 0 && (
												<Text className="px-3.5 py-3 font-inter text-gray-400 text-sm">
													Nenhuma empresa encontrada.
												</Text>
											)}
										</DropdownPanel>
									)}
								</>
							)}
						</View>

						{Boolean(form.company_id) && primaryContact && (
							<View className="flex-row items-center gap-3 rounded-lg bg-gray-50 px-3.5 py-3">
								<View className="h-9 w-9 items-center justify-center rounded-full bg-white">
									<User size={16} color="#6B7280" />
								</View>
								<View className="flex-1">
									<Text className="font-inter font-semibold text-gray-800 text-xs">
										Contato principal
									</Text>
									<Text className="mt-0.5 font-inter text-gray-500 text-xs">
										{primaryContact.name} · {primaryContact.department}
									</Text>
								</View>
							</View>
						)}

						{Boolean(form.company_id) && !primaryContact && (
							<View className="flex-row items-center gap-3 rounded-lg bg-gray-50 px-3.5 py-3">
								<View className="h-9 w-9 items-center justify-center rounded-full bg-white">
									<User size={16} color="#9CA3AF" />
								</View>
								<Text className="flex-1 font-inter text-gray-400 text-xs">
									Nenhum contato cadastrado para esta empresa.
								</Text>
							</View>
						)}

						<View className="gap-3">
							<SectionLabel step={2} label="Itens da ordem" />
							{manualItems.map((item, index) => (
								<View
									key={item.id}
									className="gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4"
								>
									<View className="flex-row items-center justify-between">
										<Text className="font-inter font-semibold text-gray-800 text-sm">
											Item {index + 1}
										</Text>
										{manualItems.length > 1 && (
											<TouchableOpacity
												onPress={() =>
													setManualItems((current) =>
														current.filter(
															(candidate) => candidate.id !== item.id,
														),
													)
												}
											>
												<Text className="font-inter font-semibold text-red-600 text-xs">
													Remover
												</Text>
											</TouchableOpacity>
										)}
									</View>
									<View className="flex-col gap-3 md:flex-row">
										<View className="min-w-0 md:flex-1">
											<Text className="mb-1 font-inter font-semibold text-gray-800 text-xs">
												Idioma de origem
											</Text>
											<LanguageSelect
												value={item.source_language}
												onChange={(value) =>
													updateManualItem(item.id, {
														source_language: value,
													})
												}
												placeholder="Selecione um idioma"
											/>
										</View>
										<View className="min-w-0 md:flex-1">
											<Text className="mb-1 font-inter font-semibold text-gray-800 text-xs">
												Idioma de destino
											</Text>
											<LanguageSelect
												value={item.target_language}
												onChange={(value) =>
													updateManualItem(item.id, {
														target_language: value,
													})
												}
												placeholder="Selecione um idioma"
											/>
										</View>
									</View>
									<View className="gap-1.5">
										<Text className="font-inter font-semibold text-gray-800 text-xs">
											Arquivo (opcional)
										</Text>
										<TouchableOpacity
											onPress={async () => {
												if (Platform.OS === 'web') {
													fileInputRefs.current[item.id]?.click();
													return;
												}
												const picked = await pickDocument();
												if (picked) updateManualItem(item.id, { file: picked });
											}}
											className="flex-row items-center gap-2 rounded-lg border border-gray-300 px-3 py-2.5"
										>
											{item.file ? (
												<FileText size={16} color="#1C6FB0" />
											) : (
												<Upload size={16} color="#353535" />
											)}
											<Text
												className="flex-1 font-inter text-gray-700 text-sm"
												numberOfLines={1}
											>
												{item.file ? item.file.name : 'Selecionar arquivo'}
											</Text>
										</TouchableOpacity>
										{Platform.OS === 'web' && (
											<input
												ref={(element) => {
													fileInputRefs.current[item.id] = element;
												}}
												type="file"
												style={{ display: 'none' }}
												onChange={(event: {
													target: { files: FileList | null };
												}) =>
													updateManualItem(item.id, {
														file: event.target.files?.[0] ?? null,
													})
												}
											/>
										)}
									</View>
									<View className="flex-col gap-3 md:flex-row">
										<FormField
											label="Tipo de documento"
											value={item.document_type}
											onChangeText={(value) =>
												updateManualItem(item.id, { document_type: value })
											}
											placeholder="Ex: Contrato"
										/>
										<FormField
											label="Quantidade de palavras"
											value={item.word_count}
											onChangeText={(value) =>
												updateManualItem(item.id, {
													word_count: value.replace(/\D/g, ''),
												})
											}
											placeholder="Ex: 1000"
										/>
									</View>
									<View className="flex-col gap-3 md:flex-row">
										<FormField
											label="Preço"
											value={item.price ? decimalStringToBRL(item.price) : ''}
											onChangeText={(value) =>
												updateManualItem(item.id, {
													price: maskCurrencyDigits(value),
												})
											}
											placeholder="R$ 0,00"
										/>
										<DateField
											label="Prazo do item"
											value={item.deadline}
											minDate={getTodayInputValue()}
											onChangeText={(value) =>
												updateManualItem(item.id, { deadline: value })
											}
										/>
									</View>
								</View>
							))}
							{fieldErrors.items && (
								<Text className="font-inter text-red-900 text-xs">
									{fieldErrors.items}
								</Text>
							)}
							<TouchableOpacity
								onPress={() =>
									setManualItems((current) => [...current, createManualItem()])
								}
								className="self-start rounded-lg border border-dashed border-gray-300 px-4 py-2.5"
							>
								<Text className="font-inter font-semibold text-gray-700 text-sm">
									Adicionar item
								</Text>
							</TouchableOpacity>
						</View>

						<View className="gap-3">
							<SectionLabel step={3} label="Detalhes do projeto" />

							<FormField
								label="Nome do projeto"
								value={form.project_name}
								onChangeText={(value) => {
									setField('project_name', value);
									setFieldErrors((current) => ({
										...current,
										project_name: undefined,
									}));
								}}
								placeholder="Ex: Tradução de contratos comerciais"
								error={fieldErrors.project_name}
							/>

							<DateField
								label="Prazo (opcional)"
								value={form.deadline}
								minDate={getTodayInputValue()}
								onChangeText={(value) => setField('deadline', value)}
							/>

							<View className="min-w-0 md:w-1/2 md:pr-1.5">
								<FormField
									label="Área de domínio (opcional)"
									value={form.domain_area}
									onChangeText={(value) => setField('domain_area', value)}
									placeholder="Ex: Jurídico, Financeira"
								/>
							</View>

							<View className="gap-1.5">
								<Text className="font-inter font-semibold text-gray-800 text-xs">
									Notas externas (opcional)
								</Text>
								<TextInput
									value={form.external_notes}
									onChangeText={(value) => setField('external_notes', value)}
									placeholder="Visível para o cliente"
									placeholderTextColor="#8A8A8A"
									multiline
									numberOfLines={2}
									className="min-h-[64px] rounded-lg border border-gray-300 px-3 py-2.5 font-inter text-sm text-gray-900 outline-none"
								/>
							</View>

							<View className="gap-1.5">
								<Text className="font-inter font-semibold text-gray-800 text-xs">
									Notas internas (opcional)
								</Text>
								<TextInput
									value={form.internal_notes}
									onChangeText={(value) => setField('internal_notes', value)}
									placeholder="Visível apenas para a equipe"
									placeholderTextColor="#8A8A8A"
									multiline
									numberOfLines={2}
									className="min-h-[64px] rounded-lg border border-gray-300 px-3 py-2.5 font-inter text-sm text-gray-900 outline-none"
								/>
							</View>
						</View>

						{error && (
							<View className="rounded-lg bg-red-50 px-3.5 py-2.5">
								<Text className="font-inter text-red-900 text-sm">{error}</Text>
							</View>
						)}
					</KeyboardContainer>

					<View className="flex-row items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
						<TouchableOpacity
							onPress={handleClose}
							activeOpacity={0.7}
							className="rounded-lg border border-gray-200 px-5 py-2.5 hover:bg-gray-50"
						>
							<Text className="font-inter font-medium text-gray-700 text-sm">
								Cancelar
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={handleSubmit}
							disabled={isSubmitting}
							activeOpacity={0.85}
							className={`rounded-lg bg-blue-600 px-5 py-2.5 ${isSubmitting ? 'opacity-60' : ''}`}
						>
							<Text className="font-inter font-semibold text-white text-sm">
								{isSubmitting ? 'Gerando…' : 'Gerar ordem'}
							</Text>
						</TouchableOpacity>
					</View>
				</View>

				{toast && (
					<View pointerEvents="none" className="absolute bottom-6 left-6">
						<ToastMessage toast={toast} />
					</View>
				)}
			</View>
		</Modal>
	);
}
