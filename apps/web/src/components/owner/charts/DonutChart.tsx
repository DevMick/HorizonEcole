import { cn } from '../../../lib/utils';
import type { OwnerMetricUnit, OwnerSeriesPoint } from '../../../lib/hooks/useOwner';
import { formatMetricValue } from '../format';
import { useChartTooltip } from './ChartTooltip';

export interface DonutChartProps {
  points: OwnerSeriesPoint[];
  /** Libellé du centre — le total, en général. */
  centerLabel?: string;
  centerValue?: string;
  /**
   * Unité des valeurs. Sans elle, un donut financier affichait « 3750000 » là
   * où le reste de l'écran écrit « 3 750 000 FCFA ».
   */
  unit?: OwnerMetricUnit;
  /** Rappel de la répartition de l'année de comparaison, sous la légende. */
  previousCaption?: string;
  className?: string;
}

const SIZE = 180;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const PERCENT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

/**
 * Donut en SVG, tracé par `stroke-dasharray` sur un cercle unique.
 *
 * Chaque part est un arc dont la longueur vaut sa fraction du périmètre. Le
 * procédé évite de calculer des chemins `A` (arcs de Bézier) à la main, dont
 * les cas limites — une part à 100 %, une part à 0 % — produisent des tracés
 * dégénérés difficiles à déboguer.
 */
export function DonutChart({
  points,
  centerLabel,
  centerValue,
  unit = 'count',
  previousCaption,
  className,
}: DonutChartProps) {
  const { conteneur, montrer, cacher, infobulle } = useChartTooltip();
  const total = points.reduce((sum, point) => sum + (point.value ?? 0), 0);

  if (total === 0) {
    return <p className="ds-chart-note">Aucune donnée à répartir.</p>;
  }

  let offset = 0;
  const arcs = points.map((point, index) => {
    const share = (point.value ?? 0) / total;
    const arc = {
      key: point.key,
      label: point.label,
      value: point.value ?? 0,
      share,
      color: `var(--chart-${(index % 5) + 1})`,
      dash: share * CIRCUMFERENCE,
      offset,
    };
    offset += arc.dash;
    return arc;
  });

  return (
    <div className={cn('ds-donut', className)} ref={conteneur} style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
        height={SIZE}
        role="img"
        aria-label={`Répartition : ${arcs
          .map((arc) => `${arc.label} ${PERCENT.format(arc.share * 100)} %`)
          .join(', ')}`}
      >
        {/* Rotation d'un quart de tour : le premier arc démarre en haut, là où
            l'œil commence naturellement sa lecture. */}
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {arcs.map((arc) => (
            <circle
              key={arc.key}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={arc.color}
              strokeWidth={STROKE}
              strokeDasharray={`${arc.dash} ${CIRCUMFERENCE - arc.dash}`}
              strokeDashoffset={-arc.offset}
              // L'arc lui-même porte le survol : son épaisseur de 26 px en fait
              // une cible confortable, sans zone invisible à superposer.
              onMouseMove={(evenement) =>
                montrer(evenement, {
                  titre: arc.label,
                  lignes: [
                    {
                      label: unit === 'currency' ? 'Montant' : 'Effectif',
                      valeur: formatMetricValue(arc.value, unit),
                      couleur: arc.color,
                    },
                    { label: 'Part', valeur: `${PERCENT.format(arc.share * 100)} %` },
                  ],
                })
              }
              onMouseLeave={cacher}
            />
          ))}
        </g>
        {centerValue && (
          <text x={SIZE / 2} y={SIZE / 2 - 2} className="ds-donut-value" textAnchor="middle">
            {centerValue}
          </text>
        )}
        {centerLabel && (
          <text x={SIZE / 2} y={SIZE / 2 + 16} className="ds-donut-label" textAnchor="middle">
            {centerLabel}
          </text>
        )}
      </svg>

      {infobulle}

      <ul className="ds-donut-legend">
        {arcs.map((arc) => (
          <li key={arc.key}>
            <span className="ds-donut-swatch" style={{ background: arc.color }} aria-hidden />
            <span className="ds-donut-name">{arc.label}</span>
            <strong>{PERCENT.format(arc.share * 100)} %</strong>
            <span className="ds-donut-count">{formatMetricValue(arc.value, unit)}</span>
          </li>
        ))}
        {previousCaption && <li className="ds-chart-note">{previousCaption}</li>}
      </ul>
    </div>
  );
}
