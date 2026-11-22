import type { PropsWithChildren } from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: PropsWithChildren) {
	return (
		<html lang="pt-BR">
			<head>
				<meta charSet="utf-8" />
				<meta httpEquiv="X-UA-Compatible" content="IE=edge" />
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1, shrink-to-fit=no"
				/>
				<title>SpaceLang</title>
				<link
					rel="icon"
					type="image/png"
					sizes="32x32"
					href="/favicon-32.png"
				/>
				<link rel="icon" type="image/png" sizes="192x192" href="/favicon.png" />
				<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
				<ScrollViewStyleReset />
			</head>
			<body>{children}</body>
		</html>
	);
}
