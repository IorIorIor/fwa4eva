import globals from 'globals';
export default [{ files: ['dist/app.js'], languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: { ...globals.browser, claude: 'readonly' } },
  rules: { 'no-undef': 'error', 'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }], 'no-dupe-keys': 'error', 'no-unreachable': 'error', 'no-self-assign': 'warn' } }];
