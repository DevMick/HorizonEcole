import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { OwnerMetricUnit } from '../../lib/hooks/useOwner';
import { formatMetricDelta, formatPercentMagnitude } from './format';

export interface DeltaBadgeProps {
  /** Écart absolu N − N-1. `null` = pas de comparaison possible. */
  delta: number | null;
  /** Écart relatif (0,042 = +4,2 %). `null` si l'année précédente vaut 0. */
  deltaPct?: number | null;
  unit?: OwnerMetricUnit;
  /**
   * Sens de lecture. Pour un taux d'absence ou un impayé, une hausse est une
   * mauvaise nouvelle : la couleur doit suivre le sens métier, pas le signe.
   */
  polarity?: 'higher-is-better' | 'lower-is-better' | 'neutral';
  className?: string;
}

/**
 * Écart par rapport à l'année de comparaison (§4.0).
 *
 * Renvoie `null` quand la comparaison n'a pas de sens — première année de
 * l'établissement, ou aucune année de comparaison choisie. **Un écart inconnu
 * ne s'affiche pas à zéro** : un « = » laisserait croire à une stabilité qui
 * n'a jamais été mesurée.
 */
export function DeltaBadge({
  delta,
  deltaPct,
  unit = 'count',
  polarity = 'higher-is-better',
  className,
}: DeltaBadgeProps) {
  if (delta === null || delta === undefined) return null;

  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const good =
    polarity === 'neutral' || direction === 'flat'
      ? null
      : polarity === 'higher-is-better'
        ? direction === 'up'
        : direction === 'down';

  const Icon = direction === 'up' ? ArrowUp : direction === 'down' ? ArrowDown : Minus;

  return (
    <span
      className={cn(
        'ds-delta',
        good === true && 'ds-delta-good',
        good === false && 'ds-delta-bad',
        direction === 'flat' && 'ds-delta-flat',
        className,
      )}
      title={`Écart avec l'année de comparaison`}
    >
      <Icon width={12} height={12} aria-hidden />
      {direction === 'flat' ? '=' : formatMetricDelta(delta, unit)}
      {deltaPct !== null && deltaPct !== undefined && direction !== 'flat' && (
        <span className="ds-delta-pct">
          ({delta > 0 ? '+' : '−'}
          {formatPercentMagnitude(deltaPct)} %)
        </span>
      )}
    </span>
  );
}
