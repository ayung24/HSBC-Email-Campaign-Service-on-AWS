module.exports = {
    extends: [
      'react-app',
      'react-app/jest',
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:jest/recommended',
      'prettier',
      'prettier/react',
      'prettier/@typescript-eslint',
      'plugin:prettier/recommended'
    ],
    plugins: ['react', '@typescript-eslint', 'jest'],
    env: {
      browser: true,
      es6: true,
      jest: true,
    },
    globals: {
      Atomics: 'readonly',
      SharedArrayBuffer: 'readonly',
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
        arrowFunctions: true,
      },
      ecmaVersion: 2020,
      sourceType: 'module',
      project: './tsconfig.json',
    },
    rules: {
        // additional rules if needed
    },
  };