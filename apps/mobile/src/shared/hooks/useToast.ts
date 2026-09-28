import { useCallback, useEffect, useState } from 'react';
import type { ToastData, ToastType } from '../components/Toast';

const TOAST_DURATION = 3500;

export function useToast() {
	const [toast, setToast] = useState<ToastData | null>(null);

	const showToast = useCallback(
		(message: string, type: ToastType = 'success') => {
			setToast({ message, type });
		},
		[],
	);

	const hideToast = useCallback(() => setToast(null), []);

	useEffect(() => {
		if (!toast) return;

		const timer = setTimeout(hideToast, TOAST_DURATION);
		return () => clearTimeout(timer);
	}, [toast, hideToast]);

	return { toast, showToast, hideToast };
}
