import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{
		ignores: [
			'.expo/**',
			'dist/**',
			'node_modules/**',
			'src/shared/theme/palette.js',
		],
	},
	eslint.configs.recommended,
	...tseslint.configs.recommended,
);
