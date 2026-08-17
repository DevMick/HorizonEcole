import type { OwnerMetricUnit } from '../../lib/hooks/useOwner';

/**
 * Formatage des valeurs de l'espace Propriétaire.
 *
 * Regroupé ici pour que la valeur d'un KPI et l'écart affiché juste en dessous
 * soient rendus par le même code : une stat-card qui arrondirait autrement que
 * son badge d'écart donnerait des sommes qui ne tombent pas juste à l'œil.
 */

const INTEGER = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const DECIMAL = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
const PERCENT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
const DELTA = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

/** Valeur d'un indicateur. `null` rend un tiret : la donnée est absente, pas nulle. */
export function formatMetricValue(value: number | null, unit: OwnerMetricUnit): string {
  if (value === null || value === undefined) return '—';

  switch (unit) {
    case 'percent':
      return `${PERCENT.format(value * 100)} %`;
    case 'currency':
      return `${INTEGER.format(value)} FCFA`;
    case 'grade':
      return DECIMAL.format(value);
    case 'hours':
      return `${DECIMAL.format(value)} h`;
    case 'days':
      return `${INTEGER.format(value)} j`;
    default:
      // Un dénombrement est entier ; une moyenne de dénombrements ne l'est pas.
      // Arrondir « 38,3 élèves par classe » à 38 effacerait justement la
      // décimale qui distingue une classe pleine d'une classe en tension.
      return Number.isInteger(value) ? INTEGER.format(value) : DELTA.format(value);
  }
}

/** Écart absolu, signé. Un taux s'exprime en points, pas en pourcentage d'un pourcentage. */
export function formatMetricDelta(delta: number, unit: OwnerMetricUnit): string {
  const sign = delta > 0 ? '+' : '−';
  const magnitude = Math.abs(delta);

  switch (unit) {
    case 'percent':
      return `${sign}${DELTA.format(magnitude * 100)} pts`;
    case 'currency':
      return `${sign}${DELTA.format(magnitude)} FCFA`;
    case 'hours':
      return `${sign}${DELTA.format(magnitude)} h`;
    case 'days':
      return `${sign}${DELTA.format(magnitude)} j`;
    default:
      return `${sign}${DELTA.format(magnitude)}`;
  }
}

/**
 * Nombre décimal en français, deux décimales au plus.
 *
 * Deux et pas une : une moyenne se lit au centième — c'est la précision à
 * laquelle deux classes se départagent, et celle qu'imprime le bulletin.
 */
export function formatDecimal(value: number | null): string {
  return value === null || value === undefined ? '—' : DECIMAL.format(value);
}

/** Écart relatif, sans signe : le sens est déjà porté par la flèche et la couleur. */
export function formatPercentMagnitude(ratio: number): string {
  return PERCENT.format(Math.abs(ratio) * 100);
}
