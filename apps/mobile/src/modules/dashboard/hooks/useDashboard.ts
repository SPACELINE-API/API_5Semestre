import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchDashboardData } from '../services/dashboardService';
import type { DashboardMetric, DashboardShortcut } from '../types/shortcut';

export function useDashboard() {
	const [shortcuts, setShortcuts] = useState<DashboardShortcut[]>([]);
	const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
	const [user, setUser] = useState<{ id: string; email: string } | null>(null);
	const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const fetchingRef = useRef(false);
	const activeRef = useRef(true);

	const reload = useCallback(async () => {
		if (fetchingRef.current) return;
		fetchingRef.current = true;
		setLoading(true);
		setError('');
		try {
			const data = await fetchDashboardData();
			if (activeRef.current) {
				setShortcuts(data.shortcuts);
				setMetrics(data.metrics || []);
				setUser(data.user);
				setRoles(data.roles);
			}
		} catch (cause) {
			if (activeRef.current) {
				setError(
					cause instanceof Error
						? cause.message
						: 'Não foi possível carregar as informações do painel.',
				);
			}
		} finally {
			fetchingRef.current = false;
			if (activeRef.current) {
				setLoading(false);
			}
		}
	}, []);

	useEffect(() => {
		activeRef.current = true;
		void reload();
		return () => {
			activeRef.current = false;
		};
	}, [reload]);

	return {
		shortcuts,
		metrics,
		user,
		roles,
		loading,
		error,
		reload,
	};
}
