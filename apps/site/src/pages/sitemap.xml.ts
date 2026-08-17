import type { APIRoute } from 'astro';
import { CYCLES } from '@/lib/pricing';

/**
 * Sitemap généré explicitement.
 *
 * L'application vit sous /app/ : elle est authentifiée et ne doit apparaître ni
 * ici ni dans robots.txt en Allow. L'énumération est manuelle plutôt que
 * déduite du système de fichiers, précisément pour qu'aucune route ne s'y
 * glisse par accident.
 */
const ROUTES: { chemin: string; priorite: string }[] = [
  { chemin: '/', priorite: '1.0' },
  { chemin: '/tarifs', priorite: '0.9' },
  // Le périmètre fonctionnel tient sur une page unique : les anciennes
  // sous-pages n'existent plus, seules des ancres les remplacent.
  { chemin: '/fonctionnalites', priorite: '0.9' },
  // Les trois cycles tiennent également sur une page unique, en ancres.
  { chemin: '/cycles', priorite: '0.8' },
  { chemin: '/accompagnement', priorite: '0.7' },
  { chemin: '/securite', priorite: '0.7' },
  { chemin: '/demonstration', priorite: '0.9' },
  { chemin: '/devis', priorite: '0.8' },
  { chemin: '/contact', priorite: '0.6' },
  { chemin: '/a-propos', priorite: '0.5' },
  { chemin: '/confidentialite', priorite: '0.2' },
];

export const GET: APIRoute = ({ site }) => {
  const base = (site ?? new URL('https://horizonecole.com')).origin;
  const urls = ROUTES.map(
    ({ chemin, priorite }) =>
      `  <url>\n    <loc>${base}${chemin}</loc>\n    <priority>${priorite}</priority>\n  </url>`,
  ).join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
