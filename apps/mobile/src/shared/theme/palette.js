const light = {
	background: [249, 250, 251],
	surface: [255, 255, 255],
	'surface-subtle': [244, 244, 244],
	'surface-muted': [240, 240, 240],
	'border-subtle': [240, 240, 240],
	border: [229, 231, 235],
	'border-strong': [202, 202, 202],
	foreground: [26, 26, 26],
	'foreground-secondary': [55, 65, 81],
	'foreground-muted': [107, 114, 128],
	'foreground-subtle': [156, 163, 175],
	'foreground-inverse': [255, 255, 255],
	primary: [28, 111, 176],
	'primary-hover': [4, 44, 83],
	'primary-soft': [239, 246, 255],
	'primary-text': [28, 111, 176],
	'primary-strong': [4, 44, 83],
	'primary-foreground': [255, 255, 255],
	success: [34, 197, 94],
	'success-soft': [225, 245, 238],
	'success-text': [8, 80, 65],
	warning: [245, 158, 11],
	'warning-soft': [255, 251, 235],
	'warning-text': [120, 53, 15],
	danger: [220, 38, 38],
	'danger-soft': [252, 235, 235],
	'danger-text': [121, 31, 31],
	overlay: [0, 0, 0],
};

const dark = {
	background: [13, 15, 19],
	surface: [22, 25, 31],
	'surface-subtle': [30, 34, 41],
	'surface-muted': [39, 44, 53],
	'border-subtle': [34, 39, 47],
	border: [45, 51, 61],
	'border-strong': [66, 74, 87],
	foreground: [238, 240, 243],
	'foreground-secondary': [203, 208, 216],
	'foreground-muted': [152, 160, 172],
	'foreground-subtle': [112, 121, 134],
	'foreground-inverse': [13, 15, 19],
	primary: [28, 111, 176],
	'primary-hover': [56, 139, 206],
	'primary-soft': [18, 38, 60],
	'primary-text': [117, 182, 240],
	'primary-strong': [165, 208, 247],
	'primary-foreground': [255, 255, 255],
	success: [52, 211, 120],
	'success-soft': [14, 46, 38],
	'success-text': [110, 214, 180],
	warning: [251, 191, 36],
	'warning-soft': [52, 38, 12],
	'warning-text': [252, 211, 112],
	danger: [239, 68, 68],
	'danger-soft': [60, 22, 24],
	'danger-text': [252, 165, 165],
	overlay: [0, 0, 0],
};

const tokens = Object.keys(light);

function toHex(channels) {
	return `#${channels
		.map((channel) => channel.toString(16).padStart(2, '0'))
		.join('')}`.toUpperCase();
}

function toHexMap(scheme) {
	return Object.fromEntries(
		tokens.map((token) => [token, toHex(scheme[token])]),
	);
}

module.exports = {
	tokens,
	rgb: { light, dark },
	hex: { light: toHexMap(light), dark: toHexMap(dark) },
};
