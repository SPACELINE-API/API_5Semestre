import * as DocumentPicker from 'expo-document-picker';
import { DocumentPickerAsset } from 'expo-document-picker';

import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { FileUp, Trash } from 'lucide-react-native';

import { createRequest } from '../services/requests';

export default function FormsRequest() {
	const [customerName, setCustomerName] = useState('');
	const [email, setEmail] = useState('');
	const [enterprise, setEnterprise] = useState('');
	const [customerNeed, setCustomerNeed] = useState('');
	const [originalLanguage, setOriginalLanguage] = useState('');
	const [translationLanguage, setTranslationLanguage] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [document, setDocument] = useState<DocumentPickerAsset | null>(null);

	const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

	async function handleSubmit() {
		setError('');
		setSuccess('');

		const fields = [
			customerName,
			email,
			enterprise,
			customerNeed,
			originalLanguage,
			translationLanguage,
		];

		if (fields.some((field) => !field.trim())) {
			setError('Preencha todos os campos obrigatórios.');
			return;
		}

		setSubmitting(true);
		const result = await createRequest({
			customer_name: customerName,
			email,
			enterprise,
			customer_need: customerNeed,
			original_language: originalLanguage,
			translation_language: translationLanguage,
			document: document
				? { uri: document.uri, name: document.name, file: document.file }
				: null,
		});
		setSubmitting(false);

		if (result.success) {
			setSuccess('Solicitação enviada com sucesso!');
			setCustomerName('');
			setEmail('');
			setEnterprise('');
			setCustomerNeed('');
			setOriginalLanguage('');
			setTranslationLanguage('');
			setDocument(null);
		} else if (result.status === 400) {
			setError(
				'Você precisa aguardar no mínimo uma semana para enviar outra solicitação.',
			);
		} else {
			setError('Não foi possível enviar a solicitação. Tente novamente.');
		}
	}

	async function uploadFile() {
		try {
			const result = await DocumentPicker.getDocumentAsync({
				type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
			});

			if (result.canceled) {
				return
			};

			const file = result.assets[0];

			if (!file.size || file.size > MAX_FILE_SIZE_BYTES) {
				setError('Tamanho de arquivo não aceito.');
				return;
			}

			setError('');
			setDocument(file);
		}
		catch {
			setError("Não foi possível fazer o upload. Tente novamente.");
		}
	}

	return (
		<View className="w-full rounded-[28px] border border-white/80 bg-white/90 px-6 py-7 shadow-2xl shadow-[#173a68]/15 sm:px-9 sm:py-8">
			<View className="mb-6">
				<Text className="text-[22px] font-extrabold tracking-[-0.6px] text-[#101b35]">
					Solicitação de serviço
				</Text>
				<Text className="mt-1 text-sm text-[#506481]">
					Conte para a gente o que você precisa traduzir
				</Text>
			</View>

			<View className="gap-3">
				<Text className="text-sm font-bold text-blue-500 mt-4">
					DADOS PESSOAIS
				</Text>

				<View className="flex flex-row flex-wrap gap-4">
					<View className="min-w-[200px] flex-1 gap-1">
						<Text className="mb-1 text-sm font-bold text-[#101b35]">
							Nome
							<Text className="text-red-500">
								*
							</Text>
						</Text>
						<TextInput
							value={customerName}
							onChangeText={setCustomerName}
							placeholder="Digite seu nome"
							placeholderTextColor="#94a3b8"
							className="h-11 rounded-xl border border-[#c7dced] bg-[#f7fbff] px-4 text-sm text-[#12233c]"
						/>
					</View>

					<View className="min-w-[200px] flex-1 gap-1">
						<Text className="mb-1 text-sm font-bold text-[#101b35]">
							Email
							<Text className="text-red-500">
								*
							</Text>
						</Text>
						<TextInput
							value={email}
							onChangeText={setEmail}
							placeholder="seuemail@exemplo.com"
							placeholderTextColor="#94a3b8"
							keyboardType="email-address"
							autoCapitalize="none"
							className="h-11 rounded-xl border border-[#c7dced] bg-[#f7fbff] px-4 text-sm text-[#12233c]"
						/>
					</View>

					<View className="min-w-[200px] flex-1 gap-1">
						<Text className="mb-1 text-sm font-bold text-[#101b35]">
							Empresa
							<Text className="text-red-500">
								*
							</Text>
						</Text>
						<TextInput
							value={enterprise}
							onChangeText={setEnterprise}
							placeholder="Nome da empresa"
							placeholderTextColor="#94a3b8"
							className="h-11 rounded-xl border border-[#c7dced] bg-[#f7fbff] px-4 text-sm text-[#12233c]"
						/>
					</View>
				</View>
			</View>

			<View className="mt-6 gap-3">
				<Text className="text-sm font-bold text-blue-500 mt-4">SERVIÇO</Text>

				<View className="flex flex-row flex-wrap gap-4">
					<View className="min-w-[200px] flex-1 gap-1">
						<Text className="mb-1 text-sm font-bold text-[#101b35]">
							Tipo de documento
							<Text className="text-red-500">
								*
							</Text>
						</Text>
						<TextInput
							value={customerNeed}
							onChangeText={setCustomerNeed}
							placeholder="Ex: Diploma, contrato social"
							placeholderTextColor="#94a3b8"
							className="h-11 rounded-xl border border-[#c7dced] bg-[#f7fbff] px-4 text-sm text-[#12233c]"
						/>
					</View>

					<View className="min-w-[200px] flex-1 gap-1">
						<Text className="mb-1 text-sm font-bold text-[#101b35]">
							Idioma original
							<Text className="text-red-500">
								*
							</Text>
						</Text>
						<TextInput
							value={originalLanguage}
							onChangeText={setOriginalLanguage}
							placeholder="Ex: Português"
							placeholderTextColor="#94a3b8"
							className="h-11 rounded-xl border border-[#c7dced] bg-[#f7fbff] px-4 text-sm text-[#12233c]"
						/>
					</View>

					<View className="min-w-[200px] flex-1 gap-1">
						<Text className="mb-1 text-sm font-bold text-[#101b35]">
							Idioma de tradução
							<Text className="text-red-500">
								*
							</Text>
						</Text>
						<TextInput
							value={translationLanguage}
							onChangeText={setTranslationLanguage}
							placeholder="Ex: Inglês"
							placeholderTextColor="#94a3b8"
							className="h-11 rounded-xl border border-[#c7dced] bg-[#f7fbff] px-4 text-sm text-[#12233c]"
						/>
					</View>
				</View>
			</View>

			<View className="mt-6 gap-3">
				<Text className="text-sm font-bold text-blue-500 mt-4">DOCUMENTO (PDF/DOCX)</Text>

				<View className="min-w-[200px] flex-1 gap-1">
					<TouchableOpacity className="flex flex-column items-center justify-center gap-5 h-40 rounded-xl border border-dashed border-[#c7dced] bg-[#f7fbff] px-4 text-sm text-[#12233c]"
						onPress={uploadFile}
					>
						<FileUp color={'#c5d0df'} size={'60px'} />
						<Text className="mb-1 text-sm text-[#94a3b8]">
							Faça o upload do documento a ser traduzido
						</Text>
					</TouchableOpacity>

					{document ? (
						<View className='flex flex-row justify-between bg-white border border-[#c7dced] rounded-xl p-4 mt-6 cursor-pointer'>
							<Text>
								{document.name}
							</Text>
							<TouchableOpacity onPress={() => setDocument(null)} >
								<Trash color={'red'} />
							</TouchableOpacity>
						</View>
					) : (
						<></>
					)}
				</View>

			</View>

			{error ? (
				<Text className="mb-2 mt-4 text-sm text-red-600">{error}</Text>
			) : null}

			<TouchableOpacity
				onPress={handleSubmit}
				disabled={submitting}
				className="mt-8 h-12 items-center justify-center rounded-full bg-[#2d83cd] px-8 shadow-md shadow-blue-600/30 self-end"
			>
				<Text className="text-sm font-bold text-white">
					{submitting ? 'ENVIANDO...' : 'ENVIAR SOLICITAÇÃO'}
				</Text>
			</TouchableOpacity>

			{success ? (
				<Text className="mt-5 text-center text-sm font-semibold text-emerald-600">
					{success}
				</Text>
			) : null}
		</View>
	);
}
