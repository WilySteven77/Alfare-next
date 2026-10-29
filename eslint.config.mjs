import {
  defineConfig,
  globalIgnores,
} from 'eslint/config';

import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = defineConfig([
  ...nextVitals,

  globalIgnores([
    '**/.kilo/**',
    '**/node_modules/**',
    '**/.next/**',
    '**/coverage/**',
    '**/out/**',
    '**/build/**',
    'next-env.d.ts',
  ]),

  {
    rules: {
      /*
       * Estas reglas de React Compiler son demasiado estrictas
       * para el código existente del proyecto y no corresponden
       * a errores funcionales de la aplicación.
       */
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
    },
  },
]);

export default eslintConfig;
