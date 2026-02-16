/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/lib'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          strict: true,
          module: 'commonjs',
          esModuleInterop: true,
          types: ['jest', 'node'],
          paths: { '@/*': ['./*'] },
          baseUrl: '.',
        },
      },
    ],
  },
};
