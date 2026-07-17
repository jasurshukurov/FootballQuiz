module.exports = {
  root: true,
  // dist/ is the web export — after scripts/deploy_web.sh its .js files are
  // gzipped in place (binary), which the parser chokes on. expo-env.d.ts is
  // regenerated (sans trailing newline) by every dev-server start; it's
  // gitignored and not ours to format.
  ignorePatterns: ['scripts/qa/**', 'scripts/etl/**', 'dist/**', 'expo-env.d.ts'],
  extends: ['expo', 'plugin:@typescript-eslint/recommended', 'prettier'],
  plugins: ['@typescript-eslint', 'prettier'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: { jsx: true },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-require-imports': 'off',
  },
  overrides: [
    {
      files: ['**/__tests__/**/*', '**/*.test.*'],
      env: { jest: true },
    },
  ],
};
