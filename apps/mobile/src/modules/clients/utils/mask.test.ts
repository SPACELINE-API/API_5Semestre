import { maskCnpj, maskPhone } from './mask';

describe('maskCnpj', () => {
	it('formats a complete numeric CNPJ', () => {
		expect(maskCnpj('11222333000181')).toBe('11.222.333/0001-81');
	});

	it('formats progressively as digits are typed', () => {
		expect(maskCnpj('11')).toBe('11');
		expect(maskCnpj('112223')).toBe('11.222.3');
		expect(maskCnpj('11222333000')).toBe('11.222.333/000');
	});

	it('strips non-alphanumeric characters before masking', () => {
		expect(maskCnpj('11.222.333/0001-81')).toBe('11.222.333/0001-81');
	});

	it('uppercases letters for the alphanumeric CNPJ format', () => {
		expect(maskCnpj('12abc34500018a')).toBe('12.ABC.345/0001-8A');
	});

	it('truncates input longer than 14 characters', () => {
		expect(maskCnpj('112223330001819999')).toBe('11.222.333/0001-81');
	});
});

describe('maskPhone', () => {
	it('returns an empty string for empty input', () => {
		expect(maskPhone('')).toBe('');
	});

	it('formats a partial DDD', () => {
		expect(maskPhone('11')).toBe('(11');
	});

	it('formats a landline (10 digits)', () => {
		expect(maskPhone('1133224455')).toBe('(11) 3322-4455');
	});

	it('formats a mobile number (11 digits)', () => {
		expect(maskPhone('11987654321')).toBe('(11) 98765-4321');
	});

	it('strips non-numeric characters before masking', () => {
		expect(maskPhone('(11) 98765-4321')).toBe('(11) 98765-4321');
	});

	it('truncates input longer than 11 digits', () => {
		expect(maskPhone('119876543219999')).toBe('(11) 98765-4321');
	});
});
