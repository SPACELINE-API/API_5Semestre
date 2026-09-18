import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
	RequisicoesIcon,
	OrcamentoIcon,
	OrdemServicoIcon,
	ClientesIcon,
	TradutoresIcon,
	SuporteIcon,
	ConfiguracoesIcon,
	SairIcon,
	AbrirIcon,
	FecharIcon,
} from '../shared/components/icon/icon';
import { Link } from 'expo-router';

export function SideBar() {
	const [isOpen, setIsOpen] = useState(true);

	return (
		<View
			className={`h-full bg-white border-r border-gray-100 flex-col py-6 ${isOpen ? 'w-64 px-4' : 'w-20 px-2'}`}
		>
			<View
				className={`items-center mb-8 px-3 ${isOpen ? 'flex-row justify-between' : 'flex-col gap-3 px-0'}`}
			>
				<View className="flex-row items-center gap-3">
					<View className="w-10 h-10 rounded-full bg-blue-300 items-center justify-center shrink-0">
						<Text className="font-inter font-bold text-blue-900 text-sm">
							MD
						</Text>
					</View>
					{isOpen && (
						<View className="flex-col">
							<Text className="font-inter font-bold text-gray-900 text-sm leading-tight">
								Marina Duarte
							</Text>
							<Text className="font-inter text-gray-500 text-xs mt-0.5">
								Atendente
							</Text>
						</View>
					)}
				</View>
				<TouchableOpacity
					onPress={() => setIsOpen(!isOpen)}
					className="items-center justify-center w-8 h-8 rounded-lg shrink-0"
				>
					{isOpen ? (
						<FecharIcon size={20} color="#1f2937" strokeWidth={2.0} />
					) : (
						<AbrirIcon size={20} color="#1f2937" strokeWidth={2.0} />
					)}
				</TouchableOpacity>
			</View>
			<View className="flex-col gap-6">
				<View>
					{isOpen && (
						<Text className="font-inter font-bold text-blue-600 text-xs uppercase px-3 mb-2 tracking-wide">
							Serviços
						</Text>
					)}
					<View className="flex-col gap-1">
						<Link href={'/visualizar-requisicoes' as never} asChild>
						<TouchableOpacity
							className={`flex-row items-center gap-3 px-3 py-2 rounded-lg ${!isOpen ? 'justify-center px-0' : ''}`}
						>
							<RequisicoesIcon size={20} color="#1f2937" strokeWidth={1.5} />
							{isOpen && (
								<Text className="font-inter font-medium text-gray-800 text-sm">
									Requisições
								</Text>
							)}
						</TouchableOpacity>
						</Link>
						<TouchableOpacity
							className={`flex-row items-center gap-3 px-3 py-2 rounded-lg ${!isOpen ? 'justify-center px-0' : ''}`}
						>
							<OrcamentoIcon size={20} color="#1f2937" strokeWidth={1.5} />
							{isOpen && (
								<Text className="font-inter font-medium text-gray-800 text-sm">
									Orçamento
								</Text>
							)}
						</TouchableOpacity>
						<TouchableOpacity
							className={`flex-row items-center gap-3 px-3 py-2 rounded-lg ${!isOpen ? 'justify-center px-0' : ''}`}
						>
							<OrdemServicoIcon size={20} color="#1f2937" strokeWidth={1.5} />
							{isOpen && (
								<Text className="font-inter font-medium text-gray-800 text-sm">
									Ordem de serviço
								</Text>
							)}
						</TouchableOpacity>
					</View>
				</View>
				<View>
					{isOpen && (
						<Text className="font-inter font-bold text-blue-600 text-xs uppercase px-3 mb-2 tracking-wide">
							Gerenciamento
						</Text>
					)}
					<View className="flex-col gap-1">
						<TouchableOpacity
							className={`flex-row items-center gap-3 px-3 py-2 rounded-lg ${!isOpen ? 'justify-center px-0' : ''}`}
						>
							<ClientesIcon size={20} color="#1f2937" strokeWidth={1.5} />
							{isOpen && (
								<Text className="font-inter font-medium text-gray-800 text-sm">
									Clientes
								</Text>
							)}
						</TouchableOpacity>
						<TouchableOpacity
							className={`flex-row items-center gap-3 px-3 py-2 rounded-lg ${!isOpen ? 'justify-center px-0' : ''}`}
						>
							<TradutoresIcon size={20} color="#1f2937" strokeWidth={1.5} />
							{isOpen && (
								<Text className="font-inter font-medium text-gray-800 text-sm">
									Tradutores
								</Text>
							)}
						</TouchableOpacity>
					</View>
				</View>
				<View>
					{isOpen && (
						<Text className="font-inter font-bold text-blue-600 text-xs uppercase px-3 mb-2 tracking-wide">
							Outros
						</Text>
					)}
					<View className="flex-col gap-1">
						<TouchableOpacity
							className={`flex-row items-center gap-3 px-3 py-2 rounded-lg ${!isOpen ? 'justify-center px-0' : ''}`}
						>
							<SuporteIcon size={20} color="#1f2937" strokeWidth={1.5} />
							{isOpen && (
								<Text className="font-inter font-medium text-gray-800 text-sm">
									Suporte
								</Text>
							)}
						</TouchableOpacity>
						<TouchableOpacity
							className={`flex-row items-center gap-3 px-3 py-2 rounded-lg ${!isOpen ? 'justify-center px-0' : ''}`}
						>
							<ConfiguracoesIcon size={20} color="#1f2937" strokeWidth={1.5} />
							{isOpen && (
								<Text className="font-inter font-medium text-gray-800 text-sm">
									Configurações
								</Text>
							)}
						</TouchableOpacity>
						<TouchableOpacity
							className={`flex-row items-center gap-3 px-3 py-2 mt-2 rounded-lg ${!isOpen ? 'justify-center px-0' : ''}`}
						>
							<SairIcon size={20} color="#1f2937" strokeWidth={1.5} />
							{isOpen && (
								<Text className="font-inter font-medium text-gray-800 text-sm">
									Sair do sistema
								</Text>
							)}
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</View>
	);
}
