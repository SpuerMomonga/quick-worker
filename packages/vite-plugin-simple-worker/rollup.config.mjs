import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import { sync } from 'rimraf';

function config({ format, input = 'index', output = 'index', ext = 'js' }) {
  return {
    input: `./src/${input}.ts`,
    output: {
      name: 'SimpleWorkerPlugin',
      file: `./dist/${output}.${ext}`,
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
    ],
  };
}

sync('dist');

export default defineConfig(
  [
    { format: 'esm', minify: false, ext: 'mjs' },
    { format: 'umd', minify: false },
  ].map(config),
);
