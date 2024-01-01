import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/script_vndb_quickAdd.js',
  output: {
    file: 'dist/script_vndb_quickAdd.js',
    format: 'cjs',
  },
  plugins: [commonjs(), resolve()],
};
