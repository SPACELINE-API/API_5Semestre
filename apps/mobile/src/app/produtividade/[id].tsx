import { useLocalSearchParams } from 'expo-router';
import { TranslatorProductivityPage } from '../../modules/productivity/pages/TranslatorProductivityPage';
import { defaultFilters } from '../../modules/productivity/utils/filters';

function firstParam(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

export default function TranslatorProductivityRoute() {
	const params = useLocalSearchParams<{
		id: string;
		from?: string;
		to?: string;
		project?: string;
	}>();
	const fallback = defaultFilters();

	return (
		<TranslatorProductivityPage
			translatorId={String(params.id)}
			filters={{
				dateFrom: firstParam(params.from) || fallback.dateFrom,
				dateTo: firstParam(params.to) || fallback.dateTo,
				translatorId: '',
				serviceOrderId: firstParam(params.project) ?? '',
			}}
		/>
	);
}
