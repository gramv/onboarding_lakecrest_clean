export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        target: 'ES2020',
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        moduleResolution: 'node',
        skipLibCheck: true,
        strict: true,
        baseUrl: '.',
        paths: {
          '@/*': ['./src/*']
        },
        types: ['jest', 'node', '@testing-library/jest-dom']
      },
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: ['**/__tests__/**/*.(ts|tsx)', '**/*.(test|spec).(ts|tsx)'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
};
