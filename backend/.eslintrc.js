module.exports = {
    extends: [
        'eslint:recommended',
        "plugin:@typescript-eslint/recommended", // Uses the recommended rules from the @typescript-eslint/eslint-plugin
        'plugin:jest/recommended',
        'prettier',
        "prettier/@typescript-eslint", // Uses eslint-config-prettier to disable ESLint rules from @typescript-eslint/eslint-plugin that would conflict with prettier
        "plugin:prettier/recommended" // Enables eslint-plugin-prettier and eslint-config-prettier. This will display prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
      ],
      plugins: ['@typescript-eslint', 'jest'],
      env: {
        es6: true,
        jest: true,
      },
      globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
      },
      parser: "@typescript-eslint/parser", // Specifies the ESLint parser
      parserOptions: {
        ecmaVersion: 2020, // Allows for the parsing of modern ECMAScript features
        sourceType: "module", // Allows for the use of imports
        project: './tsconfig.json',
      },
      rules: {
        "prettier/prettier": [
            "error",
            {
                "endOfLine": "auto"
            },
        ],
        // Place to specify ESLint rules. Can be used to overwrite rules specified from the extended configs
        // e.g. "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/no-var-requires": "warn",
      },
}