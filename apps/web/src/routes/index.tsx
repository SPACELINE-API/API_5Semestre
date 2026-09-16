import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({ component: HomePage });

function HomePage() {
	return (
		<div>
			<h2 className="text-2xl font-semibold">Bem-vindo ao Aliança Traduções</h2>
			<p className="mt-2 text-slate-600">
				Acompanhe seus orçamentos, solicitações e documentos.
			</p>
		</div>
	);
}
