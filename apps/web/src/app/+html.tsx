import {
	ScrollViewStyleReset,
	useServerDocumentContext,
} from 'expo-router/html';
import type { ReactNode } from 'react';

export default function Root({ children }: { children: ReactNode }) {
	const { bodyAttributes, bodyNodes, htmlAttributes, headNodes } =
		useServerDocumentContext();

	return (
		<html lang="pt-BR" {...htmlAttributes}>
			<head>
				<meta charSet="utf-8" />
				<meta httpEquiv="X-UA-Compatible" content="IE=edge" />
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1, shrink-to-fit=no"
				/>
				<ScrollViewStyleReset />
				{headNodes}
			</head>
			<body {...bodyAttributes}>
				{children}
				{bodyNodes}
			</body>
		</html>
	);
}
