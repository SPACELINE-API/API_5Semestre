import type { NativeFile } from '../../../shared/types/file';

const MEGABYTE = 1024 * 1024;

export type FileRules = {
	label: string;
	mimeTypes: string[];
	extensions: string[];
	maxBytes: number;
	formatsLabel: string;
};

export const PHOTO_FILE_RULES: FileRules = {
	label: 'foto',
	mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
	extensions: ['jpg', 'jpeg', 'png', 'webp'],
	maxBytes: 5 * MEGABYTE,
	formatsLabel: 'JPG, PNG ou WEBP',
};

export const CERTIFICATE_FILE_RULES: FileRules = {
	label: 'certificado',
	mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
	extensions: ['pdf', 'jpg', 'jpeg', 'png'],
	maxBytes: 10 * MEGABYTE,
	formatsLabel: 'PDF, JPG ou PNG',
};

function extensionOf(name: string) {
	const dot = name.lastIndexOf('.');
	return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

export function validateProfileFile(
	file: Pick<NativeFile, 'name' | 'type' | 'size'>,
	rules: FileRules,
): string | null {
	const typeAllowed = rules.mimeTypes.includes(file.type.toLowerCase());
	const extensionAllowed = rules.extensions.includes(extensionOf(file.name));

	if (!typeAllowed && !extensionAllowed) {
		return `Formato inválido para ${rules.label}. Envie um arquivo ${rules.formatsLabel}.`;
	}

	if (file.size !== undefined && file.size <= 0) {
		return `O arquivo de ${rules.label} está vazio.`;
	}

	if (file.size !== undefined && file.size > rules.maxBytes) {
		return `O arquivo de ${rules.label} excede o limite de ${rules.maxBytes / MEGABYTE} MB.`;
	}

	return null;
}

export function formatFileSize(bytes: number) {
	if (bytes >= MEGABYTE) return `${(bytes / MEGABYTE).toFixed(1)} MB`;
	return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
