import assert from 'node:assert/strict';
import path from 'node:path';
import { PactV4 } from '@pact-foundation/pact';

const pact = new PactV4({
	consumer: 'web',
	provider: 'server',
	dir: path.resolve(process.cwd(), 'pacts'),
	spec: 5,
});

async function postJson(url: string, body: Record<string, string>) {
	const response = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body),
	});

	return {
		status: response.status,
		body: (await response.json()) as Record<string, unknown>,
	};
}

async function verifyLoginContract() {
	const interaction = pact
		.addInteraction()
		.given('as credenciais do usuário são válidas')
		.uponReceiving('uma solicitação de login válida')
		.withRequest('POST', '/api/auth/login', (request) => {
			request.headers({ 'content-type': 'application/json' });
			request.jsonBody({
				email: 'usuario@exemplo.com',
				password: 'senha-segura',
			});
		})
		.willRespondWith(200, (response) => {
			response.headers({ 'content-type': 'application/json' });
			response.jsonBody({
				access_token: 'token-de-sessao',
				token_type: 'bearer',
				expires_in: 3600,
				user: { id: 'user-id', email: 'usuario@exemplo.com' },
			});
		});

	await interaction.executeTest(async (mockServer) => {
		const result = await postJson(`${mockServer.url}/api/auth/login`, {
			email: 'usuario@exemplo.com',
			password: 'senha-segura',
		});

		assert.equal(result.status, 200);
		assert.equal(result.body.token_type, 'bearer');
	});
}

async function verifyRecoveryContract() {
	const interaction = pact
		.addInteraction()
		.given('o serviço de recuperação de senha está disponível')
		.uponReceiving('uma solicitação de recuperação de senha')
		.withRequest('POST', '/api/auth/password-recovery', (request) => {
			request.headers({ 'content-type': 'application/json' });
			request.jsonBody({ email: 'recuperacao@exemplo.com' });
		})
		.willRespondWith(200, (response) => {
			response.headers({ 'content-type': 'application/json' });
			response.jsonBody({ message: 'E-mail enviado para o destinatário.' });
		});

	await interaction.executeTest(async (mockServer) => {
		const result = await postJson(
			`${mockServer.url}/api/auth/password-recovery`,
			{
				email: 'recuperacao@exemplo.com',
			},
		);

		assert.equal(result.status, 200);
		assert.equal(result.body.message, 'E-mail enviado para o destinatário.');
	});
}

async function main() {
	await verifyLoginContract();
	await verifyRecoveryContract();
}

void main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
