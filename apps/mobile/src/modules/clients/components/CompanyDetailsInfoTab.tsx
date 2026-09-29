import { Text, View } from 'react-native';
import type { ReactNode } from 'react';
import type { Company } from '../types/company';
import { formatCnpj, formatDate } from '../utils/format';

type InfoFieldProps = {
	label: string;
	value?: string;
};

function InfoField({ label, value }: InfoFieldProps) {
	return (
		<View className="min-w-[180px] flex-1 gap-1">
			<Text className="font-inter text-gray-400 text-xs">{label}</Text>
			<Text
				className="font-inter font-medium text-gray-800 text-sm"
				numberOfLines={2}
			>
				{value || 'Não informado'}
			</Text>
		</View>
	);
}

function InfoSection({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<View className="gap-4">
			<Text className="font-inter font-semibold text-gray-900 text-sm">
				{title}
			</Text>
			<View className="flex-row flex-wrap gap-x-10 gap-y-6">{children}</View>
		</View>
	);
}

export function CompanyDetailsInfoTab({ company }: { company: Company }) {
	const address = `${company.street}${company.number ? `, ${company.number}` : ''}${
		company.complement ? ` - ${company.complement}` : ''
	}`;
	const city =
		company.city && company.state
			? `${company.city} - ${company.state}`
			: company.city;

	return (
		<View className="gap-8">
			<InfoSection title="Dados gerais">
				<InfoField label="CNPJ" value={formatCnpj(company.cnpj)} />
				<InfoField label="Segmento" value={company.industry} />
				<InfoField label="Telefone" value={company.phone} />
				<InfoField label="E-mail" value={company.email} />
			</InfoSection>

			<View className="border-t border-gray-100 pt-7">
				<InfoSection title="Endereço">
					<InfoField label="Logradouro" value={address} />
					<InfoField label="Bairro" value={company.neighborhood} />
					<InfoField label="Cidade" value={city} />
					<InfoField label="CEP" value={company.zip_code} />
				</InfoSection>
			</View>

			<View className="border-t border-gray-100 pt-7">
				<InfoSection title="Registro">
					<InfoField
						label="Cadastrado em"
						value={formatDate(company.created_at)}
					/>
					<InfoField
						label="Última atualização"
						value={formatDate(company.updated_at)}
					/>
				</InfoSection>
			</View>
		</View>
	);
}
