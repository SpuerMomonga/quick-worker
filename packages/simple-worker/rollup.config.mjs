import { defineConfig } from 'rollup';
// import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import { sync } from 'rimraf';

function config({ format, minify, input = 'index', output = 'index', ext = 'js' }) {
  const minifierSuffix = minify ? '.min' : '';
  return {
    input: `./src/${input}.ts`,
    output: {
      name: 'SimpleWorker',
      file: `./dist/${output}${minifierSuffix}.${ext}`,
      format,
      sourcemap: true,
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        compilerOptions: {
          declaration: true,
          declarationDir: 'dist',
          sourceMap: true,
          outDir: 'dist',
        },
      }),
      minify
        ? terser({
            compress: true,
            mangle: true,
          })
        : undefined,
    ].filter(Boolean),
  };
}

sync('dist');

export default defineConfig(
  [
    { format: 'esm', minify: false, ext: 'mjs' },
    { format: 'esm', minify: true, ext: 'mjs' },
    { format: 'umd', minify: false },
    { format: 'umd', minify: true },
    { output: 'simple-worker', format: 'umd', minify: false },
    { output: 'simple-worker', format: 'umd', minify: true },
  ].map(config),
);
