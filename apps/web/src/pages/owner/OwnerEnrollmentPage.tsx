import { useEffect, useMemo, useRef, useState } from 'react';
import { Select } from 'antd';
import { LogOut, TrendingUp, UserPlus, Users } from 'lucide-react';

import {
  BarChart,
  DeltaBadge,
  DonutChart,
  Histogram,
  LineChart,
  OwnerEmptyState,
  OwnerKpiGrid,
  OwnerPage,
  OwnerSection,
  formatDecimal,
  formatMetricValue,
} from '../../components/owner';
import { Skeleton, StatusBadge } from '../../components/ds';
import {
  useOwnerEnrollment,
  useOwnerEnrollmentTimeline,
  type OwnerClassRow,
  type OwnerEnrollmentFilters,
} from '../../lib/hooks/useOwner';

const ALL = '';

const OCCUPANCY_LABEL: Record<OwnerClassRow['status'], { label: string; status: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  ok: { label: 'Équilibrée', status: 'success' },
  overcrowded: { label: 'Surcharge', status: 'danger' },
  underused: { label: 'Sous-effectif', status: 'warning' },
  unknown: { label: 'Capacité inconnue', status: 'neutral' },
};

/**
 * Effectifs & scolarité (`EFF-01` → `EFF-18`).
 *
 * Toutes les valeurs viennent de `GET /api/owner/enrollment`, agrégées côté
 * serveur : la page ne recalcule rien. C'est délibéré — un total recalculé
 * dans le navigateur finirait tôt ou tard par diverger de celui du serveur,
 * et deux vérités valent moins qu'une.
 */
export default function OwnerEnrollmentPage() {
  const [filters, setFilters] = useState<OwnerEnrollmentFilters>({});
  const { data, isLoading, isError, refetch } = useOwnerEnrollment(filters);
  const timeline = useOwnerEnrollmentTimeline(5);

  const enrollment = data?.data;

  // Les listes de filtres sont mémorisées à leur état le plus large. Sans cela,
  // filtrer sur « 6e » retirerait les autres niveaux du sélecteur — et on ne
  // pourrait plus en sortir sans repasser par « Tous ».
  const options = useRef<{ levels: string[]; classes: { id: string; name: string }[]; genders: string[] }>({
    levels: [],
    classes: [],
    genders: [],
  });

  useEffect(() => {
    if (!enrollment) return;
    const noFilter = !filters.level && !filters.classId && !filters.gender;
    if (!noFilter && options.current.levels.length > 0) return;

    options.current = {
      levels: enrollment.byLevel.points.map((point) => point.key),
      classes: enrollment.byClass.rows.map((row) => ({ id: row.classId, name: row.name })),
      genders: enrollment.byGender.points.map((point) => point.key),
    };
  }, [enrollment, filters]);

  const kpis = useMemo(
    () => [
      { key: 'total', label: 'Inscrits', icon: Users, metric: enrollment?.total },
      { key: 'newcomers', label: 'Nouveaux', icon: UserPlus, metric: enrollment?.newcomers },
      {
        key: 'departures',
        label: 'Départs',
        icon: LogOut,
        metric: enrollment?.departures,
        polarity: 'lower-is-better' as const,
      },
      {
        key: 'averagePerClass',
        label: 'Effectif moyen / classe',
        icon: TrendingUp,
        metric: enrollment?.averagePerClass,
        polarity: 'neutral' as const,
      },
    ],
    [enrollment],
  );

  if (isError) {
    return (
      <OwnerPage title="Effectifs">
        <OwnerEmptyState
          variant="danger"
          title="Impossible de charger les effectifs"
          description="La lecture des inscriptions a échoué. Vérifiez votre connexion, puis réessayez."
          action={{ label: 'Réessayer', onClick: () => refetch() }}
        />
      </OwnerPage>
    );
  }

  const setFilter = (key: keyof OwnerEnrollmentFilters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value === ALL ? undefined : value }));

  return (
    <OwnerPage title="Effectifs" subtitle="Inscriptions, répartition et fidélisation">
      <div className="ds-owner-filters">
        <label className="ds-owner-year-field">
          <span>Niveau</span>
          <Select
            size="small"
            style={{ minWidth: 130 }}
            value={filters.level ?? ALL}
            onChange={(value) => setFilter('level', value)}
            options={[
              { value: ALL, label: 'Tous' },
              ...options.current.levels.map((level) => ({ value: level, label: level })),
            ]}
            aria-label="Filtrer par niveau"
          />
        </label>
        <label className="ds-owner-year-field">
          <span>Classe</span>
          <Select
            size="small"
            style={{ minWidth: 140 }}
            value={filters.classId ?? ALL}
            onChange={(value) => setFilter('classId', value)}
            options={[
              { value: ALL, label: 'Toutes' },
              ...options.current.classes.map((row) => ({ value: row.id, label: row.name })),
            ]}
            aria-label="Filtrer par classe"
          />
        </label>
        <label className="ds-owner-year-field">
          <span>Sexe</span>
          <Select
            size="small"
            style={{ minWidth: 110 }}
            value={filters.gender ?? ALL}
            onChange={(value) => setFilter('gender', value)}
            options={[
              { value: ALL, label: 'Tous' },
              ...options.current.genders.map((gender) => ({ value: gender, label: gender })),
            ]}
            aria-label="Filtrer par sexe"
          />
        </label>
      </div>

      <OwnerKpiGrid kpis={kpis} loading={isLoading} />

      <div className="grid gap-4 lg:grid-cols-2">
        <OwnerSection
          title="Effectif par niveau"
          subtitle="Le filet sous chaque barre situe l'année de comparaison."
        >
          {isLoading || !enrollment ? (
            <Skeleton height={160} className="rounded-lg" />
          ) : enrollment.byLevel.points.length === 0 ? (
            <OwnerEmptyState title="Aucune inscription sur cette année." />
          ) : (
            <BarChart points={enrollment.byLevel.points} showPrevious />
          )}
        </OwnerSection>

        <OwnerSection title="Répartition par sexe" subtitle="Part des filles et des garçons inscrits.">
          {isLoading || !enrollment ? (
            <Skeleton height={160} className="rounded-lg" />
          ) : (
            <DonutChart
              points={enrollment.byGender.points}
              centerLabel="inscrits"
              centerValue={formatMetricValue(enrollment.total.value, 'count')}
              previousCaption={
                enrollment.byGender.points.some((point) => point.previous !== null)
                  ? `Comparaison : ${enrollment.byGender.points
                      .map((point) => `${point.label} ${point.previous ?? 0}`)
                      .join(' · ')}`
                  : undefined
              }
            />
          )}
        </OwnerSection>
      </div>

      <OwnerSection
        title="Nouveaux et réinscrits par niveau"
        subtitle="La part sombre représente les élèves déjà présents l'an dernier."
      >
        {isLoading || !enrollment ? (
          <Skeleton height={140} className="rounded-lg" />
        ) : (
          <div className="ds-bars">
            {enrollment.byLevel.points.map((point) => {
              const total = Math.max(1, point.newcomers + point.returning);
              return (
                <div key={point.key} className="ds-bar-row">
                  <span className="ds-bar-label">{point.label}</span>
                  <span className="ds-bar-track ds-split">
                    <span
                      className="ds-split-new"
                      style={{ width: `${(point.newcomers / total) * 100}%` }}
                      title={`${point.newcomers} nouveaux`}
                    />
                    <span
                      className="ds-split-returning"
                      style={{ width: `${(point.returning / total) * 100}%` }}
                      title={`${point.returning} réinscrits`}
                    />
                  </span>
                  <span className="ds-bar-value">
                    N {point.newcomers} · R {point.returning}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </OwnerSection>

      <OwnerSection
        title="Détail par classe"
        subtitle="Effectif, parité, âge moyen et remplissage, classe par classe."
        action={
          enrollment && !enrollment.occupancy.capacityKnown ? undefined : (
            <span className="ds-bar-value">
              Occupation moyenne {formatMetricValue(enrollment?.occupancy.average.value ?? null, 'percent')}
            </span>
          )
        }
      >
        {isLoading || !enrollment ? (
          <Skeleton height={200} className="rounded-lg" />
        ) : enrollment.byClass.rows.length === 0 ? (
          <OwnerEmptyState title="Aucune classe pour ces filtres." />
        ) : (
          <>
            {!enrollment.occupancy.capacityKnown && (
              <OwnerEmptyState
                variant="info"
                title="Capacité non renseignée"
                description="Les taux d'occupation restent vides tant qu'aucune classe ne porte de capacité — un zéro ferait croire à des classes vides."
                className="mb-3"
              />
            )}
            <div className="ds-owner-table-wrap">
              <table className="ds-owner-table">
                <thead>
                  <tr>
                    <th>Classe</th>
                    <th>Niveau</th>
                    <th className="ds-num">Effectif</th>
                    <th className="ds-num">Δ N-1</th>
                    <th className="ds-num">F / G</th>
                    <th className="ds-num">Âge moyen</th>
                    <th className="ds-num">Occupation</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollment.byClass.rows.map((row) => (
                    <tr key={row.classId}>
                      <td data-label="Classe">{row.name}</td>
                      <td data-label="Niveau">{row.level ?? '—'}</td>
                      <td data-label="Effectif" className="ds-num">{row.total}</td>
                      <td data-label="Δ N-1" className="ds-num">
                        <DeltaBadge delta={row.delta} />
                      </td>
                      <td data-label="F / G" className="ds-num">{row.girls} / {row.boys}</td>
                      <td data-label="Âge moyen" className="ds-num">
                        {row.averageAge === null ? '—' : `${formatDecimal(row.averageAge)} ans`}
                      </td>
                      <td data-label="Occupation" className="ds-num">
                        {formatMetricValue(row.occupancy, 'percent')}
                      </td>
                      <td data-label="Statut">
                        <StatusBadge status={OCCUPANCY_LABEL[row.status].status} icon={false}>
                          {OCCUPANCY_LABEL[row.status].label}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {enrollment.byClass.truncated && (
              <p className="ds-chart-note">Affichage limité aux 200 premières classes.</p>
            )}
          </>
        )}
      </OwnerSection>

      <div className="grid gap-4 lg:grid-cols-2">
        <OwnerSection title="Évolution sur 5 ans" subtitle="Inscrits et nouveaux élèves, par année scolaire.">
          {timeline.isLoading || !timeline.data ? (
            <Skeleton height={200} className="rounded-lg" />
          ) : (
            <LineChart
              series={[
                { key: 'total', label: 'Inscrits', points: timeline.data.data.series[0]?.points ?? [] },
                { key: 'new', label: 'Nouveaux', points: timeline.data.data.series[1]?.points ?? [] },
              ]}
            />
          )}
        </OwnerSection>

        <OwnerSection title="Pyramide des âges" subtitle="Âge atteint dans l'année de début du cycle scolaire.">
          {isLoading || !enrollment ? (
            <Skeleton height={200} className="rounded-lg" />
          ) : (
            <Histogram points={enrollment.ageDistribution.points} xLabel="âge" />
          )}
        </OwnerSection>
      </div>

      <OwnerSection
        title="Statuts et fidélisation"
        subtitle="Ce que deviennent les élèves inscrits, et ce que l'école retient d'une année sur l'autre."
      >
        {isLoading || !enrollment ? (
          <Skeleton height={140} className="rounded-lg" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <DonutChart points={enrollment.byStatus.points} centerLabel="élèves" centerValue={String(enrollment.total.value ?? 0)} />
            <div className="ds-bars">
              <div className="ds-bar-row">
                <span className="ds-bar-label">Taux de réinscription</span>
                <span className="ds-bar-track">
                  <span
                    className="ds-bar-fill"
                    style={{ width: `${Math.min(100, (enrollment.retentionRate.value ?? 0) * 100)}%` }}
                  />
                </span>
                <span className="ds-bar-value">
                  {formatMetricValue(enrollment.retentionRate.value, 'percent')}
                </span>
              </div>
              <div className="ds-bar-row">
                <span className="ds-bar-label">Taux d'abandon</span>
                <span className="ds-bar-track">
                  <span
                    className="ds-bar-fill"
                    style={{ width: `${Math.min(100, (enrollment.dropoutRate.value ?? 0) * 100)}%` }}
                  />
                </span>
                <span className="ds-bar-value">
                  {formatMetricValue(enrollment.dropoutRate.value, 'percent')}
                </span>
              </div>
              <div className="ds-bar-row">
                <span className="ds-bar-label">Affectés par l'État</span>
                <span className="ds-bar-track">
                  <span
                    className="ds-bar-fill"
                    style={{ width: `${Math.min(100, (enrollment.stateAssigned.value ?? 0) * 100)}%` }}
                  />
                </span>
                <span className="ds-bar-value">
                  {formatMetricValue(enrollment.stateAssigned.value, 'percent')}
                </span>
              </div>
            </div>
          </div>
        )}
      </OwnerSection>
    </OwnerPage>
  );
}
