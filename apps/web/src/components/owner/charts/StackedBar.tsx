import { cn } from '../../../lib/utils';
import type { OwnerMetricUnit, OwnerSeriesPoint } from '../../../lib/hooks/useOwner';
import { formatMetricValue } from '../format';
import { useChartTooltip } from './ChartTooltip';

export interface StackedBarProps {
  points: OwnerSeriesPoint[];
  unit?: OwnerMetricUnit;
  /** Affiche la part de chaque segment en pourcentage sous la barre. */
  showShares?: boolean;
  className?: string;
}

const PERCENT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

/**
 * Barre empilée à 100 % — vieillissement de la créance, statuts de paiement.
 *
 * Sa raison d'être est la **composition** : une créance de six millions ne dit
 * rien tant qu'on ignore si elle a trente jours ou trois ans. Empiler les
 * tranches sur une largeur commune rend cette composition lisible d'un coup
 * d'œil, là où quatre barres séparées obligeraient à faire l'addition de tête.
 *
 * L'ordre des points est celui de l'API — pour une ancienneté, l'ordre porte
 * le sens et ne doit jamais être trié par montant.
 */
export function StackedBar({ points, unit = 'currency', showShares, className }: StackedBarProps) {
  const { conteneur, montrer, cacher, infobulle } = useChartTooltip();
  const total = points.reduce((sum, point) => sum + (point.value ?? 0), 0);

  if (total === 0) {
    return <p className="ds-chart-note">Aucun montant à répartir.</p>;
  }

  return (
    <div className={cn('ds-stacked', className)} ref={conteneur} style={{ position: 'relative' }}>
      <div
        className="ds-stacked-track"
        role="img"
        aria-label={points
          .map(
            (point) =>
              `${point.label} : ${formatMetricValue(point.value, unit)} (${PERCENT.format(
                ((point.value ?? 0) / total) * 100,
              )} %)`,
          )
          .join(', ')}
      >
        {points.map((point, index) => {
          const share = (point.value ?? 0) / total;
          if (share <= 0) return null;
          return (
            <span
              key={point.key}
              className="ds-stacked-segment"
              style={{
                width: `${share * 100}%`,
                background: `var(--chart-${(index % 5) + 1})`,
              }}
              onMouseMove={(evenement) =>
                montrer(evenement, {
                  titre: point.label,
                  lignes: [
                    {
                      label: 'Montant',
                      valeur: formatMetricValue(point.value, unit),
                      couleur: `var(--chart-${(index % 5) + 1})`,
                    },
                    { label: 'Part', valeur: `${PERCENT.format(share * 100)} %` },
                  ],
                })
              }
              onMouseLeave={cacher}
            />
          );
        })}
      </div>

      {infobulle}

      <ul className="ds-stacked-legend">
        {points.map((point, index) => (
          <li key={point.key}>
            <span
              className="ds-donut-swatch"
              style={{ background: `var(--chart-${(index % 5) + 1})` }}
              aria-hidden
            />
            <span className="ds-donut-name">{point.label}</span>
            <strong>{formatMetricValue(point.value, unit)}</strong>
            {showShares && (
              <span className="ds-donut-count">
                {PERCENT.format(((point.value ?? 0) / total) * 100)} %
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
