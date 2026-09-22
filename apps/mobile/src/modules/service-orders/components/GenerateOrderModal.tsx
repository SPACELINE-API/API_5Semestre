import { useMemo, useState } from 'react';
import {
	Modal,
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ScrollView,
	Platform,
} from 'react-native';
import { X, Search, Check, User, FileText } from 'lucide-react-native';
import type { ReactNode } from 'react';
import type { Company } from '../../clients/types/company';
import type { Contact, GenerateServiceOrderInput } from '../types/serviceOrder';
import { FormField } from '../../clients/components/FormField';
import { DateField } from '../../../shared/components/DateField';
import { ToastMessage, type ToastData } from '../../../shared/components/Toast';

type GenerateOrderModalProps = {
	visible: boolean;
	companies: Company[];
	contacts: Contact[];
	onClose: () => void;
	onSubmit: (data: GenerateServiceOrderInput) => Promise<void>;
	toast?: ToastData | null;
};

type FormState = {
	quote_id: string;
	company_id: string;
	project_name: string;
	deadline: string;
	domain_area: string;
	price_category: string;
	internal_notes: string;
	external_notes: string;
};

const EMPTY_FORM: FormState = {
	quote_id: '',
	company_id: '',
	project_name: '',
	deadline: '',
	domain_area: '',
	price_category: '',
	internal_notes: '',
	external_notes: '',
};

const MOCK_APPROVED_QUOTES = [
	{
		id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
		label: 'Orçamento #1024 - Contrato societário (PT-BR > EN-US)',
	},
	{
		id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
		label: 'Orçamento #1031 - Certidão de nascimento (ES > PT-BR)',
	},
	{
		id: 'e4eaaaf2-d142-11e1-b3e4-080027620cdd',
		label: 'Orçamento #1042 - Termo de confidencialidade (EN-US > PT-BR)',
	},
];

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
			className={`flex-row items-center justify-between gap-2.5 border-b border-gray-50 px-3.5 py-3 last:border-b-0 ${
				selected ? 'bg-blue-50' : 'hover:bg-gray-50'
			}`}
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
	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [error, setError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<{
		company?: string;
		quote?: string;
		project_name?: string;
	}>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [companySearch, setCompanySearch] = useState('');
	const [isCompanyPickerOpen, setIsCompanyPickerOpen] = useState(false);
	const [isQuotePickerOpen, setIsQuotePickerOpen] = useState(false);

	const mockQuotesByCompanyId = useMemo(() => {
		const map = new Map<string, typeof MOCK_APPROVED_QUOTES>();
		companies.forEach((company, index) => {
			const quote = MOCK_APPROVED_QUOTES[index % MOCK_APPROVED_QUOTES.length];
			map.set(company.id, [quote]);
		});
		return map;
	}, [companies]);

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

	const availableQuotes = form.company_id
		? (mockQuotesByCompanyId.get(form.company_id) ?? [])
		: [];

	const selectedQuote = useMemo(
		() => availableQuotes.find((quote) => quote.id === form.quote_id) ?? null,
		[availableQuotes, form.quote_id],
	);

	function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
		setForm((current) => ({ ...current, [key]: value }));
	}

	function handleClose() {
		setForm(EMPTY_FORM);
		setError(null);
		setFieldErrors({});
		setCompanySearch('');
		setIsCompanyPickerOpen(false);
		setIsQuotePickerOpen(false);
		onClose();
	}

	function handleSelectCompany(companyId: string) {
		setForm((current) => ({ ...current, company_id: companyId, quote_id: '' }));
		setFieldErrors((current) => ({ ...current, company: undefined }));
		setCompanySearch('');
		setIsCompanyPickerOpen(false);
		setIsQuotePickerOpen(true);
	}

	function handleChangeCompany() {
		setForm((current) => ({ ...current, company_id: '', quote_id: '' }));
		setIsCompanyPickerOpen(true);
	}

	function handleSelectQuote(quoteId: string) {
		setField('quote_id', quoteId);
		setFieldErrors((current) => ({ ...current, quote: undefined }));
		setIsQuotePickerOpen(false);
	}

	function handleChangeQuote() {
		setField('quote_id', '');
		setIsQuotePickerOpen(true);
	}

	async function handleSubmit() {
		setError(null);

		const nextFieldErrors: typeof fieldErrors = {};
		if (!form.company_id) {
			nextFieldErrors.company = 'Selecione a empresa.';
		}
		if (!form.quote_id) {
			nextFieldErrors.quote = 'Selecione o orçamento aprovado.';
		}
		if (!form.project_name.trim()) {
			nextFieldErrors.project_name = 'Informe o nome do projeto.';
		}

		setFieldErrors(nextFieldErrors);

		if (Object.keys(nextFieldErrors).length > 0) {
			setError('Preencha os campos obrigatórios destacados abaixo.');
			return;
		}

		setIsSubmitting(true);

		try {
			await onSubmit({
				quote_id: form.quote_id.trim(),
				company_id: form.company_id,
				project_name: form.project_name.trim(),
				deadline: form.deadline.trim()
					? new Date(form.deadline).toISOString()
					: null,
				domain_area: form.domain_area.trim() || null,
				price_category: form.price_category.trim() || null,
				internal_notes: form.internal_notes.trim() || null,
				external_notes: form.external_notes.trim() || null,
			});
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
								Crie manualmente uma ordem a partir de um orçamento aprovado
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

					<ScrollView
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
											placeholder="Buscar empresa por nome"
											placeholderTextColor="#9CA3AF"
											className="flex-1 font-inter text-sm text-gray-900 outline-none"
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

						{Boolean(form.company_id) && (
							<View className="gap-2">
								<SectionLabel step={2} label="Selecione o orçamento aprovado" />

								{selectedQuote && !isQuotePickerOpen ? (
									<TouchableOpacity
										onPress={handleChangeQuote}
										activeOpacity={0.7}
										className="flex-row items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5"
									>
										<View className="min-w-0 flex-1 flex-row items-center gap-2.5">
											<FileText size={16} color="#2563EB" />
											<Text
												className="flex-1 font-inter font-medium text-gray-800 text-sm"
												numberOfLines={1}
											>
												{selectedQuote.label}
											</Text>
										</View>
										<Text className="shrink-0 font-inter font-semibold text-blue-600 text-xs">
											Trocar
										</Text>
									</TouchableOpacity>
								) : (
									<>
										<TouchableOpacity
											onPress={() => setIsQuotePickerOpen(true)}
											activeOpacity={0.7}
											className={`flex-row items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2.5 ${
												fieldErrors.quote ? 'border-red-900' : 'border-gray-200'
											}`}
										>
											<Search size={16} color="#9CA3AF" />
											<Text className="flex-1 font-inter text-sm text-gray-400">
												Selecionar orçamento
											</Text>
										</TouchableOpacity>

										{fieldErrors.quote && (
											<Text className="font-inter text-red-900 text-xs">
												{fieldErrors.quote}
											</Text>
										)}

										{isQuotePickerOpen && (
											<DropdownPanel>
												{availableQuotes.map((quote) => {
													const isSelected = form.quote_id === quote.id;

													return (
														<DropdownRow
															key={quote.id}
															selected={isSelected}
															onPress={() => handleSelectQuote(quote.id)}
															accessibilityLabel={`Selecionar orçamento ${quote.label}`}
														>
															<View className="flex-1 flex-row items-center gap-2.5">
																<FileText
																	size={16}
																	color={isSelected ? '#2563EB' : '#9CA3AF'}
																/>
																<Text className="flex-1 font-inter font-medium text-gray-800 text-sm">
																	{quote.label}
																</Text>
															</View>
														</DropdownRow>
													);
												})}
											</DropdownPanel>
										)}
									</>
								)}
							</View>
						)}

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
								onChangeText={(value) => setField('deadline', value)}
							/>

							<View className="flex-row flex-wrap gap-3">
								<FormField
									label="Área de domínio (opcional)"
									value={form.domain_area}
									onChangeText={(value) => setField('domain_area', value)}
									placeholder="Ex: Jurídico, Financeira"
								/>
								<FormField
									label="Categoria de preço (opcional)"
									value={form.price_category}
									onChangeText={(value) => setField('price_category', value)}
									placeholder="Ex: Preços de Tradução Juramentada"
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
					</ScrollView>

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
