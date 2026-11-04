import globals from 'globals';

const rules = {
  'no-undef': 'error',
  'no-unused-vars': ['warn', { args: 'none' }],
};

export default [
  { ignores: ['dist/', 'build/', 'node_modules/'] },
  {
    // renderer: ES modules in the browser
    files: ['renderer/**/*.js'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: { ...globals.browser } },
    rules,
  },
  {
    // main process, scripts, tests: CommonJS in Node/Electron
    files: ['src/**/*.js', 'scripts/**/*.js', 'test/**/*.js'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'commonjs', globals: { ...globals.node } },
    rules,
  },
];
