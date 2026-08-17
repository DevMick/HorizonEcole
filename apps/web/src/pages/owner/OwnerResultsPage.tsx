import { useEffect, useMemo, useRef, useState } from 'react';
import { Select } from 'antd';
import { Award, BarChart3, GraduationCap, Percent, Sigma, Trophy } from 'lucide-react';

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
import { Skeleton, StatusBadge, Tabs, type TabItem } from '../../components/ds';
import {
  useOwnerContext,
  useOwnerPrimaryResults,
  useOwnerResultsTimeline,
  useOwnerSecondaryResults,
  type OwnerPrimaryFilters,
  type OwnerSecondaryFilters,
} from '../../lib/hooks/useOwner';

const ALL = '';

/**
 * Nombre de matières au-delà duquel les palmarès « meilleures » et « plus
 * faibles » apportent quelque chose. En deçà, le graphique du dessus les liste
 * déjà toutes, triées : les palmarès de cinq se recouperaient.
 */
const TOP_LISTS_SEUIL = 10;

/**
 * Résultats pédagogiques — deux cycles, deux onglets.
 *
 * Le primaire et le secondaire ne se calculent pas de la même façon et ne se
 * comparent pas : les afficher côte à côte dans un même tableau ferait croire
 * qu'un 14 de CM1 et un 14 de 3e disent la même chose. D'où deux onglets, dont
 * la présence suit les modules réellement actifs dans l'établissement.
 */
export default function OwnerResultsPage() {
  const { data: context } = useOwnerContext();
  const modules = context?.modules;

  const tabs = useMemo<TabItem[]>(() => {
    const items: TabItem[] = [];
    if (modules?.secondary ?? true) items.push({ key: 'secondary', label: 'Secondaire' });
    if (modules?.primary) items.push({ key: 'primary', label: 'Primaire' });
    return items;
  }, [modules?.primary, modules?.secondary]);

  const [active, setActive] = useState('secondary');
  const activeKey = tabs.some((tab) => tab.key === active) ? active : tabs[0]?.key ?? 'secondary';

  return (
    <OwnerPage title="Résultats" subtitle="Moyennes, réussite et classements">
      {tabs.length > 1 && (
        <Tabs items={tabs} value={activeKey} onChange={setActive} aria-label="Cycle" />
      )}

      {tabs.length === 0 ? (
        <OwnerEmptyState
          variant="info"
          title="Aucun cycle actif"
          description="Ni le module primaire ni le module secondaire ne sont ouverts pour cet établissement."
        />
      ) : activeKey === 'primary' ? (
        <PrimaryResults />
      ) : (
        <SecondaryResults />
      )}
    </OwnerPage>
  );
}

// ===========================================================================
// Secondaire
// ===========================================================================

function SecondaryResults() {
  const [filters, setFilters] = useState<OwnerSecondaryFilters>({});
  const { data, isLoading, isError, refetch } = useOwnerSecondaryResults(filters);
  const timeline = useOwnerResultsTimeline('secondary', 5);
  const results = data?.data;

  /**
   * Matières retenues pour la courbe d'évolution.
   *
   * La palette ne compte que cinq couleurs : au-delà, deux matières partagent
   * la même et la lecture devient impossible. On garde donc les cinq plus
   * fortes variations — celles qui portent l'information — sauf si une matière
   * est déjà filtrée, auquel cas elle est seule à l'écran.
   */
  const suivies = useMemo(() => {
    const toutes = (results?.subjectTimeline ?? []).filter((matiere) =>
      matiere.points.some((point) => point.value !== null),
    );
    if (filters.subjectId) {
      return toutes.filter((matiere) => matiere.subjectId === filters.subjectId);
    }
    return [...toutes]
      .sort((gauche, droite) => Math.abs(droite.variation ?? 0) - Math.abs(gauche.variation ?? 0))
      .slice(0, 5);
  }, [results, filters.subjectId]);

  // Mémorisées à leur état le plus large : un filtre ne doit pas retirer du
  // sélecteur les valeurs qui permettraient d'en sortir.
  const options = useRef<{
    semesters: { id: string; label: string }[];
    levels: string[];
    classes: { id: string; name: string }[];
    subjects: { id: string; label: string }[];
  }>({ semesters: [], levels: [], classes: [], subjects: [] });

  useEffect(() => {
    if (!results) return;
    const untouched = !filters.semesterId && !filters.level && !filters.classId && !filters.subjectId;
    if (!untouched && options.current.levels.length > 0) return;

    options.current = {
      semesters: results.bySemester.points.map((point) => ({
        id: point.key,
        label: point.label,
      })),
      levels: results.byLevel.points.map((point) => point.key),
      classes: results.classRanking.map((row) => ({ id: row.classId, name: row.name })),
      subjects: results.bySubject.points.map((point) => ({ id: point.key, label: point.label })),
    };
  }, [results, filters]);

  const kpis = useMemo(
    () => [
      { key: 'avg', label: 'Moyenne générale', icon: GraduationCap, metric: results?.generalAverage },
      { key: 'success', label: 'Taux de réussite', icon: Percent, metric: results?.successRate },
      {
        key: 'sigma',
        label: 'Écart-type',
        icon: Sigma,
        metric: results?.standardDeviation,
        polarity: 'lower-is-better' as const,
      },
      { key: 'bulletins', label: 'Bulletins publiés', icon: Award, metric: results?.bulletinCoverage },
    ],
    [results],
  );

  if (isError) {
    return (
      <OwnerEmptyState
        variant="danger"
        title="Impossible de charger les résultats"
        description="La lecture des notes a échoué. Vérifiez votre connexion, puis réessayez."
        action={{ label: 'Réessayer', onClick: () => refetch() }}
      />
    );
  }

  const setFilter = (key: keyof OwnerSecondaryFilters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value === ALL ? undefined : value }));

  const empty = results && results.generalAverage.value === null;

  return (
    <>
      <div className="ds-owner-filters">
        <FilterSelect
          label="Trimestre"
          value={filters.semesterId ?? ALL}
          onChange={(value) => setFilter('semesterId', value)}
          allLabel="Tous"
          options={options.current.semesters.map((row) => ({ value: row.id, label: row.label }))}
        />
        <FilterSelect
          label="Niveau"
          value={filters.level ?? ALL}
          onChange={(value) => setFilter('level', value)}
          allLabel="Tous"
          options={options.current.levels.map((level) => ({ value: level, label: level }))}
        />
        <FilterSelect
          label="Classe"
          value={filters.classId ?? ALL}
          onChange={(value) => setFilter('classId', value)}
          allLabel="Toutes"
          options={options.current.classes.map((row) => ({ value: row.id, label: row.name }))}
        />
        <FilterSelect
          label="Matière"
          value={filters.subjectId ?? ALL}
          onChange={(value) => setFilter('subjectId', value)}
          allLabel="Toutes"
          options={options.current.subjects.map((row) => ({ value: row.id, label: row.label }))}
        />
      </div>

      <OwnerKpiGrid kpis={kpis} loading={isLoading} />

      {empty && (
        <OwnerEmptyState
          title="Aucune note sur cette période"
          description="Aucune moyenne ne peut être calculée pour les filtres retenus."
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <OwnerSection
          title="Moyenne par matière"
          subtitle="Notes ramenées sur 20 ; un barème sur 10 compte à demi-poids."
        >
          {isLoading || !results ? (
            <Skeleton height={200} className="rounded-lg" />
          ) : (
            <>
              <BarChart points={results.bySubject.points} unit="grade" showPrevious limit={12} />
              {/* Les palmarès « meilleures » et « plus faibles » ne se
                  justifient que si toutes les matières ne tiennent pas déjà
                  au-dessus. Avec huit matières, les deux listes de cinq se
                  recoupaient : la même matière figurait à la fois parmi les
                  meilleures et parmi les plus faibles, ce qui n'apprend rien
                  et fait douter du reste de l'écran. */}
              {results.bySubject.points.length > TOP_LISTS_SEUIL && (
                <div className="ds-owner-toplists">
                  <div>
                    <p className="ds-chart-note">Meilleures matières</p>
                    {results.best.map((subject) => (
                      <StatusBadge key={subject.key} status="success" icon={false}>
                        {subject.label} {formatDecimal(subject.value)}
                      </StatusBadge>
                    ))}
                  </div>
                  <div>
                    <p className="ds-chart-note">Matières les plus faibles</p>
                    {results.worst.map((subject) => (
                      <StatusBadge key={subject.key} status="danger" icon={false}>
                        {subject.label} {formatDecimal(subject.value)}
                      </StatusBadge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </OwnerSection>

        <OwnerSection
          title="Distribution des moyennes"
          subtitle="Répartition des moyennes générales, par tranche d'un point."
        >
          {isLoading || !results ? (
            <Skeleton height={200} className="rounded-lg" />
          ) : (
            <Histogram points={results.averageDistribution.points} xLabel="moyenne générale" />
          )}
        </OwnerSection>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <OwnerSection title="Évolution par trimestre" subtitle="Moyenne générale, trimestre après trimestre.">
          {isLoading || !results ? (
            <Skeleton height={200} className="rounded-lg" />
          ) : (
            <LineChart
              series={[
                { key: 'current', label: 'Année observée', points: results.bySemester.points },
                {
                  key: 'previous',
                  label: 'Comparaison',
                  points: results.bySemester.points.map((point) => ({
                    ...point,
                    value: point.previous ?? null,
                  })),
                },
              ]}
            />
          )}
        </OwnerSection>

        <OwnerSection title="Évolution pluriannuelle" subtitle="Moyenne générale de l'établissement.">
          {timeline.isLoading || !timeline.data ? (
            <Skeleton height={200} className="rounded-lg" />
          ) : (
            <LineChart
              series={[
                {
                  key: 'avg',
                  label: 'Moyenne générale',
                  points: timeline.data.data.series[0]?.points ?? [],
                },
              ]}
              unit="grade"
            />
          )}
        </OwnerSection>
      </div>

      {/* Le croisement matière × trimestre : c'est lui qui répond à « quelle
          matière décroche, et depuis quand ». La moyenne par matière donne un
          instantané, l'évolution par trimestre un global — ni l'un ni l'autre
          ne désigne la matière en cause. */}
      <OwnerSection
        title="Évolution par matière"
        subtitle={
          filters.subjectId
            ? 'Trajectoire de la matière retenue, trimestre après trimestre.'
            : 'Les cinq matières dont la moyenne a le plus bougé entre le premier et le dernier trimestre.'
        }
      >
        {isLoading || !results ? (
          <Skeleton height={200} className="rounded-lg" />
        ) : suivies.length === 0 ? (
          <OwnerEmptyState
            title="Pas encore de trajectoire"
            description="Il faut des notes sur au moins deux trimestres pour qu'une évolution ait un sens."
          />
        ) : (
          <>
            <LineChart
              series={suivies.map((matiere) => ({
                key: matiere.subjectId,
                label: matiere.name,
                points: matiere.points,
              }))}
              unit="grade"
            />
            <div className="ds-owner-toplists">
              {suivies.map((matiere) => (
                <div key={matiere.subjectId}>
                  <p className="ds-chart-note">{matiere.name}</p>
                  <DeltaBadge
                    delta={matiere.variation}
                    deltaPct={null}
                    unit="grade"
                    polarity="higher-is-better"
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </OwnerSection>

      {/* « Effet des coefficients » a été retiré d'ici : l'écart entre moyenne
          pondérée et moyenne brute des matières est une grandeur de
          statisticien, illisible sans explication et sans décision à la clé
          pour un propriétaire. La donnée reste calculée par l'API, prête à
          resservir dans un écran qui l'expliquerait. */}
      <OwnerSection
        title="Classement des classes"
        subtitle="Les classes à égalité partagent leur rang."
      >
        {isLoading || !results ? (
          <Skeleton height={200} className="rounded-lg" />
        ) : results.classRanking.length === 0 ? (
          <OwnerEmptyState title="Aucune classe notée pour ces filtres." />
        ) : (
          <div className="ds-owner-table-wrap">
            <table className="ds-owner-table">
              <thead>
                <tr>
                  <th className="ds-num">#</th>
                  <th>Classe</th>
                  <th>Niveau</th>
                  <th className="ds-num">Moyenne</th>
                  <th className="ds-num">Δ N-1</th>
                  <th className="ds-num">Réussite</th>
                  <th className="ds-num">Écart-type</th>
                  <th className="ds-num">Élèves</th>
                </tr>
              </thead>
              <tbody>
                {results.classRanking.map((row) => (
                  <tr key={row.classId}>
                    <td data-label="Rang" className="ds-num">
                      {row.rank ?? '—'}
                      {row.isExAequo && <span className="ds-chart-note"> ex æquo</span>}
                    </td>
                    <td data-label="Classe">{row.name}</td>
                    <td data-label="Niveau">{row.level ?? '—'}</td>
                    <td data-label="Moyenne" className="ds-num">{formatDecimal(row.average)}</td>
                    <td data-label="Δ N-1" className="ds-num">
                      <DeltaBadge delta={row.delta} unit="grade" />
                    </td>
                    <td data-label="Réussite" className="ds-num">
                      {formatMetricValue(row.successRate, 'percent')}
                    </td>
                    <td data-label="Écart-type" className="ds-num">
                      {formatDecimal(row.standardDeviation)}
                    </td>
                    <td data-label="Élèves" className="ds-num">{row.students}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OwnerSection>

      <div className="grid gap-4 lg:grid-cols-2">
        <OwnerSection title="Mentions" subtitle="Répartition des moyennes générales par mention.">
          {isLoading || !results ? (
            <Skeleton height={180} className="rounded-lg" />
          ) : (
            <DonutChart points={results.mentions.points} centerLabel="élèves notés" />
          )}
        </OwnerSection>

        <OwnerSection
          title="Poids des matières"
          subtitle="Part de chaque matière dans la décision de passage, coefficients à l'appui."
        >
          {isLoading || !results ? (
            <Skeleton height={180} className="rounded-lg" />
          ) : (
            <BarChart points={results.subjectWeights.points} unit="percent" limit={12} />
          )}
        </OwnerSection>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <OwnerSection title="Types d'évaluation" subtitle="Ce que recouvrent les notes saisies.">
          {isLoading || !results ? (
            <Skeleton height={180} className="rounded-lg" />
          ) : (
            <DonutChart
              points={results.evaluationTypes.points}
              centerLabel="notes"
              centerValue={formatMetricValue(results.gradeVolume.value, 'count')}
            />
          )}
        </OwnerSection>

        <OwnerSection
          title="Distribution des notes"
          subtitle="Toutes notes confondues, ramenées sur 20, par tranche de deux points."
        >
          {isLoading || !results ? (
            <Skeleton height={180} className="rounded-lg" />
          ) : (
            <Histogram points={results.gradeDistribution.points} xLabel="note sur 20" />
          )}
        </OwnerSection>
      </div>
    </>
  );
}

// ===========================================================================
// Primaire
// ===========================================================================

function PrimaryResults() {
  const [filters, setFilters] = useState<OwnerPrimaryFilters>({});
  const { data, isLoading, isError, refetch } = useOwnerPrimaryResults(filters);
  const timeline = useOwnerResultsTimeline('primary', 5);
  const results = data?.data;

  const options = useRef<{ levels: string[]; classes: { id: string; name: string }[] }>({
    levels: [],
    classes: [],
  });

  useEffect(() => {
    if (!results) return;
    const untouched = !filters.level && !filters.classId;
    if (!untouched && options.current.levels.length > 0) return;
    options.current = {
      levels: results.byLevel.points.map((point) => point.key),
      classes: results.settings.map((row) => ({ id: row.classId, name: row.className })),
    };
  }, [results, filters]);

  const kpis = useMemo(
    () => [
      { key: 'avg', label: 'Moyenne générale', icon: GraduationCap, metric: results?.generalAverage },
      { key: 'success', label: 'Taux de réussite', icon: Trophy, metric: results?.successRate },
      {
        key: 'repeat',
        label: 'Redoublement projeté',
        icon: BarChart3,
        metric: results?.repeatRate,
        polarity: 'lower-is-better' as const,
      },
      { key: 'count', label: 'Compositions', icon: Award, metric: results?.evaluationCount },
    ],
    [results],
  );

  if (isError) {
    return (
      <OwnerEmptyState
        variant="danger"
        title="Impossible de charger les résultats du primaire"
        description="La lecture des compositions a échoué. Vérifiez votre connexion, puis réessayez."
        action={{ label: 'Réessayer', onClick: () => refetch() }}
      />
    );
  }

  const setFilter = (key: keyof OwnerPrimaryFilters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value === ALL ? undefined : value }));

  return (
    <>
      <div className="ds-owner-filters">
        <FilterSelect
          label="Niveau"
          value={filters.level ?? ALL}
          onChange={(value) => setFilter('level', value)}
          allLabel="Tous"
          options={options.current.levels.map((level) => ({ value: level, label: level }))}
        />
        <FilterSelect
          label="Classe"
          value={filters.classId ?? ALL}
          onChange={(value) => setFilter('classId', value)}
          allLabel="Toutes"
          options={options.current.classes.map((row) => ({ value: row.id, label: row.name }))}
        />
      </div>

      <OwnerKpiGrid kpis={kpis} loading={isLoading} />

      {results?.truncated && (
        <OwnerEmptyState
          variant="info"
          title="Affichage limité"
          description="Seules les 200 premières compositions de l'année sont prises en compte."
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <OwnerSection title="Moyenne par niveau" subtitle="CP1 → CM2, moyennes des compositions.">
          {isLoading || !results ? (
            <Skeleton height={180} className="rounded-lg" />
          ) : (
            <BarChart points={results.byLevel.points} unit="grade" showPrevious />
          )}
        </OwnerSection>

        <OwnerSection title="Moyenne par classe" subtitle="Toutes compositions de l'année confondues.">
          {isLoading || !results ? (
            <Skeleton height={180} className="rounded-lg" />
          ) : (
            <BarChart points={results.byClass.points} unit="grade" showPrevious limit={12} />
          )}
        </OwnerSection>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <OwnerSection
          title="Évolution par composition"
          subtitle="Progression composition après composition, dans l'ordre du calendrier."
        >
          {isLoading || !results ? (
            <Skeleton height={200} className="rounded-lg" />
          ) : (
            <LineChart
              series={[{ key: 'evals', label: 'Moyenne de classe', points: results.byEvaluation.points }]}
            />
          )}
        </OwnerSection>

        <OwnerSection title="Évolution pluriannuelle" subtitle="Moyenne du cycle primaire, par année.">
          {timeline.isLoading || !timeline.data ? (
            <Skeleton height={200} className="rounded-lg" />
          ) : (
            <LineChart
              series={[
                { key: 'avg', label: 'Moyenne', points: timeline.data.data.series[0]?.points ?? [] },
              ]}
            />
          )}
        </OwnerSection>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <OwnerSection
          title="Distribution des moyennes"
          subtitle={
            results?.distributionScale
              ? `Tranches adaptées à l'échelle /${results.distributionScale}.`
              : "Une distribution suppose une échelle unique."
          }
        >
          {isLoading || !results ? (
            <Skeleton height={180} className="rounded-lg" />
          ) : results.distributionScale === null ? (
            <OwnerEmptyState
              variant="info"
              title="Échelles mêlées"
              description="Ces classes ne notent pas sur la même échelle : un 9 vaut « excellent » sur 10 et « insuffisant » sur 20. Filtrez par niveau pour obtenir une distribution lisible."
            />
          ) : (
            <Histogram points={results.distribution.points} xLabel="moyenne" />
          )}
        </OwnerSection>

        <OwnerSection title="Mentions" subtitle="Calculées sur l'échelle de la classe, /10 ou /20.">
          {isLoading || !results ? (
            <Skeleton height={180} className="rounded-lg" />
          ) : (
            <DonutChart points={results.mentions.points} centerLabel="élèves classés" />
          )}
        </OwnerSection>
      </div>

      <OwnerSection
        title="Suivi de la saisie"
        subtitle="Compositions verrouillées, bulletins publiés et couverture de la grille."
      >
        {isLoading || !results ? (
          <Skeleton height={140} className="rounded-lg" />
        ) : (
          <div className="ds-bars">
            <GaugeRow label="Compositions verrouillées" metric={results.lockedShare.value} />
            <GaugeRow label="Bulletins publiés" metric={results.bulletinCoverage.value} />
            <GaugeRow label="Couverture de la grille" metric={results.gridCoverage.value} />
            <GaugeRow label="Élèves non classés" metric={results.unranked.value} />
          </div>
        )}
      </OwnerSection>

      <OwnerSection
        title="Paramètres de calcul par classe"
        subtitle="Diviseur, échelle et seuils en vigueur — la base de toutes les moyennes ci-dessus."
      >
        {isLoading || !results ? (
          <Skeleton height={160} className="rounded-lg" />
        ) : results.settings.length === 0 ? (
          <OwnerEmptyState title="Aucune classe du primaire pour ces filtres." />
        ) : (
          <div className="ds-owner-table-wrap">
            <table className="ds-owner-table">
              <thead>
                <tr>
                  <th>Classe</th>
                  <th>Niveau</th>
                  <th className="ds-num">Diviseur</th>
                  <th className="ds-num">Échelle</th>
                  <th className="ds-num">Admission</th>
                  <th className="ds-num">Redoublement</th>
                </tr>
              </thead>
              <tbody>
                {results.settings.map((row) => (
                  <tr key={row.classId}>
                    <td data-label="Classe">{row.className}</td>
                    <td data-label="Niveau">{row.level ?? '—'}</td>
                    <td data-label="Diviseur" className="ds-num">{formatDecimal(row.divisor)}</td>
                    <td data-label="Échelle" className="ds-num">
                      {row.averageScale === null ? '—' : `/${row.averageScale}`}
                    </td>
                    <td data-label="Admission" className="ds-num">{formatDecimal(row.admission)}</td>
                    <td data-label="Redoublement" className="ds-num">{formatDecimal(row.repeat)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OwnerSection>

      <OwnerSection
        title="Écart entre classes d'un même niveau"
        subtitle="Deux classes d'un même niveau qui s'écartent ne posent pas le même problème qu'un niveau homogène."
      >
        {isLoading || !results ? (
          <Skeleton height={140} className="rounded-lg" />
        ) : results.levelSpread.length === 0 ? (
          <OwnerEmptyState title="Aucun niveau à comparer." />
        ) : (
          <BarChart
            points={results.levelSpread.map((row) => ({
              key: row.level,
              label: row.level,
              value: row.spread,
            }))}
            unit="grade"
          />
        )}
      </OwnerSection>
    </>
  );
}

// ===========================================================================
// Fragments partagés
// ===========================================================================

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  allLabel: string;
}) {
  return (
    <label className="ds-owner-year-field">
      <span>{label}</span>
      <Select
        size="small"
        style={{ minWidth: 130 }}
        value={value}
        onChange={onChange}
        options={[{ value: ALL, label: allLabel }, ...options]}
        aria-label={`Filtrer par ${label.toLowerCase()}`}
      />
    </label>
  );
}

function GaugeRow({ label, metric }: { label: string; metric: number | null }) {
  return (
    <div className="ds-bar-row">
      <span className="ds-bar-label">{label}</span>
      <span className="ds-bar-track">
        <span className="ds-bar-fill" style={{ width: `${Math.min(100, (metric ?? 0) * 100)}%` }} />
      </span>
      <span className="ds-bar-value">{formatMetricValue(metric, 'percent')}</span>
    </div>
  );
}
