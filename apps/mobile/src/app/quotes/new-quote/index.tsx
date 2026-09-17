import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LanguageSelect } from '../../../modules/quotes/components/LanguageSelect';
import { Upload, CheckCircle2 } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { createQuote, createQuoteItem, uploadQuoteDocument } from '../../../shared/services/quotesService';

type QuoteItem = {
	id: string;
	source: string;
	target: string;
	docType: string;
	fileName?: string;
	fileUri?: string;
};

export default function NovoOrcamento() {
	const [items, setItems] = useState<QuoteItem[]>([
		{ id: Date.now().toString(), source: '', target: '', docType: '' }
	]);
	
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showSuccessToast, setShowSuccessToast] = useState(false);

	const handleAddItem = () => {
		setItems([...items, { id: Date.now().toString(), source: '', target: '', docType: '' }]);
	};

	const updateItem = (id: string, field: keyof QuoteItem, value: string) => {
		setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
	};

	const handlePickDocument = async (id: string) => {
		try {
			const result = await DocumentPicker.getDocumentAsync({
				type: '*/*',
				copyToCacheDirectory: true,
			});
			if (result.canceled === false && result.assets && result.assets.length > 0) {
				const asset = result.assets[0];
				setItems(items.map(item => item.id === id ? { ...item, fileName: asset.name, fileUri: asset.uri } : item));
			}
		} catch (error) {
			console.error("Error picking document:", error);
		}
	};

	const handleSaveQuote = async (status: string) => {
		setIsSubmitting(true);
		
		try {
			// 1. Create the quote
			const quote = await createQuote(status);
			if (!quote) throw new Error("Failed to create quote header.");
			
			// 2. Upload files and create items
			for (const item of items) {
				let file_url: string | undefined = undefined;
				
				if (item.fileUri && item.fileName) {
					const url = await uploadQuoteDocument(item.fileUri, item.fileName);
					if (url) {
						file_url = url;
					}
				}
				
				await createQuoteItem(quote.id, {
					source_language: item.source || 'N/A',
					target_language: item.target || 'N/A',
					document_type: item.docType || 'Documento Padrão',
					file_url: file_url,
					estimated_value: 480.00 // mock value as requested
				});
			}
			
			// Show success toast
			setShowSuccessToast(true);
			setTimeout(() => setShowSuccessToast(false), 4000);
			
			// Clear form
			setItems([{ id: Date.now().toString(), source: '', target: '', docType: '' }]);
			
		} catch (error) {
			console.error("Error saving quote:", error);
			alert("Ocorreu um erro ao salvar o orçamento.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<View className="flex-1 bg-gray-50">
			<ScrollView 
				className="flex-1"
				contentContainerClassName="p-8 flex-grow"
			>
				{/* Cabeçalho */}
				<View className="flex-row justify-between items-center mb-8">
					<View className="flex-1 pr-4">
						<Text className="text-2xl font-poppins-bold text-gray-900">
							Novo orçamento
						</Text>
						<Text className="text-sm text-gray-500 font-inter mt-1 flex-wrap">
							A partir da requisição de Fernanda Aquino - Rezende Advogados
						</Text>
					</View>
					<View className="bg-orange-100 px-3 py-1 rounded-md shrink-0">
						<Text className="text-xs font-inter-medium text-orange-800">
							Pendente
						</Text>
					</View>
				</View>

				{/* Card Cliente */}
				<View className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 mb-6">
					<Text className="text-sm font-inter-bold text-gray-900 mb-4">
						Cliente
					</Text>
					<View className="flex-col md:flex-row gap-4">
						<View className="flex-1">
							<Text className="text-xs font-inter-medium text-gray-700 mb-1.5">
								Cliente
							</Text>
							<TextInput
								className="border border-gray-200 rounded-md p-3 text-sm text-gray-800 font-inter bg-white"
								value="Rezende Advogados"
								editable={false}
							/>
						</View>
						<View className="flex-1">
							<Text className="text-xs font-inter-medium text-gray-700 mb-1.5">
								Contato
							</Text>
							<TextInput
								className="border border-gray-200 rounded-md p-3 text-sm text-gray-800 font-inter bg-white"
								value="Fernanda Aquino"
								editable={false}
							/>
						</View>
					</View>
				</View>

				{/* Itens do orçamento */}
				<View 
					className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 mb-6 flex-1 relative z-50" 
					style={{ zIndex: 50 }}
				>
					<View className="flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 md:gap-0">
						<Text className="text-sm font-inter-bold text-gray-900">
							Itens do orçamento
						</Text>
						<TouchableOpacity 
							onPress={handleAddItem}
							className="border border-blue-200 bg-white px-4 py-2 rounded-lg w-full md:w-auto items-center"
							disabled={isSubmitting}
						>
							<Text className="text-blue-600 text-xs font-inter-medium">+ Adicionar item</Text>
						</TouchableOpacity>
					</View>

					<View className="flex-col gap-4 relative z-50">
						{items.map((item, index) => (
							<View 
								key={item.id} 
								style={{ zIndex: 100 - index }}
								className="border border-gray-200 rounded-lg p-4 flex-col md:flex-row gap-4 relative"
							>
								<View className="flex-1 relative" style={{ zIndex: 30 }}>
									<Text className="text-xs font-inter-medium text-gray-700 mb-1.5">Idioma origem</Text>
									<LanguageSelect 
										value={item.source} 
										onChange={(val) => updateItem(item.id, 'source', val)} 
									/>
								</View>
								<View className="flex-1 relative" style={{ zIndex: 20 }}>
									<Text className="text-xs font-inter-medium text-gray-700 mb-1.5">Idioma destino</Text>
									<LanguageSelect 
										value={item.target} 
										onChange={(val) => updateItem(item.id, 'target', val)} 
									/>
								</View>
								<View className="flex-1 relative" style={{ zIndex: 10 }}>
									<Text className="text-xs font-inter-medium text-gray-700 mb-1.5">Tipo de documento</Text>
									<TextInput
										className="border border-gray-200 rounded-md p-3 text-sm text-gray-800 font-inter bg-white"
										placeholder="Ex: Contrato Social"
										value={item.docType}
										onChangeText={(val) => updateItem(item.id, 'docType', val)}
									/>
								</View>
								<View className="flex-1 relative">
									<Text className="text-xs font-inter-medium text-gray-700 mb-1.5">Arquivo</Text>
									<TouchableOpacity 
										className={`border ${item.fileName ? 'border-solid border-blue-300 bg-blue-50' : 'border-dashed border-gray-300 bg-white'} rounded-md px-3 items-center justify-center flex-row gap-2 h-[46px]`}
										onPress={() => handlePickDocument(item.id)}
										disabled={isSubmitting}
									>
										<Upload size={14} color={item.fileName ? "#3b82f6" : "#9ca3af"} />
										<Text className={`${item.fileName ? 'text-blue-700 font-inter-medium' : 'text-gray-400 font-inter'} text-xs flex-1`} numberOfLines={1}>
											{item.fileName || "Anexar arquivo"}
										</Text>
									</TouchableOpacity>
								</View>
								<View className="w-full md:w-32 relative">
									<Text className="text-xs font-inter-medium text-gray-700 mb-1.5">Valor</Text>
									<View className="bg-gray-100 rounded-md p-3 h-[46px] justify-center">
										<Text className="text-sm font-inter-bold text-gray-800">
											R$ 480,00
										</Text>
									</View>
								</View>
							</View>
						))}
					</View>

					<Text className="text-xs font-inter text-gray-400 mt-6">
						Valores calculados automaticamente pela tabela de preços por par de idiomas.
					</Text>
				</View>

				{/* Total do orçamento */}
				<View className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 mb-8 flex-col md:flex-row justify-between items-center gap-6 md:gap-0">
					<View className="w-full md:w-auto">
						<Text className="text-xs font-inter text-gray-500 mb-1">Total do orçamento</Text>
						<Text className="text-2xl font-poppins-bold text-gray-900">R$ {items.length * 480},00</Text>
					</View>
					<View className="flex-col md:flex-row gap-3 w-full md:w-auto">
						<TouchableOpacity 
							className="bg-white border border-blue-200 hover:bg-blue-50 w-full md:w-auto px-4 py-2 rounded-lg items-center transition-colors flex-row justify-center gap-2"
							onPress={() => handleSaveQuote('draft')}
							disabled={isSubmitting}
						>
							<Text className="text-blue-600 font-inter-medium text-sm">
								Salvar rascunho
							</Text>
						</TouchableOpacity>
						<TouchableOpacity 
							className="bg-blue-400 hover:bg-blue-500 w-full md:w-auto px-4 py-2 rounded-lg items-center transition-colors flex-row justify-center gap-2"
							onPress={() => handleSaveQuote('approved')}
							disabled={isSubmitting}
						>
							{isSubmitting && <ActivityIndicator size="small" color="#ffffff" />}
							<Text className="text-white font-inter-medium text-sm">
								{isSubmitting ? "Salvando..." : "Aprovar orçamento"}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</ScrollView>

			{/* Success Toast / Banner Verde no Canto Inferior Direito */}
			{showSuccessToast && (
				<View 
					className="absolute bottom-6 right-6 bg-green-500 rounded-lg shadow-lg p-4 flex-row items-center gap-3 z-50"
					style={{ elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 }}
				>
					<CheckCircle2 size={24} color="#ffffff" />
					<Text className="text-white font-inter-medium text-sm">
						Orçamento salvo com sucesso!
					</Text>
				</View>
			)}
		</View>
	);
}
