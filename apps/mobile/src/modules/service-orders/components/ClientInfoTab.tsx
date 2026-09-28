import { View, Text } from 'react-native';
import { User } from 'lucide-react-native';
import type { Company } from '../../clients/types/company';
import type { Contact } from '../types/serviceOrder';
import { formatCnpj } from '../../clients/utils/format';
import { InfoField } from './InfoField';

type ClientInfoTabProps = {
	company: Company | null;
	contacts: Contact[];
};

export function ClientInfoTab({ company, contacts }: ClientInfoTabProps) {
	if (!company) {
		return (
			<Text className="font-inter text-gray-400 text-sm">
				Empresa não encontrada.
			</Text>
		);
	}

	return (
		<View className="gap-8">
			<View className="gap-4">
				<Text className="font-inter font-semibold text-gray-900 text-sm">
					Dados da empresa
				</Text>

				<View className="flex-row flex-wrap gap-x-10 gap-y-6">
					<InfoField label="Razão social" value={company.legal_name} />
					<InfoField label="Nome fantasia" value={company.trade_name} />
					<InfoField label="CNPJ" value={formatCnpj(company.cnpj)} />
					<InfoField label="Segmento" value={company.industry} />
					<InfoField label="Telefone" value={company.phone} />
					<InfoField label="E-mail" value={company.email} />
				</View>
			</View>

			<View className="border-t border-gray-100 pt-7">
				<View className="gap-4">
					<Text className="font-inter font-semibold text-gray-900 text-sm">
						Endereço
					</Text>

					<View className="flex-row flex-wrap gap-x-10 gap-y-6">
						<InfoField
							label="Logradouro"
							value={`${company.street}${
								company.number ? `, ${company.number}` : ''
							}${company.complement ? ` - ${company.complement}` : ''}`}
						/>
						<InfoField label="Bairro" value={company.neighborhood} />
						<InfoField
							label="Cidade"
							value={
								company.city && company.state
									? `${company.city} - ${company.state}`
									: company.city
							}
						/>
						<InfoField label="CEP" value={company.zip_code} />
					</View>
				</View>
			</View>

			<View className="border-t border-gray-100 pt-7">
				<Text className="mb-4 font-inter font-semibold text-gray-900 text-sm">
					Contatos
				</Text>

				{contacts.length === 0 && (
					<Text className="font-inter text-gray-400 text-sm">
						Nenhum contato cadastrado para esta empresa.
					</Text>
				)}

				{contacts.map((contact, index) => (
					<View
						key={contact.id}
						className={`flex-row items-center gap-3 py-3 ${
							index === 0 ? '' : 'border-t border-gray-100'
						}`}
					>
						<View className="h-9 w-9 items-center justify-center rounded-full bg-gray-100">
							<User size={16} color="#6B7280" />
						</View>

						<View className="flex-1">
							<View className="flex-row items-center gap-2">
								<Text className="font-inter font-medium text-gray-800 text-sm">
									{contact.name}
								</Text>

								{index === 0 && (
									<View className="rounded-md bg-blue-50 px-1.5 py-0.5">
										<Text className="font-inter font-semibold text-blue-700 text-[10px]">
											Contato principal
										</Text>
									</View>
								)}
							</View>

							<Text className="mt-0.5 font-inter text-gray-400 text-xs">
								{contact.department} · {contact.email} · {contact.phone}
							</Text>
						</View>
					</View>
				))}
			</View>
		</View>
	);
}
