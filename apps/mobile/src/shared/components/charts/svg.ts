export function stripPointerEvents(svg: string): string {
	return svg
		.replace(/\s+pointer-events="[^"]*"/g, '')
		.replace(/pointer-events\s*:\s*[^;"']*;?/g, '');
}
