import { cn } from '../../../lib/utils';
import type { OwnerSeriesPoint } from '../../../lib/hooks/useOwner';
import { useChartTooltip } from './ChartTooltip';

export interface HistogramProps {
  points: OwnerSeriesPoint[];
  /** Libellé de l'axe des abscisses, en toutes lettres. */
  xLabel?: string;
  /** Nom de ce que l'on compte, affiché dans l'infobulle. */
  countLabel?: string;
  className?: string;
}

const WIDTH = 560;
const HEIGHT = 180;
const PADDING = { top: 12, right: 8, bottom: 26, left: 8 };

/**
 * Histogramme vertical en SVG — distribution des âges (`EFF-06`).
 *
 * L'ordre des points est celui que renvoie l'API : un histogramme se lit dans
 * l'ordre de sa variable, jamais trié par fréquence. Trier par effectif
 * décroissant, comme pour un classement, détruirait précisément l'information
 * qu'une distribution porte — sa forme.
 */
export function Histogram({ points, xLabel, countLabel = 'Effectif', className }: HistogramProps) {
  const { conteneur, montrer, cacher, infobulle } = useChartTooltip();

  if (points.length === 0) {
    return <p className="ds-chart-note">Aucune donnée à représenter.</p>;
  }

  const max = Math.max(1, ...points.map((point) => point.value ?? 0));
  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const slot = plotWidth / points.length;
  const barWidth = Math.max(4, slot * 0.62);

  const total = points.reduce((somme, point) => somme + (point.value ?? 0), 0);

  return (
    <div className={cn('ds-histogram', className)} ref={conteneur} style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Distribution${xLabel ? ` par ${xLabel}` : ''} : ${points
          .map((point) => `${point.label} : ${point.value ?? 0}`)
          .join(', ')}`}
      >
        <line
          x1={PADDING.left}
          y1={PADDING.top + plotHeight}
          x2={WIDTH - PADDING.right}
          y2={PADDING.top + plotHeight}
          className="ds-chart-axis"
        />
        {points.map((point, index) => {
          const value = point.value ?? 0;
          const height = (value / max) * plotHeight;
          const x = PADDING.left + index * slot + (slot - barWidth) / 2;
          const y = PADDING.top + plotHeight - height;
          return (
            <g key={point.key}>
              <rect x={x} y={y} width={barWidth} height={height} rx={3} className="ds-histogram-bar" />
              {/* Colonne de survol pleine hauteur : la barre d'une valeur
                  faible ne fait que quelques pixels et serait invisable. */}
              <rect
                x={PADDING.left + index * slot}
                y={PADDING.top}
                width={slot}
                height={plotHeight}
                fill="transparent"
                onMouseMove={(evenement) =>
                  montrer(evenement, {
                    titre: point.label,
                    lignes: [
                      { label: countLabel, valeur: String(value) },
                      {
                        label: 'Part',
                        valeur: total > 0 ? `${Math.round((value / total) * 100)} %` : '—',
                      },
                    ],
                  })
                }
                onMouseLeave={cacher}
              />
              {/* Un libellé sur deux au-delà de douze colonnes : au-delà, ils se
                  chevauchent et deviennent illisibles. */}
              {(points.length <= 12 || index % 2 === 0) && (
                <text
                  x={x + barWidth / 2}
                  y={HEIGHT - 8}
                  textAnchor="middle"
                  className="ds-chart-tick"
                >
                  {point.label.replace(' ans', '')}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {infobulle}
      {xLabel && <p className="ds-chart-note">{xLabel}</p>}
    </div>
  );
}
