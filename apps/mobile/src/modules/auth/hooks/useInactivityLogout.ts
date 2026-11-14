import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { clearSession } from '../services/auth';
import {
	getInactivityTimeout,
	onInactivityTimeoutChange,
} from '../services/sessionTimeout';

const CHECK_INTERVAL_MS = 10_000;
const ACTIVITY_EVENTS = [
	'mousemove',
	'mousedown',
	'keydown',
	'touchstart',
	'wheel',
	'scroll',
] as const;

export function useInactivityLogout(enabled: boolean) {
	const router = useRouter();
	const [minutes, setMinutes] = useState<number | null>(null);
	const lastActivity = useRef(Date.now());

	const registerActivity = useCallback(() => {
		lastActivity.current = Date.now();
	}, []);

	useEffect(() => {
		if (!enabled) return;
		let active = true;

		getInactivityTimeout()
			.then((data) => {
				if (active) setMinutes(data.minutes);
			})
			.catch(() => undefined);

		const unsubscribe = onInactivityTimeoutChange(setMinutes);

		return () => {
			active = false;
			unsubscribe();
		};
	}, [enabled]);

	useEffect(() => {
		if (!enabled || !minutes) return;

		const timeoutMs = minutes * 60_000;
		lastActivity.current = Date.now();

		function checkInactivity() {
			if (Date.now() - lastActivity.current < timeoutMs) return;
			clearSession();
			router.replace('/login' as never);
		}

		const interval = setInterval(checkInactivity, CHECK_INTERVAL_MS);
		const appStateSubscription = AppState.addEventListener(
			'change',
			(state) => {
				if (state === 'active') checkInactivity();
			},
		);

		const hasWindow =
			typeof window !== 'undefined' &&
			typeof window.addEventListener === 'function';
		if (hasWindow) {
			ACTIVITY_EVENTS.forEach((event) =>
				window.addEventListener(event, registerActivity, {
					capture: true,
					passive: true,
				}),
			);
		}

		return () => {
			clearInterval(interval);
			appStateSubscription.remove();
			if (hasWindow) {
				ACTIVITY_EVENTS.forEach((event) =>
					window.removeEventListener(event, registerActivity, {
						capture: true,
					}),
				);
			}
		};
	}, [enabled, minutes, registerActivity, router]);

	return registerActivity;
}
