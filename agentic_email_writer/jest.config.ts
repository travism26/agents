import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  verbose: true,
  testTimeout: 10000,
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/tests/**', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
};

export default config;
