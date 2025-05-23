import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint';
import eslintPluginReact from 'eslint-plugin-react';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'eslint.config.js'] }, // Added eslint.config.js to ignores
  js.configs.recommended, // Moved out of the object to apply globally
  ...tseslint.configs.strictTypeChecked, // Use stricter type-checked rules
  {
    // Specific configuration for TS/TSX files
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest', // Use latest ECMAScript version
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node }, // Add node globals
      parserOptions: {
        project: ['./tsconfig.app.json', './tsconfig.node.json'], // Specify tsconfig files
        tsconfigRootDir: import.meta.dirname, // Correctly set tsconfig root directory
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin, // Ensure typescript-eslint plugin is explicitly available
      'react': eslintPluginReact, // Add eslint-plugin-react
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // Start with react/recommended and react/jsx-runtime rules
      ...eslintPluginReact.configs.recommended.rules,
      ...eslintPluginReact.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Add or override specific rules for stricter linting
      'no-unused-vars': 'off', // Disable base rule, use @typescript-eslint/no-unused-vars instead
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^\\_', varsIgnorePattern: '^\\_', caughtErrorsIgnorePattern: '^\\_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      // You can add more rules here based on your preferences
    },
    settings: {
      react: {
        version: 'detect', // Automatically detect React version
      },
    },
  },
  eslintConfigPrettier, // Apply Prettier rules last to avoid conflicts
);
