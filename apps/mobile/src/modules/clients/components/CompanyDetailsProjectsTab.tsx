import { Text, View } from 'react-native';

type Project = {
	id: string;
	name: string;
	status: 'Em andamento' | 'Concluído';
	updatedAt: string;
};

const PROJECTS: Project[] = [
	{
		id: '1',
		name: 'Projeto de Tradução Institucional',
		status: 'Em andamento',
		updatedAt: '12/09/2026',
	},
	{
		id: '2',
		name: 'Localização de Website',
		status: 'Em andamento',
		updatedAt: '08/09/2026',
	},
	{
		id: '3',
		name: 'Tradução de Documentos',
		status: 'Concluído',
		updatedAt: '01/09/2026',
	},
];

export const COMPANY_PROJECT_COUNT = PROJECTS.length;

function TableHeaderCell({
	label,
	flex = 1,
	hideOnMobile = false,
}: {
	label: string;
	flex?: number;
	hideOnMobile?: boolean;
}) {
	return (
		<View style={{ flex }} className={hideOnMobile ? 'hidden md:flex' : ''}>
			<Text className="font-inter text-gray-400 text-xs">{label}</Text>
		</View>
	);
}

function ProjectRow({
	project,
	isFirst,
}: {
	project: Project;
	isFirst: boolean;
}) {
	const isCompleted = project.status === 'Concluído';
	const statusBackground = isCompleted ? 'bg-green-50' : 'bg-blue-50';
	const statusText = isCompleted ? 'text-green-900' : 'text-blue-900';

	return (
		<View
			className={`flex-row items-center py-3.5 ${
				isFirst ? '' : 'border-t border-gray-100'
			}`}
		>
			<Text
				style={{ flex: 3 }}
				className="font-inter font-medium text-gray-800 text-sm"
				numberOfLines={1}
			>
				{project.name}
			</Text>
			<View style={{ flex: 2 }}>
				<View className={`self-start rounded-md px-2 py-1 ${statusBackground}`}>
					<Text className={`font-inter font-medium text-xs ${statusText}`}>
						{project.status}
					</Text>
				</View>
			</View>
			<Text
				style={{ flex: 2 }}
				className="hidden font-inter text-gray-500 text-sm md:flex"
			>
				{project.updatedAt}
			</Text>
		</View>
	);
}

export function CompanyDetailsProjectsTab() {
	return (
		<View>
			<View className="flex-row items-center border-b border-gray-100 pb-3">
				<TableHeaderCell label="Projeto" flex={3} />
				<TableHeaderCell label="Status" flex={2} />
				<TableHeaderCell label="Atualizado em" flex={2} hideOnMobile />
			</View>
			{PROJECTS.map((project, index) => (
				<ProjectRow key={project.id} project={project} isFirst={index === 0} />
			))}
		</View>
	);
}
