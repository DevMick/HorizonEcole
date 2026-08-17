import { cn } from '../../../lib/utils';
import type { OwnerMetricUnit, OwnerSeriesPoint } from '../../../lib/hooks/useOwner';
import { formatMetricValue } from '../format';
import { useChartTooltip } from './ChartTooltip';

export interface LineSeries {
  key: string;
  label: string;
  points: OwnerSeriesPoint[];
}

export interface LineChartProps {
  series: LineSeries[];
  /** Unité des valeurs, pour l'infobulle : effectif, montant, pourcentage… */
  unit?: OwnerMetricUnit;
  className?: string;
}

const WIDTH = 560;
const HEIGHT = 200;
const PADDING = { top: 14, right: 14, bottom: 28, left: 40 };

/**
 * Courbe multi-séries en SVG — évolution pluriannuelle (`EFF-14`).
 *
 * Deux partis pris de lecture :
 *
 *  - l'axe des ordonnées **part de zéro**. Cadrer sur l'amplitude des données
 *    ferait passer une variation de 2 % pour un effondrement ;
 *  - un point à `null` **interrompt** la ligne au lieu d'être relié. Sur la
 *    série des nouveaux élèves, la première année n'a pas d'antécédent : la
 *    valeur est inconnue, et une ligne continue affirmerait une mesure qui
 *    n'existe pas.
 */
/**
 * Graduation de l'axe des ordonnées.
 *
 * Un montant en francs CFA s'écrit vite sur sept chiffres : posé tel quel le
 * long de l'axe, « 8750000 » déborde sur le tracé et ne se lit pas. On abrège
 * donc en milliers et en millions, comme le ferait une main sur un tableau.
 * Les autres unités gardent leur valeur : une moyenne sur 20 ou un effectif de
 * classe tiennent en deux chiffres.
 */
function graduation(value: number, unit: OwnerMetricUnit): string {
  if (unit !== 'currency') return String(Math.round(value));
  if (Math.abs(value) >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${millions.toFixed(millions >= 10 ? 0 : 1).replace('.', ',')} M`;
  }
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)} k`;
  return String(Math.round(value));
}

export function LineChart({ series, unit = 'count', className }: LineChartProps) {
  const { conteneur, montrer, cacher, infobulle } = useChartTooltip();

  const allPoints = series.flatMap((line) => line.points);
  if (allPoints.length === 0) {
    return <p className="ds-chart-note">Aucune donnée à représenter.</p>;
  }

  /**
   * Une courbe suppose deux points au moins. Avec une seule année en base, les
   * graphiques pluriannuels affichaient un point isolé au milieu du cadre :
   * l'espace d'un graphique pour une information qu'une phrase porte mieux.
   * Le graphique revient de lui-même dès qu'une seconde mesure existe.
   */
  const mesuresMax = Math.max(
    ...series.map((line) => line.points.filter((point) => point.value !== null && point.value !== undefined).length),
  );
  if (mesuresMax < 2) {
    const seule = allPoints.find((point) => point.value !== null && point.value !== undefined);
    return (
      <p className="ds-chart-note">
        {seule
          ? `Une seule mesure disponible (${seule.label}) : l’évolution apparaîtra dès la période suivante.`
          : 'Pas encore de mesure sur cette période.'}
      </p>
    );
  }

  const max = Math.max(1, ...allPoints.map((point) => point.value ?? 0));
  const labels = series[0]?.points.map((point) => point.label) ?? [];
  const count = Math.max(1, labels.length);

  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const xOf = (index: number) =>
    PADDING.left + (count === 1 ? plotWidth / 2 : (index / (count - 1)) * plotWidth);
  const yOf = (value: number) => PADDING.top + plotHeight - (value / max) * plotHeight;

  /** Découpe la série en segments continus, séparés par les valeurs inconnues. */
  const segmentsOf = (points: OwnerSeriesPoint[]) => {
    const segments: { x: number; y: number }[][] = [];
    let current: { x: number; y: number }[] = [];
    points.forEach((point, index) => {
      if (point.value === null || point.value === undefined) {
        if (current.length) segments.push(current);
        current = [];
        return;
      }
      current.push({ x: xOf(index), y: yOf(point.value) });
    });
    if (current.length) segments.push(current);
    return segments;
  };

  const gridValues = [0, max / 2, max];

  /** Bande verticale de survol : toute la hauteur, à la largeur d'un intervalle. */
  const largeurBande = count === 1 ? plotWidth : plotWidth / (count - 1);

  return (
    <div className={cn('ds-linechart', className)} ref={conteneur} style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={series
          .map(
            (line) =>
              `${line.label} : ${line.points
                .map((point) => `${point.label} ${point.value ?? 'non mesuré'}`)
                .join(', ')}`,
          )
          .join(' — ')}
      >
        {gridValues.map((value) => (
          <g key={value}>
            <line
              x1={PADDING.left}
              y1={yOf(value)}
              x2={WIDTH - PADDING.right}
              y2={yOf(value)}
              className="ds-chart-grid"
            />
            <text x={PADDING.left - 6} y={yOf(value) + 4} textAnchor="end" className="ds-chart-tick">
              {graduation(value, unit)}
            </text>
          </g>
        ))}

        {series.map((line, lineIndex) => (
          <g key={line.key} style={{ color: `var(--chart-${(lineIndex % 5) + 1})` }}>
            {segmentsOf(line.points).map((segment, index) => (
              <polyline
                key={index}
                className="ds-line"
                points={segment.map((point) => `${point.x},${point.y}`).join(' ')}
              />
            ))}
            {line.points.map((point, index) =>
              point.value === null || point.value === undefined ? null : (
                <circle
                  key={point.key}
                  cx={xOf(index)}
                  cy={yOf(point.value)}
                  r={3.5}
                  className="ds-line-dot"
                />
              ),
            )}
          </g>
        ))}

        {labels.map((label, index) => (
          <text
            key={label + index}
            x={xOf(index)}
            y={HEIGHT - 8}
            textAnchor="middle"
            className="ds-chart-tick"
          >
            {label}
          </text>
        ))}

        {/* Zones de survol, posées en dernier pour capter le pointeur. Une
            bande par abscisse, sur toute la hauteur : viser un point de 3,5 px
            était impossible, viser une colonne l'est toujours. */}
        {labels.map((label, index) => (
          <rect
            key={`zone-${label}-${index}`}
            x={xOf(index) - largeurBande / 2}
            y={PADDING.top}
            width={largeurBande}
            height={plotHeight}
            fill="transparent"
            onMouseMove={(evenement) =>
              montrer(evenement, {
                titre: label,
                lignes: series.map((line, lineIndex) => ({
                  label: line.label,
                  valeur:
                    line.points[index]?.value === null || line.points[index]?.value === undefined
                      ? 'non mesuré'
                      : formatMetricValue(line.points[index].value, unit),
                  couleur: `var(--chart-${(lineIndex % 5) + 1})`,
                })),
              })
            }
            onMouseLeave={cacher}
          />
        ))}
      </svg>

      {infobulle}

      <ul className="ds-chart-legend">
        {series.map((line, index) => (
          <li key={line.key}>
            <span
              className="ds-donut-swatch"
              style={{ background: `var(--chart-${(index % 5) + 1})` }}
              aria-hidden
            />
            {line.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
