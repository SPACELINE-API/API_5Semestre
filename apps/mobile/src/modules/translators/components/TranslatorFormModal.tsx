import { useState, useEffect, type ChangeEvent } from 'react';
import {
	Modal,
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	TextInput,
	Platform,
} from 'react-native';
import { X, Plus, Trash2, AlertCircle, ArrowRight } from 'lucide-react-native';
import type { TranslatorCreateInput, LanguagePairFormRow } from '../types/translator';
import {
	PROFICIENCY_OPTIONS,
	AVAILABLE_LANGUAGES,
	getLanguageName,
} from '../types/translator';
import type { QualificationResponse, DictionaryLanguagePairResponse } from '../types/translator';
import { listQualifications, listLanguagePairs } from '../services/translatorService';
import { FormField } from '../../clients/components/FormField';
import { ToastMessage, type ToastData } from '../../../shared/components/Toast';

type Props = {
	visible: boolean;
	onClose: () => void;
	onSubmit: (data: TranslatorCreateInput) => Promise<void>;
	toast?: ToastData | null;
};

type FormErrors = {
	name?: string;
	email?: string;
	phone?: string;
	language_pairs?: string;
};

const EMPTY_ROW: LanguagePairFormRow = {
	language_pair_id: 'b1b2b3b4-0000-4000-8000-000000000001',
	source_language: 'pt-BR',
	target_language: 'en-US',
	proficiency_level: 'fluent',
};

const STEPS = [
	{ title: 'Dados' },
	{ title: 'Idiomas' },
	{ title: 'Qualificações' },
];

const PREDEFINED_QUALIFICATIONS = [
	{ id: 'c1c2c3c4-0000-4000-8000-000000000001', name: 'Tradução Jurídica', description: 'Contratos, peças processuais e documentos legais' },
	{ id: 'c1c2c3c4-0000-4000-8000-000000000002', name: 'Tradução Técnica', description: 'Manuais, documentação de engenharia e especificações técnicas' },
	{ id: 'c1c2c3c4-0000-4000-8000-000000000003', name: 'Tradução Médica', description: 'Bulas, prontuários, laudos e documentos clínicos' },
	{ id: 'c1c2c3c4-0000-4000-8000-000000000004', name: 'Tradução Literária', description: 'Livros, contos, poesia e textos de ficção' },
	{ id: 'c1c2c3c4-0000-4000-8000-000000000005', name: 'Tradução Financeira', description: 'Relatórios financeiros, balanços e documentos contábeis' },
	{ id: 'c1c2c3c4-0000-4000-8000-000000000006', name: 'Tradução Acadêmica', description: 'Artigos científicos, dissertações e publicações acadêmicas' },
];

function isValidEmail(email: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string) {
	return phone.replace(/\D/g, '').length >= 10;
}

function maskPhone(value: string) {
	const digits = value.replace(/\D/g, '').slice(0, 11);
	if (digits.length <= 2) return digits;
	if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
	if (digits.length <= 11)
		return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
	return value;
}

export function TranslatorFormModal({ visible, onClose, onSubmit, toast }: Props) {
	const [step, setStep] = useState(0);
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [phone, setPhone] = useState('');
	const [pairs, setPairs] = useState<LanguagePairFormRow[]>([{ ...EMPTY_ROW }]);
	const [selectedQualifications, setSelectedQualifications] = useState<string[]>([]);
	const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [langPicker, setLangPicker] = useState<{ index: number; field: 'source_language' | 'target_language' } | null>(null);

	const [apiQualifications, setApiQualifications] = useState<QualificationResponse[]>(PREDEFINED_QUALIFICATIONS);
	const [apiLanguagePairs, setApiLanguagePairs] = useState<DictionaryLanguagePairResponse[]>([]);

	useEffect(() => {
		if (visible) {
			listQualifications().then(setApiQualifications).catch(console.error);
			listLanguagePairs().then(setApiLanguagePairs).catch(console.error);
		}
	}, [visible]);

	function resolvePairId(source: string, target: string) {
		const found = apiLanguagePairs.find((p) => p.source_language === source && p.target_language === target);
		return found
	}

	const isLastStep = step === STEPS.length - 1;

	function handleClose() {
		setStep(0);
		setName('');
		setEmail('');
		setPhone('');
		setPairs([{ ...EMPTY_ROW }]);
		setSelectedQualifications([]);
		setFieldErrors({});
		setSubmitError(null);
		onClose();
	}

	function validateStep0(): FormErrors {
		const errors: FormErrors = {};
		if (!name.trim()) errors.name = 'Nome é obrigatório.';
		if (!email.trim()) errors.email = 'Email é obrigatório.';
		else if (!isValidEmail(email)) errors.email = 'Email inválido.';
		if (!phone.trim()) errors.phone = 'Telefone é obrigatório.';
		else if (!isValidPhone(phone)) errors.phone = 'Telefone inválido (mínimo 10 dígitos).';
		return errors;
	}

	function validateStep1(): FormErrors {
		const errors: FormErrors = {};
		const hasSame = pairs.some(
			(p) => p.source_language.trim() === p.target_language.trim(),
		);
		if (hasSame) {
			errors.language_pairs = 'O idioma de origem e de destino não podem ser iguais.';
			return errors;
		}
		return errors;
	}

	function handleNext() {
		let errors: FormErrors = {};
		if (step === 0) errors = validateStep0();
		if (step === 1) errors = validateStep1();
		if (Object.keys(errors).length > 0) {
			setFieldErrors(errors);
			return;
		}
		setFieldErrors({});
		setStep((s) => s + 1);
	}

	function handleBack() {
		setFieldErrors({});
		setStep((s) => s - 1);
	}

	function addPair() {
		const usedPairs = new Set(pairs.map((p) => `${p.source_language}->${p.target_language}`));
		// Tenta sugerir um par que ainda não foi adicionado
		const nextSource = 'pt-BR';
		let nextTarget = 'es-ES';
		if (usedPairs.has('pt-BR->es-ES')) nextTarget = 'fr-FR';
		if (usedPairs.has('pt-BR->fr-FR')) nextTarget = 'de-DE';

		setPairs((prev) => [
			...prev,
			{
				language_pair_id: resolveLanguagePairId(nextSource, nextTarget),
				source_language: nextSource,
				target_language: nextTarget,
				proficiency_level: 'intermediate',
			},
		]);
	}

	function removePair(index: number) {
		setPairs((prev) => prev.filter((_, i) => i !== index));
	}

	function updatePair(index: number, field: keyof LanguagePairFormRow, value: string) {
		setPairs((prev) =>
			prev.map((row, i) => {
				if (i !== index) return row;
				const updated = { ...row, [field]: value };
				updated.language_pair_id = resolvePairId(
					updated.source_language,
					updated.target_language,
				);
				return updated;
			}),
		);
		if (fieldErrors.language_pairs) {
			setFieldErrors((prev) => ({ ...prev, language_pairs: undefined }));
		}
	}

	function toggleQualification(id: string) {
		setSelectedQualifications((prev) =>
			prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id],
		);
	}

	async function handleSubmit() {
		const step0Errors = validateStep0();
		const step1Errors = validateStep1();
		const allErrors = { ...step0Errors, ...step1Errors };
		if (Object.keys(allErrors).length > 0) {
			setFieldErrors(allErrors);
			if (Object.keys(step0Errors).length > 0) setStep(0);
			else setStep(1);
			return;
		}

		setSubmitError(null);
		setIsSubmitting(true);

		try {
			await onSubmit({
				name: name.trim(),
				email: email.trim(),
				phone: phone.trim(),
				qualification_ids: selectedQualifications,
				language_pairs: pairs.map((p) => ({
					language_pair_id: p.language_pair_id,
					proficiency_level: p.proficiency_level,
				})),
			});
			handleClose();
		} catch (err) {
			setSubmitError(
				err instanceof Error
					? err.message
					: 'Não foi possível cadastrar o tradutor.',
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
			<View className="flex-1 justify-end bg-black/40">
				<View className="w-full max-h-[92%] overflow-hidden rounded-t-3xl bg-white shadow-2xl">
					{/* HEADER */}
					<View className="flex-row items-center justify-between border-b border-gray-100 px-6 py-5">
						<View>
							<Text className="font-poppins font-bold text-gray-900 text-lg">
								Novo Tradutor
							</Text>
							<Text className="font-inter text-gray-500 text-xs">
								Preencha as informações do profissional
							</Text>
						</View>
						<TouchableOpacity
							onPress={handleClose}
							className="rounded-lg p-1.5 hover:bg-gray-100"
							hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
						>
							<X size={20} color="#6B7280" />
						</TouchableOpacity>
					</View>

					{/* PROGRESS STEPS */}
					<View className="flex-row border-b border-gray-100 bg-gray-50/50 px-6 py-3">
						{STEPS.map((s, i) => (
							<View key={i} className="flex-1 flex-row items-center">
								<View
									className={`flex-row items-center gap-2 ${i === step
											? 'opacity-100'
											: i < step
												? 'opacity-80'
												: 'opacity-40'
										}`}
								>
									<View
										className={`h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${i === step
												? 'bg-blue-600 text-white'
												: i < step
													? 'bg-blue-100 text-blue-800'
													: 'bg-gray-200 text-gray-600'
											}`}
									>
										<Text
											className={`font-inter text-xs font-bold ${i === step ? 'text-white' : 'text-gray-700'
												}`}
										>
											{i + 1}
										</Text>
									</View>
									<Text
										className={`font-inter text-xs ${i === step
												? 'font-bold text-blue-900'
												: 'font-medium text-gray-600'
											}`}
									>
										{s.title}
									</Text>
								</View>
								{i < STEPS.length - 1 && (
									<View className="mx-2 h-0.5 flex-1 bg-gray-200" />
								)}
							</View>
						))}
					</View>

					{/* CORPO DO FORMULÁRIO */}
					<ScrollView className="max-h-[460px] px-6 py-5">
						{/* STEP 0 — DADOS PESSOAIS */}
						{step === 0 && (
							<View className="gap-4">
								<FormField
									label="Nome completo *"
									value={name}
									onChangeText={(v) => {
										setName(v);
										if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined }));
									}}
									placeholder="Ex: Carlos Eduardo de Oliveira"
									error={fieldErrors.name}
								/>

								<FormField
									label="E-mail profissional *"
									value={email}
									onChangeText={(v) => {
										setEmail(v);
										if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
									}}
									placeholder="carlos.oliveira@spaceline.com.br"
									autoCapitalize="none"
									error={fieldErrors.email}
								/>

								<FormField
									label="Telefone / WhatsApp *"
									value={phone}
									onChangeText={(v) => {
										setPhone(maskPhone(v));
										if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: undefined }));
									}}
									placeholder="(11) 98765-4321"
									error={fieldErrors.phone}
								/>
							</View>
						)}

						{/* STEP 1 — PARES DE IDIOMA */}
						{step === 1 && (
							<View className="gap-4">
								<View className="rounded-lg bg-blue-50/70 p-3">
									<Text className="font-inter text-blue-900 text-xs">
										Selecione os idiomas de trabalho e o nível de domínio do tradutor. Você pode adicionar vários pares.
									</Text>
								</View>

								{fieldErrors.language_pairs && (
									<View className="flex-row items-center gap-2 rounded-lg bg-red-50 p-3">
										<AlertCircle size={15} color="#DC2626" />
										<Text className="font-inter text-red-800 text-xs font-medium">
											{fieldErrors.language_pairs}
										</Text>
									</View>
								)}

								{pairs.map((pair, index) => (
									<View
										key={index}
										className="gap-3 rounded-xl border border-gray-200 bg-gray-50/40 p-4"
									>
										<View className="flex-row items-center justify-between border-b border-gray-100 pb-2">
											<Text className="font-inter font-bold text-gray-800 text-xs">
												Par de Tradução #{index + 1}
											</Text>
											{pairs.length > 1 && (
												<TouchableOpacity
													onPress={() => removePair(index)}
													className="flex-row items-center gap-1 rounded-md px-2 py-1 hover:bg-red-50"
													hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
												>
													<Trash2 size={14} color="#DC2626" />
													<Text className="font-inter text-xs text-red-600 font-medium">
														Remover
													</Text>
												</TouchableOpacity>
											)}
										</View>

										{/* SELECTORES DE IDIOMA */}
										<View className="flex-row gap-3">
											{/* IDIOMA ORIGEM */}
											<View className="flex-1 gap-1">
												<Text className="font-inter font-semibold text-gray-700 text-xs">
													Idioma de Origem
												</Text>
												{Platform.OS === 'web' ? (
													<select
														value={pair.source_language}
														onChange={(e: ChangeEvent<HTMLSelectElement>) =>
															updatePair(index, 'source_language', e.target.value)
														}
														style={{
															width: '100%',
															padding: '8px 12px',
															borderRadius: '8px',
															border: '1px solid #D1D5DB',
															backgroundColor: '#FFFFFF',
															fontSize: '13px',
															fontFamily: 'Inter, sans-serif',
															color: '#111827',
															outline: 'none',
															cursor: 'pointer',
														}}
													>
														{AVAILABLE_LANGUAGES.map((lang) => (
															<option key={lang.code} value={lang.code}>
																{lang.flag} {lang.label}
															</option>
														))}
													</select>
												) : (
													<TouchableOpacity
														activeOpacity={0.7}
														onPress={() => setLangPicker({ index, field: 'source_language' })}
														className="rounded-lg border border-gray-300 bg-white px-3 py-2"
													>
														<Text className="text-sm text-gray-900">{getLanguageName(pair.source_language) || 'Selecione...'}</Text>
													</TouchableOpacity>
												)}
											</View>

											{/* IDIOMA DESTINO */}
											<View className="flex-1 gap-1">
												<Text className="font-inter font-semibold text-gray-700 text-xs">
													Idioma de Destino
												</Text>
												{Platform.OS === 'web' ? (
													<select
														value={pair.target_language}
														onChange={(e: ChangeEvent<HTMLSelectElement>) =>
															updatePair(index, 'target_language', e.target.value)
														}
														style={{
															width: '100%',
															padding: '8px 12px',
															borderRadius: '8px',
															border: '1px solid #D1D5DB',
															backgroundColor: '#FFFFFF',
															fontSize: '13px',
															fontFamily: 'Inter, sans-serif',
															color: '#111827',
															outline: 'none',
															cursor: 'pointer',
														}}
													>
														{AVAILABLE_LANGUAGES.map((lang) => (
															<option key={lang.code} value={lang.code}>
																{lang.flag} {lang.label}
															</option>
														))}
													</select>
												) : (
													<TouchableOpacity
														activeOpacity={0.7}
														onPress={() => setLangPicker({ index, field: 'target_language' })}
														className="rounded-lg border border-gray-300 bg-white px-3 py-2"
													>
														<Text className="text-sm text-gray-900">{getLanguageName(pair.target_language) || 'Selecione...'}</Text>
													</TouchableOpacity>
												)}
											</View>
										</View>

										{/* NÍVEL DE PROFICIÊNCIA */}
										<View className="gap-1.5 pt-1">
											<Text className="font-inter font-semibold text-gray-700 text-xs">
												Nível de Proficiência
											</Text>
											<View className="flex-row flex-wrap gap-1.5">
												{PROFICIENCY_OPTIONS.map((opt) => {
													const isSelected = pair.proficiency_level === opt.value;
													return (
														<TouchableOpacity
															key={opt.value}
															onPress={() =>
																updatePair(index, 'proficiency_level', opt.value)
															}
															activeOpacity={0.7}
															className={`rounded-lg border px-2.5 py-1.5 ${isSelected
																	? 'border-blue-600 bg-blue-50'
																	: 'border-gray-200 bg-white hover:bg-gray-50'
																}`}
														>
															<Text
																className={`font-inter text-xs ${isSelected
																		? 'font-bold text-blue-900'
																		: 'text-gray-600'
																	}`}
															>
																{opt.label}
															</Text>
														</TouchableOpacity>
													);
												})}
											</View>
										</View>
									</View>
								))}

								<TouchableOpacity
									onPress={addPair}
									activeOpacity={0.7}
									className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-blue-400 bg-blue-50/40 py-3 hover:bg-blue-50"
								>
									<Plus size={16} color="#1D4ED8" />
									<Text className="font-inter font-semibold text-blue-700 text-sm">
										Adicionar outro par de idioma
									</Text>
								</TouchableOpacity>
							</View>
						)}

						{/* STEP 2 — QUALIFICAÇÕES */}
						{step === 2 && (
							<View className="gap-3">
								<Text className="font-inter text-gray-600 text-xs">
									Selecione as especialidades técnicas deste tradutor (opcional):
								</Text>

								{apiQualifications.map((qual) => {
									const isChecked = selectedQualifications.includes(qual.id);
									return (
										<TouchableOpacity
											key={qual.id}
											onPress={() => toggleQualification(qual.id)}
											activeOpacity={0.7}
											className={`flex-row items-start gap-3 rounded-xl border p-3.5 transition-all ${isChecked
													? 'border-blue-500 bg-blue-50/60'
													: 'border-gray-200 bg-white hover:bg-gray-50'
												}`}
										>
											<View
												className={`mt-0.5 h-4 w-4 rounded items-center justify-center border ${isChecked
														? 'border-blue-600 bg-blue-600'
														: 'border-gray-300 bg-white'
													}`}
											>
												{isChecked && <Text className="text-white text-[10px] font-bold">✓</Text>}
											</View>
											<View className="flex-1">
												<Text className="font-inter font-semibold text-gray-900 text-xs">
													{qual.name}
												</Text>
												<Text className="font-inter text-gray-500 text-[11px] mt-0.5">
													{qual.description}
												</Text>
											</View>
										</TouchableOpacity>
									);
								})}

								{submitError && (
									<View className="flex-row items-start gap-2 rounded-lg bg-red-50 p-3 mt-2">
										<AlertCircle size={16} color="#DC2626" />
										<Text className="flex-1 font-inter text-red-900 text-xs font-medium">
											{submitError}
										</Text>
									</View>
								)}
							</View>
						)}
					</ScrollView>

					{/* RODAPÉ DE AÇÕES */}
					<View className="flex-row items-center justify-between border-t border-gray-100 bg-gray-50/40 px-6 py-4">
						<TouchableOpacity
							onPress={step === 0 ? handleClose : handleBack}
							className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 hover:bg-gray-50"
						>
							<Text className="font-inter font-semibold text-gray-700 text-sm">
								{step === 0 ? 'Cancelar' : 'Voltar'}
							</Text>
						</TouchableOpacity>

						{isLastStep ? (
							<TouchableOpacity
								onPress={handleSubmit}
								disabled={isSubmitting}
								className={`rounded-lg bg-blue-600 px-6 py-2.5 hover:bg-blue-700 ${isSubmitting ? 'opacity-60' : ''
									}`}
							>
								<Text className="font-inter font-semibold text-white text-sm">
									{isSubmitting ? 'Cadastrando...' : 'Finalizar Cadastro'}
								</Text>
							</TouchableOpacity>
						) : (
							<TouchableOpacity
								onPress={handleNext}
								className="flex-row items-center gap-1.5 rounded-lg bg-blue-600 px-6 py-2.5 hover:bg-blue-700"
							>
								<Text className="font-inter font-semibold text-white text-sm">
									Avançar
								</Text>
								<ArrowRight size={15} color="#FFFFFF" />
							</TouchableOpacity>
						)}
					</View>
				</View>
			</View>

			{/* MOBILE LANGUAGE PICKER MODAL */}
			{langPicker && (
				<Modal visible transparent animationType="fade" onRequestClose={() => setLangPicker(null)}>
					<View className="flex-1 justify-end bg-black/50">
						<View className="bg-white rounded-t-3xl max-h-[80%] pb-8">
							<View className="flex-row items-center justify-between p-5 border-b border-gray-100">
								<Text className="font-poppins font-bold text-gray-900 text-lg">Selecione o Idioma</Text>
								<TouchableOpacity onPress={() => setLangPicker(null)} className="p-2 bg-gray-100 rounded-full">
									<X size={20} color="#374151" />
								</TouchableOpacity>
							</View>
							<ScrollView className="p-4">
								{AVAILABLE_LANGUAGES.map((lang) => (
									<TouchableOpacity
										key={lang.code}
										onPress={() => {
											updatePair(langPicker.index, langPicker.field, lang.code);
											setLangPicker(null);
										}}
										className="flex-row items-center py-4 border-b border-gray-50 px-2 active:bg-gray-50"
									>
										<Text className="text-xl mr-3">{lang.flag}</Text>
										<Text className="font-inter text-gray-800 text-base">{lang.label}</Text>
									</TouchableOpacity>
								))}
							</ScrollView>
						</View>
					</View>
				</Modal>
			)}

			{toast && (
				<View className="absolute bottom-6 left-6 right-6 items-center">
					<ToastMessage toast={toast} />
				</View>
			)}
		</Modal>
	);
}
