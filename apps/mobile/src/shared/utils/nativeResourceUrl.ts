function isLoopbackHost(hostname: string) {
	const normalizedHost = hostname.toLowerCase();
	if (
		normalizedHost === 'localhost' ||
		normalizedHost === '::1' ||
		normalizedHost === '[::1]'
	) {
		return true;
	}

	const ipv4Octets = normalizedHost.split('.');
	return (
		ipv4Octets.length === 4 &&
		ipv4Octets[0] === '127' &&
		ipv4Octets
			.slice(1)
			.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255)
	);
}

export function resolveNativeResourceUrl(
	resourceUrl: string,
	hostUri: string | undefined,
	platform: string,
): string {
	if (platform === 'web' || !hostUri) return resourceUrl;

	try {
		const url = new URL(resourceUrl);
		if (!isLoopbackHost(url.hostname)) return resourceUrl;

		const hostUriWithScheme = hostUri.includes('://')
			? hostUri
			: `http://${hostUri}`;
		const deviceHost = new URL(hostUriWithScheme).hostname;
		if (isLoopbackHost(deviceHost)) return resourceUrl;

		url.hostname = deviceHost;
		return url.toString();
	} catch {
		return resourceUrl;
	}
}
