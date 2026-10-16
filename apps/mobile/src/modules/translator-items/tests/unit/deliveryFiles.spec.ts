import { test, expect } from '@playwright/test';
import {
	DELIVERY_MAX_BYTES,
	validateDeliveryFile,
} from '../../utils/deliveryFiles';

test.describe('validateDeliveryFile', () => {
	test('accepts documents and images within the size limit', () => {
		for (const name of ['traducao.pdf', 'traducao.DOCX', 'foto.jpeg']) {
			expect(validateDeliveryFile({ name, size: 1000 })).toBeNull();
		}
	});

	test('rejects unsupported or missing extensions', () => {
		expect(
			validateDeliveryFile({ name: 'programa.exe', size: 1000 }),
		).toContain('Formato inválido');
		expect(
			validateDeliveryFile({ name: 'sem-extensao', size: 1000 }),
		).toContain('Formato inválido');
	});

	test('rejects empty and oversized files', () => {
		expect(validateDeliveryFile({ name: 'traducao.pdf', size: 0 })).toContain(
			'vazio',
		);
		expect(
			validateDeliveryFile({
				name: 'traducao.pdf',
				size: DELIVERY_MAX_BYTES + 1,
			}),
		).toContain('25 MB');
	});

	test('does not block when the picker did not report a size', () => {
		expect(validateDeliveryFile({ name: 'traducao.pdf' })).toBeNull();
	});
});
