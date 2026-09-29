export function getFileName(fileUrl: string) {
	let filename: string;
	try {
		filename = decodeURIComponent(
			new URL(fileUrl).pathname.split('/').pop() || fileUrl,
		);
	} catch {
		filename = decodeURIComponent(fileUrl.split(/[\\/]/).pop() || fileUrl);
	}

	return filename.replace(
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i,
		'',
	);
}
