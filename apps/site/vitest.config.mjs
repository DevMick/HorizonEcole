import { fileURLToPath } from 'node:url';

// Configuration volontairement sans import de « vitest/config » : le fichier doit
// pouvoir être chargé même quand vitest est exécuté depuis le cache npx, avant
// que les dépendances locales ne soient installées.
//
// `tsconfigRaw` court-circuite la lecture de tsconfig.json (qui étend
// « astro/tsconfigs/strict ») : les tests portent sur la logique tarifaire pure
// et ne doivent dépendre ni d'Astro ni de sa configuration TypeScript.
export default {
  esbuild: { tsconfigRaw: '{}' },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
};
