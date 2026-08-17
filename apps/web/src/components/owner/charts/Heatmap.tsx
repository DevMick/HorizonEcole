import { cn } from '../../../lib/utils';
import { useChartTooltip } from './ChartTooltip';

export interface HeatmapProps {
  /** Libellés de lignes — les jours ouvrés. */
  rows: string[];
  /** Libellés de colonnes — les créneaux horaires. */
  columns: string[];
  /** `cells[ligne][colonne]` : valeur observée. */
  cells: number[][];
  max: number;
  /** Unité, affichée dans l'infobulle. */
  unit?: string;
  className?: string;
}

/**
 * Carte de chaleur jour × créneau.
 *
 * Une grille d'occupation ne se lit pas en barres : la question du directeur
 * n'est pas « combien de salles sont occupées » mais « **quand** le sont-elles »
 * — les creux du mercredi après-midi et les pointes du lundi matin ne se voient
 * que sur deux dimensions.
 *
 * L'intensité seule ne suffit pas à porter l'information : chaque cellule
 * affiche aussi sa valeur, et son infobulle nomme le croisement. Une carte
 * lisible uniquement par la couleur exclurait les daltoniens et deviendrait
 * illisible à l'impression.
 */
export function Heatmap({ rows, columns, cells, max, unit = 'salles', className }: HeatmapProps) {
  const { conteneur, montrer, cacher, infobulle } = useChartTooltip();

  if (rows.length === 0 || columns.length === 0) {
    return <p className="ds-chart-note">Aucun créneau horaire déclaré.</p>;
  }

  return (
    <div className={cn('ds-heatmap-wrap', className)} ref={conteneur} style={{ position: 'relative' }}>
      <table className="ds-heatmap">
        <thead>
          <tr>
            <th />
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row}>
              <th scope="row">{row}</th>
              {columns.map((column, columnIndex) => {
                const value = cells[rowIndex]?.[columnIndex] ?? 0;
                const intensity = max > 0 ? value / max : 0;
                return (
                  <td
                    key={column}
                    className="ds-heatmap-cell"
                    // L'opacité porte l'intensité ; le texte porte la valeur.
                    style={{ ['--ds-heat' as string]: String(intensity) }}
                    onMouseMove={(evenement) =>
                      montrer(evenement, {
                        titre: `${row} · ${column}`,
                        lignes: [
                          { label: unit.charAt(0).toUpperCase() + unit.slice(1), valeur: String(value) },
                          {
                            label: 'Occupation',
                            valeur: max > 0 ? `${Math.round(intensity * 100)} %` : '—',
                          },
                        ],
                      })
                    }
                    onMouseLeave={cacher}
                  >
                    <span>{value || ''}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {infobulle}
    </div>
  );
}
