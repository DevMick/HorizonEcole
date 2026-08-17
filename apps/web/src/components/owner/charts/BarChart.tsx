import { cn } from '../../../lib/utils';
import type { OwnerMetricUnit, OwnerSeriesPoint } from '../../../lib/hooks/useOwner';
import { formatMetricValue } from '../format';

export interface BarChartProps {
  points: OwnerSeriesPoint[];
  unit?: OwnerMetricUnit;
  /** Affiche une barre fantôme pour l'année de comparaison. */
  showPrevious?: boolean;
  /** Nombre maximal de barres affichées ; le reste est signalé sous le graphique. */
  limit?: number;
  className?: string;
}

/**
 * Barres horizontales, en CSS plutôt qu'en SVG.
 *
 * Le choix est délibéré : une barre horizontale est un rectangle dont la
 * largeur est un pourcentage, ce que CSS fait nativement et de façon
 * responsive. Passer par SVG imposerait de gérer à la main le retour à la ligne
 * des libellés et la mise à l'échelle du texte, pour un résultat moins net.
 * Les formes qui exigent réellement de la géométrie — donut, histogramme,
 * courbe — sont, elles, en SVG.
 *
 * L'échelle est commune à toutes les barres et part de zéro : une barre dont
 * l'origine flotte exagère visuellement des écarts minimes.
 */
export function BarChart({ points, unit = 'count', showPrevious, limit, className }: BarChartProps) {
  const shown = limit ? points.slice(0, limit) : points;
  const hidden = points.length - shown.length;

  const max = Math.max(
    1,
    ...points.map((point) => Math.max(point.value ?? 0, showPrevious ? point.previous ?? 0 : 0)),
  );

  return (
    <div className={cn('ds-bars', className)}>
      {shown.map((point) => {
        const value = point.value ?? 0;
        return (
          <div key={point.key} className="ds-bar-row">
            <span className="ds-bar-label" title={point.label}>
              {point.label}
            </span>
            <span className="ds-bar-track">
              <span className="ds-bar-fill" style={{ width: `${(value / max) * 100}%` }} />
              {showPrevious && point.previous !== null && point.previous !== undefined && (
                <span
                  className="ds-bar-ghost"
                  style={{ width: `${((point.previous ?? 0) / max) * 100}%` }}
                  title={`Année de comparaison : ${formatMetricValue(point.previous, unit)}`}
                />
              )}
            </span>
            <span className="ds-bar-value">{formatMetricValue(point.value, unit)}</span>
          </div>
        );
      })}
      {hidden > 0 && (
        <p className="ds-chart-note">{hidden} entrée{hidden > 1 ? 's' : ''} non affichée{hidden > 1 ? 's' : ''}.</p>
      )}
    </div>
  );
}
