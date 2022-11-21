import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import alias from '@rollup/plugin-alias';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import type { Plugin, RollupOptions, WarningHandlerWithDefault } from 'rollup';
import { string } from 'rollup-plugin-string';
import { terser } from 'rollup-plugin-terser';
import addCliEntry from './build-plugins/add-cli-entry';
import cleanBeforeWrite from './build-plugins/clean-before-write';
import conditionalFsEventsImport from './build-plugins/conditional-fsevents-import';
import copyTypes from './build-plugins/copy-types';
import emitModulePackageFile from './build-plugins/emit-module-package-file';
import esmDynamicImport from './build-plugins/esm-dynamic-import';
import getLicenseHandler from './build-plugins/generate-license-file';
import getBanner from './build-plugins/get-banner';
import replaceBrowserModules from './build-plugins/replace-browser-modules';

const onwarn: WarningHandlerWithDefault = warning => {
	// eslint-disable-next-line no-console
	console.error(
		'Building Rollup produced warnings that need to be resolved. ' +
			'Please keep in mind that the browser build may never have external dependencies!'
	);
	// eslint-disable-next-line unicorn/error-message
	throw Object.assign(new Error(), warning);
};


const nodePlugins: Plugin[] = [
	alias(moduleAliases),
	nodeResolve(),
	json(),
	conditionalFsEventsImport(),
	string({ include: '**/*.md' }),
	commonjs({
		ignoreTryCatch: false,
		include: 'node_modules/**'
	}),
	typescript(),
	cleanBeforeWrite('dist')
];

const { collectLicenses, writeLicense } = 
    getLicenseHandler(fileURLToPath(new URL('.', import.meta.url)));

const { collectLicenses: collectLicensesBrowser, writeLicense: writeLicenseBrowser } =
		getLicenseHandler(fileURLToPath(new URL('browser', import.meta.url)));

const treeshake = {
	moduleSideEffects: false,
	propertyReadSideEffects: false,
	tryCatchDeoptimization: false
};

const esmBuild = /** @type {RollupOptions} */ ({
		treeshake,
		plugins: [
      ...nodePlugins, 
      // !command.configTest && collectLicenses(),
			// !command.configTest && copyTypes('rollup.d.ts'),
      // addCliEntry(),
      // esmDynamicImport(),
      emitModulePackageFile(), 
      collectLicenses(), writeLicense(),
    ],
		input: {
			'rollup': 'src/rollup/rollup.ts',
      //'cli/run/loadConfigFile.js': 'cli/run/loadConfigFile.ts',
      // 'node-entry.js': 'src/node-entry.ts'
		},
    // 'fsevents' is a dependency of 'chokidar' that cannot be bundled as it contains binary code
		external: ['fsevents'],
		onwarn,
		strictDeprecations: true,

    input: { 'rollup.js': 'src/node-entry.ts' },
		output: {
			banner: getBanner,
			chunkFileNames: 'module-[name].js',
			dir: '.',
			entryFileNames: '[name]',
			exports: 'named',
			externalLiveBindings: true,
			freeze: false,
			generatedCode: 'es2022',
			interop: 'default',
			manualChunks: { rollup: ['src/node-entry.ts'] },
			sourcemap: true
      
			dir: '.',
			format: 'es',
			minifyInternalExports: false,
			sourcemap: true
		},
		
	});

const wipbrowserBuilds = {
  input: 'src/browser-entry.ts',
  onwarn,
  output: [{
    banner: getBanner,
    file: 'browser/dist/es/rollup.browser.js',
    format: 'es',
    plugins: [emitModulePackageFile()]
  }],
  plugins: [
    replaceBrowserModules(),
    alias({
      entries: {
        acorn: resolve('node_modules/acorn/dist/acorn.mjs'),
        'help.md': resolve('cli/help.md'),
        'package.json': resolve('package.json')
      },
      resolve: ['.js', '.json', '.md']
    }),
    nodeResolve({ browser: true }),
    json(),
    commonjs(),
    typescript(),
    terser({ module: true, output: { comments: 'some' } }),
    collectLicensesBrowser(),
    writeLicenseBrowser(),
    cleanBeforeWrite('browser/dist')
  ],
  strictDeprecations: true,
  treeshake
};

export const builds = [esmBuild, wipbrowserEsmBuilds];

/**
 * Rollup rollup it self 
 */
export const buildRollupESMModules = esmBuild
export default esmBuild