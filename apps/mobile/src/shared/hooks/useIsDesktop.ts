import { useWindowDimensions } from 'react-native';

const MD_BREAKPOINT = 768;

export function useIsDesktop() {
	const { width } = useWindowDimensions();
	return width >= MD_BREAKPOINT;
}
