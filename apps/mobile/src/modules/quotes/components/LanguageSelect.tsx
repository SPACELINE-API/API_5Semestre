import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { fetchLanguages, Language } from '../../../shared/services/languageService';

interface LanguageSelectProps {
	value?: string;
	onChange: (languageId: string) => void;
	placeholder?: string;
}

export function LanguageSelect({ value, onChange, placeholder = 'Selecione um idioma' }: LanguageSelectProps) {
	const [languages, setLanguages] = useState<Language[]>([]);
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		fetchLanguages().then(setLanguages);
	}, []);

	const selectedLanguage = languages.find(l => l.id === value);

	return (
		<View className="relative z-50">
			<TouchableOpacity
				className="border border-gray-200 rounded-md p-3 bg-white flex-row justify-between items-center"
				onPress={() => setIsOpen(!isOpen)}
			>
				<Text className={`text-sm font-inter ${selectedLanguage ? 'text-gray-900' : 'text-gray-400'}`}>
					{selectedLanguage ? selectedLanguage.name : placeholder}
				</Text>
				<ChevronDown size={16} color="#9ca3af" />
			</TouchableOpacity>

			{isOpen && (
				<View className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-sm z-50 max-h-48 overflow-hidden">
					<FlatList
						data={languages}
						keyExtractor={item => item.id}
						nestedScrollEnabled
						renderItem={({ item }) => (
							<TouchableOpacity
								className={`p-3 border-b border-gray-50 ${value === item.id ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}`}
								onPress={() => {
									onChange(item.id);
									setIsOpen(false);
								}}
							>
								<Text className={`font-inter text-sm ${value === item.id ? 'text-blue-700 font-inter-medium' : 'text-gray-700'}`}>
									{item.name}
								</Text>
							</TouchableOpacity>
						)}
					/>
				</View>
			)}
		</View>
	);
}
