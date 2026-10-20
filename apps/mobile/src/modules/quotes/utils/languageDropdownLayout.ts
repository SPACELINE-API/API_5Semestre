export type LanguageDropdownAnchor = {
	x: number;
	y: number;
	width: number;
	height: number;
};

export function getLanguageDropdownLayout(
	anchor: LanguageDropdownAnchor,
	viewport: { width: number; height: number },
) {
	const margin = 8;
	const gap = 4;
	const width = Math.max(
		0,
		Math.min(anchor.width, viewport.width - margin * 2),
	);
	const left = Math.min(
		Math.max(anchor.x, margin),
		Math.max(margin, viewport.width - margin - width),
	);
	const preferredHeight = Math.max(
		0,
		Math.min(192, viewport.height - margin * 2),
	);
	const spaceBelow = Math.max(
		0,
		viewport.height - margin - (anchor.y + anchor.height + gap),
	);
	const spaceAbove = Math.max(0, anchor.y - margin - gap);
	const openBelow = spaceBelow >= preferredHeight || spaceBelow >= spaceAbove;
	const maxHeight = Math.min(
		preferredHeight,
		openBelow ? spaceBelow : spaceAbove,
	);

	return {
		left,
		top: openBelow
			? anchor.y + anchor.height + gap
			: anchor.y - maxHeight - gap,
		width,
		maxHeight,
	};
}
