import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Vite annonce son propre port — 5174 — alors que ce serveur n'est jamais
 * consulté directement : le site vitrine (port 5173) relaie /app vers lui.
 * Afficher cette adresse laisse croire que l'application vit sur un second
 * port, et invite à l'ouvrir là où le relais, l'API et les liens « Se
 * connecter » ne fonctionnent pas.
 *
 * Ce greffon remplace donc l'annonce par l'adresse réellement utilisable.
 * Il n'agit qu'en développement : `configureServer` n'est pas appelé au build.
 */
function annoncerAdresseReelle(): Plugin {
  return {
    name: 'horizonecole-annonce-adresse-reelle',
    configureServer(server) {
      server.printUrls = () => {
        const { logger } = server.config
        logger.info('')
        logger.info('  [32m➜[0m  [1mApplication[0m : [36mhttp://localhost:5173/app/[0m')
        logger.info('  [2m   servie par le site vitrine, qui relaie aussi /api vers l’API[0m')
        logger.info('  [2m   (ce serveur écoute sur 5174, en interne — inutile de l’ouvrir)[0m')
        logger.info('')
      }
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  // L'application est servie sous /app/ ; la racine du domaine est réservée au
  // site vitrine. Vite préfixe les URL des bundles et expose la valeur via
  // import.meta.env.BASE_URL, dont dépendent les redirections « dures »
  // (api.ts, ErrorBoundary.tsx) : ne pas la modifier sans les relire.
  base: '/app/',
  plugins: [react(), annoncerAdresseReelle()],
  server: {
    // 5173 est tenu par le site vitrine (apps/site), qui sert la racine et
    // relaie /app vers ce serveur. On n'accède donc jamais à ce port
    // directement : l'adresse de travail est localhost:5173/app/.
    port: 5174,
    // Port strict : sans cela, Vite glisserait silencieusement sur 5175 si 5174
    // était pris, et le relais du site vitrine — figé sur 5174 — renverrait des
    // 502 sans que la cause soit visible.
    strictPort: true,
    host: true,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
