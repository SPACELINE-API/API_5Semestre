import { useRouter } from 'expo-router';
import { NewQuoteModal } from '../../../modules/quotes/pages/translation-itens/index';

export default function OrcamentoRoute() {
	const router = useRouter();

	return (
		<NewQuoteModal
			visible
			onClose={() => router.back()}
			onCreated={() => router.back()}
		/>
	);
}
