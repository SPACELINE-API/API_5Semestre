import type { UploadableFile } from '../types/file';

export class MultipartUploadError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message);
		this.name = 'MultipartUploadError';
	}
}

function parseUploadError(body: string, status: number) {
	try {
		const payload = JSON.parse(body) as { detail?: string };
		if (payload.detail) return payload.detail;
	} catch {
		if (body) return body;
	}

	return `Request failed with status ${status}`;
}

function normalizeUploadError(error: unknown): Error {
	const message = error instanceof Error ? error.message : String(error);

	if (
		/file does not exist|does not exist|not found|permission denied|ioexception/i.test(
			message,
		)
	) {
		return new Error(
			'Não foi possível acessar o arquivo selecionado. Escolha o arquivo novamente e tente de novo.',
		);
	}

	return new Error(
		'Não foi possível enviar o arquivo. Verifique sua conexão e tente novamente.',
	);
}

export async function uploadFileMultipart<TResponse>(
	url: string,
	file: UploadableFile,
	fields: Record<string, string>,
	httpMethod: 'POST' | 'PATCH' = 'POST',
	fileFieldName = 'file',
): Promise<TResponse> {
	if (
		typeof document !== 'undefined' ||
		(typeof Blob !== 'undefined' && file instanceof Blob)
	) {
		const formData = new FormData();
		Object.entries(fields).forEach(([name, value]) =>
			formData.append(name, value),
		);
		formData.append(fileFieldName, file as globalThis.File);

		const response = await fetch(url, { method: httpMethod, body: formData });
		if (!response.ok) {
			const body = await response.text();
			throw new MultipartUploadError(
				parseUploadError(body, response.status),
				response.status,
			);
		}

		return response.json() as Promise<TResponse>;
	}

	const nativeFile = file as { uri: string; type: string };
	let response;
	try {
		const { File: ExpoFile, UploadType } = await import('expo-file-system');
		response = await new ExpoFile(nativeFile.uri).upload(url, {
			uploadType: UploadType.MULTIPART,
			fieldName: fileFieldName,
			mimeType: nativeFile.type,
			httpMethod,
			parameters: fields,
		});
	} catch (error) {
		throw normalizeUploadError(error);
	}

	if (response.status < 200 || response.status >= 300) {
		throw new MultipartUploadError(
			parseUploadError(response.body, response.status),
			response.status,
		);
	}

	return JSON.parse(response.body) as TResponse;
}
