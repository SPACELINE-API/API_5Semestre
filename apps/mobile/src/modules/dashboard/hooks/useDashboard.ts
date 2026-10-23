import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchDashboardData } from '../services/dashboardService';
import { fetchDashboardOverview } from '../services/dashboardOverviewService';
import { DEFAULT_PERIOD, getPeriodRange } from '../services/dashboardMetrics';
import type { DashboardMetric, DashboardShortcut } from '../types/shortcut';
import type { DashboardOverview, PeriodKey } from '../types/overview';

export function useDashboard() {
	const [shortcuts, setShortcuts] = useState<DashboardShortcut[]>([]);
	const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
	const [user, setUser] = useState<{ id: string; email: string } | null>(null);
	const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const [period, setPeriod] = useState<PeriodKey>(DEFAULT_PERIOD);
	const [overview, setOverview] = useState<DashboardOverview | null>(null);
	const [overviewLoading, setOverviewLoading] = useState(true);
	const [overviewError, setOverviewError] = useState('');

	const fetchingRef = useRef(false);
	const activeRef = useRef(true);
	const overviewRequestRef = useRef(0);

	const loadDashboard = useCallback(async () => {
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

	const loadOverview = useCallback(
		async (selected: PeriodKey, allowedIds: string[]) => {
			const requestId = ++overviewRequestRef.current;
			setOverviewLoading(true);
			setOverviewError('');
			try {
				const data = await fetchDashboardOverview(
					getPeriodRange(selected),
					allowedIds,
				);
				if (activeRef.current && requestId === overviewRequestRef.current) {
					setOverview(data);
				}
			} catch (cause) {
				if (activeRef.current && requestId === overviewRequestRef.current) {
					setOverviewError(
						cause instanceof Error
							? cause.message
							: 'Não foi possível carregar os dados do período.',
					);
				}
			} finally {
				if (activeRef.current && requestId === overviewRequestRef.current) {
					setOverviewLoading(false);
				}
			}
		},
		[],
	);

	useEffect(() => {
		activeRef.current = true;
		void loadDashboard();
		return () => {
			activeRef.current = false;
		};
	}, [loadDashboard]);

	useEffect(() => {
		if (loading || error) return;
		void loadOverview(
			period,
			shortcuts.map((s) => s.id),
		);
	}, [period, loading, error, shortcuts, loadOverview]);

	const reloadOverview = useCallback(
		() =>
			loadOverview(
				period,
				shortcuts.map((s) => s.id),
			),
		[loadOverview, period, shortcuts],
	);

	const reload = loadDashboard;

	return {
		shortcuts,
		metrics,
		user,
		roles,
		loading,
		error,
		reload,
		period,
		setPeriod,
		overview,
		overviewLoading,
		overviewError,
		reloadOverview,
	};
}
