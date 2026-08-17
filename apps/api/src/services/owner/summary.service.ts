import { getEnrollment } from './enrollment.service';
import { getStaff } from './staff.service';
import { getFinanceOverview } from './finance.service';
import { getSecondaryResults } from './results-secondary.service';
import { getPrimaryResults } from './results-primary.service';
import { getAttendance, getAttendanceConduct } from './attendance.service';
import { withYearCache } from './cache';
import { ALERT } from './thresholds';
import type { Metric } from './compare.helper';
import type { ResolvedYears } from './academic-year.helper';

/**
 * Synthèse de la page d'accueil — les dix KPI de §4.h et les points d'attention.
 *
 * **Rien n'est recalculé ici.** Chaque carte reprend l'indicateur produit par le
 * service de son domaine : la moyenne générale de l'accueil est *la même
 * fonction* que celle de l'écran Résultats, le recouvrement *la même* que celle
 * de l'écran Finance. Une page de synthèse qui recalculerait ses chiffres
 * finirait par en afficher d'autres que les écrans de détail — et c'est
 * précisément l'écran de synthèse qu'on croit sur parole.
 *
 * Le prix en est un coût : six agrégats de domaine pour une seule page. Ils
 * partent en parallèle, et le cache des années closes (§6.8) absorbe les
 * consultations répétées. L'année courante, elle, n'est jamais mise en cache :
 * ses chiffres bougent.
 */

export interface SummaryKpi {
  key: string;
  label: string;
  metric: Metric;
  /** Accent sémantique, dérivé des seuils de §4.h. */
  accent: 'role' | 'info' | 'success' | 'warning' | 'danger';
  /** Indicateur d'origine, pour tracer d'où vient le chiffre. */
  source: string;
}

export interface OwnerSummary {
  kpis: SummaryKpi[];
}

/** Accent d'un taux, du meilleur au pire, sur des bornes décroissantes. */
function accentByBands(
  value: number | null,
  bands: Array<{ min: number; accent: SummaryKpi['accent'] }>,
  fallback: SummaryKpi['accent'] = 'warning',
): SummaryKpi['accent'] {
  if (value === null) return 'info';
  return bands.find((band) => value >= band.min)?.accent ?? fallback;
}

export interface SummaryFilters {
  /** `L2` — classe observée. Absent = tout l'établissement. */
  classId?: string;
}

export async function getSummary(
  resolved: ResolvedYears,
  modules: { primary: boolean; secondary: boolean },
  filters: SummaryFilters = {},
): Promise<OwnerSummary> {
  const useSecondary = modules.secondary;

  // Le filtre de classe descend tel quel dans chaque domaine : la synthèse ne
  // sait pas filtrer, elle délègue — c'est ce qui garantit qu'une classe isolée
  // ici donne exactement les mêmes chiffres que sur l'écran de détail.
  //
  // Il entre aussi dans la clé de cache : sans lui, la première classe consultée
  // servirait ses agrégats à toutes les suivantes.
  const scope = filters.classId ? { classId: filters.classId } : {};

  // Les six agrégats partent ensemble : c'est la latence du plus lent qui
  // compte, pas leur somme.
  const [enrollment, staff, finance, secondary, primary, attendance, conduct] = await Promise.all([
    withYearCache('summary:enrollment', resolved.year, scope, () => getEnrollment(resolved, scope)),
    withYearCache('summary:staff', resolved.year, scope, () => getStaff(resolved, scope)),
    withYearCache('summary:finance', resolved.year, scope, () =>
      getFinanceOverview(resolved, scope),
    ),
    useSecondary
      ? withYearCache('summary:secondary', resolved.year, scope, () =>
          getSecondaryResults(resolved, scope),
        )
      : Promise.resolve(null),
    modules.primary
      ? withYearCache('summary:primary', resolved.year, scope, () =>
          getPrimaryResults(resolved, scope),
        )
      : Promise.resolve(null),
    useSecondary
      ? withYearCache('summary:attendance', resolved.year, scope, () =>
          getAttendance(resolved, scope),
        )
      : Promise.resolve(null),
    useSecondary
      ? withYearCache('summary:conduct', resolved.year, scope, () =>
          getAttendanceConduct(resolved, scope),
        )
      : Promise.resolve(null),
  ]);

  // --- Les cartes de synthèse (§4.h) -----------------------------------------
  //
  // Deux cartes ont été retirées à la demande : « Moyenne générale »
  // (SEC-01 / PRI-07) et « Compositions organisées » (PRI-01). Les indicateurs
  // restent calculés et lisibles sur leurs écrans de détail — seule leur
  // présence sur l'accueil disparaît.
  //
  // La grille n'est donc plus de dix cartes fixes : huit en primaire pur, neuf
  // dès que le module secondaire est ouvert (le taux de présence s'y ajoute).
  const kpis: SummaryKpi[] = [
    {
      key: 'students',
      label: 'Élèves inscrits',
      metric: enrollment.total,
      accent: 'role',
      source: 'EFF-01',
    },
    {
      key: 'newcomers',
      label: 'Nouveaux élèves',
      metric: enrollment.newcomers,
      accent: 'info',
      source: 'EFF-08',
    },
    {
      key: 'retention',
      label: 'Taux de réinscription',
      metric: enrollment.retentionRate,
      accent: accentByBands(enrollment.retentionRate.value, [
        { min: ALERT.retentionRate, accent: 'success' },
      ]),
      source: 'EFF-10',
    },
    {
      key: 'teachers',
      label: 'Enseignants',
      metric: staff.headcount,
      accent: 'role',
      source: 'ENS-01',
    },
    {
      key: 'collection',
      label: 'Taux de recouvrement',
      metric: finance.collectionRate,
      accent: accentByBands(
        finance.collectionRate.value,
        [
          { min: ALERT.collectionWarning, accent: 'success' },
          { min: ALERT.collectionRate, accent: 'warning' },
        ],
        'danger',
      ),
      source: 'FIN-04',
    },
    {
      key: 'outstanding',
      label: 'Impayés',
      metric: finance.outstanding,
      // Un impayé non nul mérite d'être vu ; un impayé inconnu, non.
      accent:
        finance.outstanding.value === null
          ? 'info'
          : finance.outstanding.value > 0
            ? 'danger'
            : 'success',
      source: 'FIN-03',
    },
    {
      key: 'revenue',
      label: "Chiffre d'affaires facturé",
      metric: finance.invoiced,
      accent: 'role',
      source: 'FIN-01',
    },
    // Le cycle décide de la source du taux de réussite (critère 8.3).
    useSecondary && secondary
      ? {
          key: 'success',
          label: 'Taux de réussite',
          metric: secondary.successRate,
          accent: accentByBands(secondary.successRate.value, [
            { min: ALERT.successRate, accent: 'success' },
          ]),
          source: 'SEC-11',
        }
      : {
          key: 'success',
          label: 'Taux de réussite',
          metric: primary?.successRate ?? emptyMetric('percent'),
          accent: accentByBands(primary?.successRate.value ?? null, [
            { min: ALERT.successRate, accent: 'success' },
          ]),
          source: 'PRI-09',
        },
  ];

  // La présence n'existe pas en primaire pur : faute de séances, il n'y a rien
  // à mesurer. La carte est alors simplement absente — mieux vaut une grille
  // plus courte qu'un indicateur de remplacement qui ne dit pas la même chose.
  if (useSecondary && attendance) {
    kpis.push({
      key: 'presence',
      label: 'Taux de présence',
      metric: attendance.presenceRate,
      accent: accentByBands(attendance.presenceRate.value, [
        { min: ALERT.presenceRate, accent: 'success' },
      ]),
      source: 'ASS-01',
    });
  }

  return { kpis };
}

/** Métrique vide — la carte existe, sa valeur est simplement inconnue. */
function emptyMetric(unit: Metric['unit']): Metric {
  return { value: null, previous: null, delta: null, deltaPct: null, unit };
}

const AMOUNT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

function formatAmount(value: number): string {
  return `${AMOUNT.format(value)} FCFA`;
}
