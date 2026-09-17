import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, TextInput, Pressable, Platform, StyleSheet } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { fetchLanguages, createLanguage, Language } from '../../../shared/services/languageService';

interface LanguageSelectProps {
	value?: string;
	onChange: (languageId: string) => void;
	placeholder?: string;
}

export function LanguageSelect({ value, onChange, placeholder = 'Selecione um idioma' }: LanguageSelectProps) {
	const [languages, setLanguages] = useState<Language[]>([]);
	const [isOpen, setIsOpen] = useState(false);
	const [isModalVisible, setIsModalVisible] = useState(false);
	
	const [newLangId, setNewLangId] = useState('');
	const [newLangName, setNewLangName] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		loadLanguages();
	}, []);

	const loadLanguages = async () => {
		const data = await fetchLanguages();
		setLanguages(data);
	};

	const handleCreateLanguage = async () => {
		if (!newLangId || !newLangName) return;
		
		setIsSubmitting(true);
		const newLang = await createLanguage(newLangId, newLangName);
		setIsSubmitting(false);
		
		if (newLang) {
			setLanguages([...languages, newLang]);
			onChange(newLang.id);
			setIsModalVisible(false);
			setNewLangId('');
			setNewLangName('');
		}
	};

	const selectedLanguage = languages.find(l => l.id === value);

	return (
		<View className="relative z-50">
			<TouchableOpacity
				className="border border-gray-200 rounded-md p-3 bg-white flex-row justify-between items-center"
				onPress={() => setIsOpen(!isOpen)}
			>
				<Text className={`text-sm font-inter ${selectedLanguage ? 'text-gray-900' : 'text-gray-400'}`}>
					{selectedLanguage ? `${selectedLanguage.name} (${selectedLanguage.id})` : placeholder}
				</Text>
				<ChevronDown size={16} color="#9ca3af" />
			</TouchableOpacity>

			{isOpen && (
				<>
					{Platform.OS === 'web' ? (
						<Pressable 
							style={{ position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}
							onPress={() => setIsOpen(false)}
						/>
					) : (
						<Modal visible={true} transparent animationType="none">
							<Pressable style={StyleSheet.absoluteFill} onPress={() => setIsOpen(false)} />
						</Modal>
					)}

					<View 
						className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
						style={{ zIndex: 9999, elevation: 9999, maxHeight: 192 }}
					>
						<ScrollView nestedScrollEnabled>
							{languages.map(item => (
								<TouchableOpacity
									key={item.id}
									className={`py-2 px-3 border-b border-gray-50 ${value === item.id ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}`}
									onPress={() => {
										onChange(item.id);
										setIsOpen(false);
									}}
								>
									<Text className={`font-inter text-sm ${value === item.id ? 'text-blue-700 font-inter-medium' : 'text-gray-700'}`}>
										{item.name} ({item.id})
									</Text>
								</TouchableOpacity>
							))}
							<TouchableOpacity
								className="py-2 px-3 bg-gray-50 border-t border-gray-100"
								onPress={() => {
									setIsOpen(false);
									setIsModalVisible(true);
								}}
							>
								<Text className="font-inter-medium text-xs text-gray-900">
									+ Adicionar outro idioma
								</Text>
							</TouchableOpacity>
						</ScrollView>
					</View>
				</>
			)}

			<Modal visible={isModalVisible} transparent animationType="fade">
				<View className="flex-1 bg-black/50 justify-center items-center p-4">
					<View className="bg-white rounded-xl w-full max-w-sm p-6 shadow-lg">
						<Text className="text-lg font-inter-bold text-gray-900 mb-4">Adicionar Idioma</Text>
						
						<View className="mb-4">
							<Text className="text-xs font-inter-medium text-gray-700 mb-1.5">Sigla (Ex: pt-BR)</Text>
							<TextInput
								className="border border-gray-200 rounded-md p-3 text-sm text-gray-800 font-inter bg-white"
								placeholder="pt-BR"
								value={newLangId}
								onChangeText={setNewLangId}
							/>
						</View>
						
						<View className="mb-6">
							<Text className="text-xs font-inter-medium text-gray-700 mb-1.5">Nome (Ex: Português)</Text>
							<TextInput
								className="border border-gray-200 rounded-md p-3 text-sm text-gray-800 font-inter bg-white"
								placeholder="Português"
								value={newLangName}
								onChangeText={setNewLangName}
							/>
						</View>

						<View className="flex-row gap-3 justify-end">
							<TouchableOpacity 
								className="bg-white border border-blue-200 hover:bg-blue-50 px-4 py-2 rounded-lg items-center transition-colors flex-1"
								onPress={() => setIsModalVisible(false)}
							>
								<Text className="text-blue-600 font-inter-medium text-sm">Cancelar</Text>
							</TouchableOpacity>
							<TouchableOpacity 
								className="bg-blue-400 hover:bg-blue-500 px-4 py-2 rounded-lg items-center transition-colors flex-1"
								onPress={handleCreateLanguage}
								disabled={isSubmitting}
							>
								<Text className="text-white font-inter-medium text-sm">
									{isSubmitting ? 'Salvando...' : 'Salvar'}
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</View>
	);
}
