import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import solid from 'eslint-plugin-solid';
import vite from '@typpi/eslint-plugin-vite';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },

  js.configs.recommended,
  tseslint.configs.recommended,

  // Solid and Vite rules need to see JSX, so they get their own parser setup.
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      solid,
      vite,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      ...solid.configs.recommended.rules,
      ...vite.configs.recommended.rules,

      // Solid 2 removed the Solid 1 `createEffect(on(...))` form and the
      // single-argument `createEffect`. Both rules flag code that still works
      // in Solid 1 but behaves differently in Solid 2.
      'solid/no-single-arg-create-effect': 'error',
      'solid/removed-api': 'error',

      // Reading props or a signal by destructuring breaks reactivity in Solid.
      'solid/no-destructure': 'error',
      'solid/reactivity': 'error',
      'solid/no-unused-signal': 'error',
      'solid/no-store-mutation-outside-setter': 'error',
      'solid/no-write-in-pure-computation': 'error',
      'solid/validate-jsx-nesting': 'error',
      'solid/prefer-for': 'error',

      // `solid.configs.recommended` ships these as warnings. The project
      // treats every rule as either off or error, so they are promoted here.
      'solid/components-return-once': 'error',
      'solid/event-handlers': 'error',
      'solid/imports': 'error',
      'solid/no-react-deps': 'error',
      'solid/no-react-specific-props': 'error',
      'solid/self-closing-comp': 'error',
      'solid/style-prop': 'error',
    },
  },

  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // The TypeScript compiler already reports unused identifiers, and it
      // understands type-only usage. The ESLint rule would double-report and
      // would flag `_`-prefixed names that TS allows.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  {
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
  },

  {
    // Style rules. Everything here is autofixable with `npm run lint:fix`.
    files: ['**/*.{ts,tsx,js,mjs,cjs}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      // Semicolons required.
      semi: ['error', 'always', { omitLastInOneLineBlock: false }],
      'no-extra-semi': 'error',

      // Whitespace.
      'no-trailing-spaces': 'error',
      'eol-last': ['error', 'always'],
      'no-tabs': 'error',
      'space-before-blocks': 'error',
      'space-infix-ops': 'error',
      'keyword-spacing': 'error',
      'comma-spacing': 'error',
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],

      // Quotes.
      quotes: ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],

      // Commas.
      'comma-dangle': ['error', 'always-multiline'],
      'comma-style': ['error', 'last'],

      // Control statements: single-line bodies are allowed, multi-line bodies
      // must use explicit braces.
      curly: ['error', 'multi-line'],
      'nonblock-statement-body-position': 'error',
      'brace-style': ['error', '1tbs', { allowSingleLine: true }],
      'operator-linebreak': ['error', 'before'],

      // Equality and conditionals.
      eqeqeq: ['error', 'always'],
      'no-else-return': ['error', { allowElseIf: false }],
      'no-unneeded-ternary': 'error',
      'no-lonely-if': 'error',

      // Require explicit parentheses when mixing ?? with comparisons, so
      // precedence bugs like `a ?? 0 >= b` cannot compile silently.
      // Arithmetic precedence (* before + etc.) is well known and left free.
      'no-mixed-operators': ['error', {
        groups: [
          ['??', '||', '&&'],
          ['??', '==', '!=', '===', '!==', '>', '>=', '<', '<=', 'in', 'instanceof'],
        ],
        allowSamePrecedence: true,
      }],

      // Indentation.
      indent: [
        'error',
        2,
        {
          SwitchCase: 1,
          VariableDeclarator: 1,
          ignoredNodes: ['TemplateLiteral *', 'JSXElement *', 'JSXElement > *'],
        },
      ],

      // Padding and blank lines.
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
      ],
      'no-multiple-empty-lines': ['error', { max: 1, maxBOF: 0, maxEOF: 0 }],

      // Prefer const, forbid unused code.
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': ['error', 'always'],
      'prefer-arrow-callback': 'error',

      // No leftover debugging. `console.info` is allowed for intentional
      // game-event logging; `console.log` is not.
      'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
      'no-debugger': 'error',
    },
  },

  {
    // The Vite config is a Node file, not browser code.
    files: ['vite.config.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Build scripts run in Node, so they get the Node globals.
    files: ['scripts/**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
);
