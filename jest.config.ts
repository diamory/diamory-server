/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */

export default {
  transform: {
    '^.+\\.ts?$': 'ts-jest'
  },
  setupFiles: ['<rootDir>/jest.setEnvVars.js'],
  clearMocks: true,
  testMatch: ['**/tests/unit/functions/*/*.test.ts']
};
