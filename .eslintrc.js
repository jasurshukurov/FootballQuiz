module.exports = {
  root: true,
  ignorePatterns: ['scripts/qa/**'],
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
