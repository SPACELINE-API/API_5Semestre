const plugin = require('tailwindcss/plugin');
const palette = require('./src/shared/theme/palette');

function cssVariables(scheme) {
	return Object.fromEntries(
		palette.tokens.map((token) => [
			`--color-${token}`,
			palette.rgb[scheme][token].join(' '),
		]),
	);
}

const themeColors = Object.fromEntries(
	palette.tokens.map((token) => [
		token,
		`rgb(var(--color-${token}) / <alpha-value>)`,
	]),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
	presets: [require('nativewind/preset')],
	darkMode: 'class',

	content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
	theme: {
		extend: {
			fontFamily: {
				inter: ['Inter'],
				'inter-medium': ['Inter-Medium'],
				'inter-bold': ['Inter-Bold'],
				poppins: ['Poppins'],
				'poppins-medium': ['Poppins-Medium'],
				'poppins-bold': ['Poppins-Bold'],
			},
			colors: {
				...themeColors,
				black: '#000000',
				white: '#FFFFFF',
				gray: {
					900: '#1A1A1A',
					800: '#353535',
					500: '#8A8A8A',
					300: '#CACACA',
					100: '#F0F0F0',
					50: '#F4F4F4',
					25: '#FBFBFB',
				},
				blue: {
					900: '#042C53',
					600: '#1C6FB0',
					300: '#89C6FF',
				},
				green: {
					900: '#085041',
					50: '#E1F5EE',
				},
				red: {
					900: '#791F1F',
					50: '#FCEBEB',
				},
				brown: {
					900: '#633806',
				},
				beige: '#FAEEDA',
			},
		},
	},
	plugins: [
		plugin(({ addBase }) => {
			addBase({
				':root': cssVariables('light'),
				'.dark:root': cssVariables('dark'),
			});
		}),
	],
};
