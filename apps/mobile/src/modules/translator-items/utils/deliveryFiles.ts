import type { NativeFile } from '../../../shared/types/file';

const MEGABYTE = 1024 * 1024;

export const DELIVERY_MAX_BYTES = 25 * MEGABYTE;

export const DELIVERY_EXTENSIONS = [
	'pdf',
	'doc',
	'docx',
	'odt',
	'rtf',
	'txt',
	'xls',
	'xlsx',
	'png',
	'jpg',
	'jpeg',
];

export function validateDeliveryFile(
	file: Pick<NativeFile, 'name' | 'size'>,
): string | null {
	const dot = file.name.lastIndexOf('.');
	const extension = dot === -1 ? '' : file.name.slice(dot + 1).toLowerCase();

	if (!DELIVERY_EXTENSIONS.includes(extension)) {
		return 'Formato inválido. Envie PDF, Word, planilha, texto ou imagem.';
	}

	if (file.size !== undefined && file.size <= 0) {
		return 'O arquivo da tradução está vazio.';
	}

	if (file.size !== undefined && file.size > DELIVERY_MAX_BYTES) {
		return `O arquivo da tradução excede o limite de ${DELIVERY_MAX_BYTES / MEGABYTE} MB.`;
	}

	return null;
}
