import eslintPluginPrettier from 'eslint-plugin-prettier';

export default [
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
    },
    plugins: {
      prettier: eslintPluginPrettier,
    },
    rules: {
      'prettier/prettier': 'warn',
      'no-unused-vars': 'warn',
      'no-console': 'off',
    },
  },
];
