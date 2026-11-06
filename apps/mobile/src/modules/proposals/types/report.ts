export type ReportSelection = 'selected' | 'all';

export type ReportGranularity = 'days' | 'months' | 'years';

export type ReportFormat = 'csv' | 'xlsx';

export type ReportCompanyOption = {
	id: string;
	trade_name: string;
};

export type CompanyReportRequest = {
	selection: ReportSelection;
	company_ids?: string[];
	start_date: string;
	end_date: string;
	granularity: ReportGranularity;
	format: ReportFormat;
};

export type CompanyReportOrder = {
	ordem_servico_id: string;
};

export type CompanyReportCompany = {
	empresa_id: string;
	razao_social: string;
	nome_fantasia: string;
	cnpj: string;
	segmento: string;
	cidade: string;
	estado: string;
	data_cadastro: string;
	quantidade_contatos: number;
	total_requisicoes: number;
	requisicoes_por_status: Record<string, number>;
	idiomas_requisicoes: string[];
	necessidades_requisicoes: string[];
	total_propostas: number;
	propostas_por_status: Record<string, number>;
	valor_estimado: number | string;
	valor_itens_traducao: number | string;
	valor_servicos_adicionais: number | string;
	datas_criacao_propostas: string[];
	datas_aprovacao_propostas: string[];
	datas_reprovacao_propostas: string[];
	total_ordens_servico: number;
	ordens_servico: CompanyReportOrder[];
};

export type CompanyReportFileResponse = {
	url: string;
	filename: string;
	expires_in: number;
};
