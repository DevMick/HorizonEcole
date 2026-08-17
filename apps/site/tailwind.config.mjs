import { fileURLToPath } from 'node:url';

// Chemin absolu, résolu depuis ce fichier : le serveur de développement peut
// être lancé depuis la racine du monorepo, et un motif relatif ne balaierait
// alors aucun fichier — Tailwind produirait une feuille de style vide.
const src = fileURLToPath(new URL('./src', import.meta.url)).replace(/\\/g, '/');

/** @type {import('tailwindcss').Config} */
export default {
  content: [`${src}/**/*.{astro,html,js,jsx,md,ts,tsx}`],
  theme: {
    extend: {
      colors: {
        // Design system « Encre & Craie », dérivé de apps/web/tailwind.config.js.
        // Les valeurs sont identiques à celles de l'application : un prospect qui
        // voit une capture doit reconnaître le produit.
        ink: {
          50: '#EEF1FA', 100: '#DCE3F5', 200: '#B7C4E8', 300: '#8FA0D8',
          400: '#647DC5', 500: '#4A5FA8', 600: '#34478F', 700: '#293770',
          800: '#202B57', 900: '#171F3F',
        },
        craie: {
          50: '#EAF5F0', 100: '#CDE8DC', 300: '#7FC1A3', 400: '#4FAE85',
          500: '#2F9468', 600: '#217A54', 700: '#1A6144', 900: '#0F3B2A',
        },
        ambre: {
          50: '#FDF3E4', 100: '#FBE4C0', 300: '#F0BE72', 500: '#E8A33D',
          600: '#CC8722', 700: '#A66C1B',
          // Ajout propre au site : amber-700 ne donne que 4,39:1 sur blanc,
          // sous le seuil AA. amber-600 reste réservé aux remplissages (filets,
          // languettes), 800 au texte — 5,91:1 sur blanc, 5,38:1 sur ambre-50.
          800: '#8A5A15',
        },
        ardoise: {
          0: '#F5F6FA', 100: '#ECEEF4', 200: '#DEE1EA', 300: '#C8CCD8',
          500: '#8A8FA3', 600: '#5C6178', 700: '#41465C', 900: '#1B1E2B',
        },
        danger: { 50: '#FBEAEC', 500: '#D93B4C', 600: '#B92C3C', 700: '#8F1F2C' },
      },
      fontFamily: {
        display: ['Space Grotesk', 'Poppins', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        // Échelle marketing — plus ample que l'échelle applicative (PRD §10.3).
        'display-xl': ['3.25rem', { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.02em' }],
        'display-lg': ['2.1rem', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.015em' }],
        'display-md': ['1.35rem', { lineHeight: '1.3', fontWeight: '700' }],
        chapo: ['1.25rem', { lineHeight: '1.55' }],
        corps: ['1.0625rem', { lineHeight: '1.65' }],
        legende: ['0.875rem', { lineHeight: '1.5' }],
        chiffre: ['2.5rem', { lineHeight: '1', fontWeight: '600' }],
      },
      maxWidth: { conteneur: '1200px', prose: '68ch' },
      spacing: { section: '6rem', 'section-mobile': '4rem' },
      borderRadius: { carte: '12px', bouton: '8px', badge: '4px' },
      boxShadow: {
        douce: '0 1px 2px rgba(23,31,63,.06), 0 2px 8px rgba(23,31,63,.05)',
        levee: '0 4px 12px rgba(23,31,63,.08), 0 12px 32px rgba(23,31,63,.07)',
      },
      keyframes: {
        apparition: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: { apparition: 'apparition .32s ease-out both' },
    },
  },
  plugins: [],
};
