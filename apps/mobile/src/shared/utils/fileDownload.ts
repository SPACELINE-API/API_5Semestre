import { getFileName } from './file';

export function getDownloadFileName(fileUrl: string) {
	return (
		getFileName(fileUrl)
			.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
			.trim() || 'arquivo'
	);
}

export function getDownloadMimeType(fileName: string) {
	const extension = fileName.split('.').pop()?.toLowerCase();
	const mimeTypes: Record<string, string> = {
		pdf: 'application/pdf',
		doc: 'application/msword',
		docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		jpeg: 'image/jpeg',
		jpg: 'image/jpeg',
		png: 'image/png',
		txt: 'text/plain',
		xls: 'application/vnd.ms-excel',
		xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	};

	return extension
		? (mimeTypes[extension] ?? 'application/octet-stream')
		: 'application/octet-stream';
}

export function getDownloadUrl(fileUrl: string) {
	const downloadUrl = new URL(fileUrl);
	downloadUrl.searchParams.set('download', getFileName(fileUrl));
	return downloadUrl.toString();
}
