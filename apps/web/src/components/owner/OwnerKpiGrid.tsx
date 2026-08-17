import type { LucideIcon } from 'lucide-react';
import { Card, Skeleton } from '../ds';
import { cn } from '../../lib/utils';
import type { OwnerMetric } from '../../lib/hooks/useOwner';
import { DeltaBadge } from './DeltaBadge';
import { formatMetricValue } from './format';

export interface OwnerKpi {
  key: string;
  label: string;
  icon: LucideIcon;
  metric?: OwnerMetric | null;
  polarity?: 'higher-is-better' | 'lower-is-better' | 'neutral';
}

export interface OwnerKpiGridProps {
  kpis: OwnerKpi[];
  loading?: boolean;
  /** Nombre de colonnes ; trois cartes remplissent ainsi la largeur. */
  columns?: number;
  className?: string;
}

/** Hauteur d'une stat-card — le squelette doit occuper exactement sa place. */
const STAT_HEIGHT = 92;

/**
 * Grille de KPI avec écart N vs N-1, bâtie sur `.ds-stat-grid` — la même
 * grille que le tableau de bord, pour que les deux espaces respirent pareil.
 *
 * Pendant le chargement, des squelettes aux dimensions finales : jamais de
 * spinner plein écran, qui ferait sauter la mise en page à l'arrivée des
 * données (§5.7).
 */
export function OwnerKpiGrid({ kpis, loading, columns = 4, className }: OwnerKpiGridProps) {
  return (
    <div
      className={cn('ds-stat-grid', className)}
      style={{ ['--ds-stat-cols' as string]: String(columns) }}
    >
      {loading
        ? kpis.map((kpi) => <Skeleton key={kpi.key} height={STAT_HEIGHT} className="rounded-lg" />)
        : kpis.map((kpi) => {
            const Icon = kpi.icon;
            const metric = kpi.metric ?? null;
            return (
              <Card key={kpi.key} accent className="ds-stat">
                <div className="ds-stat-body">
                  <span className="ds-stat-label">{kpi.label}</span>
                  <span className="ds-stat-value">
                    {formatMetricValue(metric?.value ?? null, metric?.unit ?? 'count')}
                  </span>
                  <DeltaBadge
                    delta={metric?.delta ?? null}
                    deltaPct={metric?.deltaPct ?? null}
                    unit={metric?.unit ?? 'count'}
                    polarity={kpi.polarity}
                  />
                </div>
                <span className="ds-stat-medallion" aria-hidden>
                  <Icon width={20} height={20} />
                </span>
              </Card>
            );
          })}
    </div>
  );
}
