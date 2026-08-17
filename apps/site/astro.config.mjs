import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// Résolu par rapport à ce fichier, et non au répertoire courant : le serveur de
// développement peut être lancé depuis la racine du monorepo (avec --root), et
// une résolution relative laisserait alors Tailwind sans configuration — donc
// sans aucune de nos classes de thème.
const configTailwind = fileURLToPath(new URL('./tailwind.config.mjs', import.meta.url));

// Site vitrine HorizonEcole — servi à la racine du domaine.
// L'application vit sous /app/ et n'est pas gérée par ce projet.
export default defineConfig({
  site: 'https://horizonecole.com',
  // Le sitemap est généré par src/pages/sitemap.xml.ts plutôt que par
  // @astrojs/sitemap : la version 3.7 de l'intégration est incompatible avec
  // Astro 4 (elle échoue en fin de build), et une génération explicite garantit
  // que /app/* — l'application authentifiée — n'y figure jamais.
  integrations: [
    tailwind({ applyBaseStyles: false, configFile: configTailwind }),
    react(),
  ],
  /*
   * Anciennes sous-pages de /fonctionnalites, consolidées en une page unique.
   *
   * En sortie statique, Astro produit pour chacune une page de redirection par
   * méta-rafraîchissement : c'est ce qui fait fonctionner ces URL en
   * développement et sous `astro preview`. En production, nginx intercepte ces
   * chemins avant d'atteindre le fichier et répond une vraie 301
   * (voir nginx/horizonecole.conf) — un moteur de recherche ne doit pas avoir
   * à interpréter du HTML pour comprendre qu'une page a déménagé.
   */
  redirects: {
    ...Object.fromEntries(
      [
        'proprietaire',
        'administration',
        'enseignants',
        'eleves-parents',
        'scolarite-finances',
        'bulletins-notes',
        'presences-vie-scolaire',
        'paie-personnel',
      ].map((slug) => [`/fonctionnalites/${slug}`, `/fonctionnalites#${slug}`]),
    ),
    // Les trois cycles ont suivi le même chemin : une page unique, des ancres.
    ...Object.fromEntries(
      ['primaire', 'college', 'lycee'].map((slug) => [`/cycles/${slug}`, `/cycles#${slug}`]),
    ),
  },

  build: {
    // URL sans slash final : /tarifs plutôt que /tarifs/
    format: 'file',
  },
  compressHTML: true,

  vite: {
    /*
     * Une seule copie de React dans le graphe de modules.
     *
     * Ant Design (îlot du formulaire de demande) tire React par ses propres
     * dépendances : sans cette déduplication, Vite en pré-assemble une seconde
     * instance et l'hydratation échoue sur « Invalid hook call ».
     */
    resolve: { dedupe: ['react', 'react-dom'] },
    optimizeDeps: { include: ['react', 'react-dom', 'antd', '@ant-design/icons'] },

    server: {
      /*
       * En développement, ce serveur tient le rôle que nginx tient en
       * production : une seule adresse (http://localhost:4321) où la racine
       * sert la vitrine, /app l'application et /api l'API.
       *
       * Sans ce relais, la vitrine et l'application vivraient sur deux ports
       * distincts : les liens « Se connecter » tomberaient dans le vide et la
       * soumission des formulaires se heurterait à une erreur CORS — deux
       * problèmes qui n'existent pas en production, donc invisibles pendant
       * tout le développement.
       *
       * `ws: true` sur /app : sans lui, le rechargement à chaud de
       * l'application ne pourrait pas ouvrir sa connexion websocket.
       */
      proxy: {
        '/app': { target: 'http://localhost:5174', changeOrigin: true, ws: true },
        '/api': { target: 'http://localhost:4001', changeOrigin: true },
        '/auth': { target: 'http://localhost:4001', changeOrigin: true },
        '/uploads': { target: 'http://localhost:4001', changeOrigin: true },
        '/api-docs': { target: 'http://localhost:4001', changeOrigin: true },
      },
    },
  },
});
