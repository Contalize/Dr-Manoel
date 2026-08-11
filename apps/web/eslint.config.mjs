import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: ['functions/**', '.next/**', 'out/**', 'node_modules/**'],
  },
  {
    // Regras de prontidao para o React Compiler (eslint-plugin-react-hooks v7).
    // Este projeto nao usa o React Compiler (sem babel-plugin-react-compiler /
    // experimental.reactCompiler no next.config.ts), entao essas regras so
    // sinalizam padroes idiomaticos e seguros do React "classico" (flag de
    // `mounted`, `isLoading` no inicio de um fetch, componentes internos do
    // shadcn/embla) como se fossem erro. Reescrever isso agora seria refactor
    // de risco sem ganho, numa base com dados clinicos sensiveis.
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/incompatible-library': 'off',
    },
  },
];

export default eslintConfig;
