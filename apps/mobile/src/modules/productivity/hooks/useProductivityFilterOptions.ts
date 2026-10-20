import { useEffect, useState } from 'react';
import { getProductivityFilterOptions } from '../services/productivityService';
import type { ProductivityFilterOptions } from '../types/productivity';

const EMPTY_OPTIONS: ProductivityFilterOptions = {
	translators: [],
	projects: [],
};

export function useProductivityFilterOptions() {
	const [options, setOptions] =
		useState<ProductivityFilterOptions>(EMPTY_OPTIONS);
	const [error, setError] = useState(false);

	useEffect(() => {
		let active = true;
		getProductivityFilterOptions()
			.then((data) => {
				if (active) setOptions(data);
			})
			.catch(() => {
				if (active) setError(true);
			});
		return () => {
			active = false;
		};
	}, []);

	return { options, error };
}
