const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

const defaultResolveRequest = config.resolver.resolveRequest;

function findTslibEs6(originModulePath) {
	let directory = path.dirname(originModulePath);

	while (true) {
		const candidate = path.join(
			directory,
			'node_modules',
			'tslib',
			'tslib.es6.js',
		);
		if (fs.existsSync(candidate)) return candidate;

		const parent = path.dirname(directory);
		if (parent === directory) return null;
		directory = parent;
	}
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
	if (moduleName === 'tslib') {
		const filePath = findTslibEs6(context.originModulePath);
		if (filePath) return { type: 'sourceFile', filePath };
	}

	return (defaultResolveRequest ?? context.resolveRequest)(
		context,
		moduleName,
		platform,
	);
};

module.exports = withNativeWind(config, {
	input: './src/shared/styles/global.css',
});
