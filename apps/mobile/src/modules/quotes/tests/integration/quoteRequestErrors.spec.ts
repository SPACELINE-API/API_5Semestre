import { expect, test } from '@playwright/test';
import { FORBIDDEN_ERROR_MESSAGE } from '../../../../shared/services/publicApiClient';
import { getGenerationError } from '../../utils/quoteRequestErrors';

test('uses the standard message for a forbidden quote generation', () => {
	expect(getGenerationError(403, 'Backend-specific detail')).toBe(
		FORBIDDEN_ERROR_MESSAGE,
	);
});
