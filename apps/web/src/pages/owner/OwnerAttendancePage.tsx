import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Select } from 'antd';
import { AlertTriangle, ClipboardCheck, Clock, ShieldCheck, UserX } from 'lucide-react';

import {
  BarChart,
  DonutChart,
  Histogram,
  OwnerEmptyState,
  OwnerKpiGrid,
  OwnerPage,
  OwnerSection,
  StackedBar,
  formatDecimal,
  formatMetricValue,
} from '../../components/owner';
import { Skeleton } from '../../components/ds';
import {
  useOwnerAttendance,
  useOwnerAttendanceConduct,
  useOwnerAttendanceSessions,
  useOwnerContext,
  useOwnerTeacherAbsences,
  type OwnerAttendanceFilters,
} from '../../lib/hooks/useOwner';

const ALL = '';

/**
 * Assiduité & vie scolaire.
 *
 * L'écran n'existe pas dans une école primaire pure : l'appel par séance est un
 * mécanisme du secondaire, et la conduite trimestrielle n'y a pas cours. La
 * page se garde donc elle-même — le menu la masque déjà, mais une adresse
 * saisie à la main doit aussi ramener à l'accueil plutôt qu'afficher des taux
 * calculés sur rien.
 */
export default function OwnerAttendancePage() {
  const { data: context, isLoading: contextLoading } = useOwnerContext();
  // Chaînage optionnel complet : `undefined` signifie « pas encore su », et se
  // distingue de `false`, qui ferme la page. Confondre les deux redirigerait
  // l'utilisateur avant même d'avoir lu ses modules.
  const secondary = context?.modules?.secondary;

  const [filters, setFilters] = useState<OwnerAttendanceFilters>({});
  const enabled = secondary !== false;

  const attendance = useOwnerAttendance(filters, enabled);
  const sessions = useOwnerAttendanceSessions(filters, enabled);
  const conduct = useOwnerAttendanceConduct(filters, enabled);
  const teachers = useOwnerTeacherAbsences(filters, enabled);

  const data = attendance.data?.data;
  const sessionsData = sessions.data?.data;
  const conductData = conduct.data?.data;
  const teachersData = teachers.data?.data;

  const options = useRef<{ levels: string[]; classes: string[]; subjects: string[] }>({
    levels: [],
    classes: [],
    subjects: [],
  });

  useEffect(() => {
    if (!data) return;
    const untouched = !filters.level && !filters.classId && !filters.subjectId;
    if (!untouched && options.current.classes.length > 0) return;
    options.current = {
      levels: options.current.levels,
      classes: data.byClass.points.map((point) => point.key),
      subjects: data.bySubject.points.map((point) => point.key),
    };
  }, [data, filters]);

  const kpis = useMemo(
    () => [
      { key: 'presence', label: 'Taux de présence', icon: ClipboardCheck, metric: data?.presenceRate },
      {
        key: 'absence',
        label: "Taux d'absence",
        icon: UserX,
        metric: data?.absenceRate,
        polarity: 'lower-is-better' as const,
      },
      {
        key: 'late',
        label: 'Taux de retard',
        icon: Clock,
        metric: data?.lateRate,
        polarity: 'lower-is-better' as const,
      },
      { key: 'justified', label: 'Absences justifiées', icon: ShieldCheck, metric: data?.justifiedShare },
    ],
    [data],
  );

  // Critère 6.7 — la page entière est inaccessible dans une école primaire pure.
  if (!contextLoading && secondary === false) {
    return <Navigate to="/owner" replace />;
  }

  if (attendance.isError) {
    return (
      <OwnerPage title="Assiduité">
        <OwnerEmptyState
          variant="danger"
          title="Impossible de charger les relevés de présence"
          description="La lecture des appels a échoué. Vérifiez votre connexion, puis réessayez."
          action={{ label: 'Réessayer', onClick: () => attendance.refetch() }}
        />
      </OwnerPage>
    );
  }

  const setFilter = (key: keyof OwnerAttendanceFilters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value === ALL ? undefined : value }));

  return (
    <OwnerPage title="Assiduité" subtitle="Présence, absences et vie scolaire">
      <div className="ds-owner-filters">
        <FilterSelect
          label="Classe"
          value={filters.classId ?? ALL}
          onChange={(value) => setFilter('classId', value)}
          allLabel="Toutes"
          options={options.current.classes.map((name) => ({ value: name, label: name }))}
        />
        <FilterSelect
          label="Matière"
          value={filters.subjectId ?? ALL}
          onChange={(value) => setFilter('subjectId', value)}
          allLabel="Toutes"
          options={options.current.subjects.map((name) => ({ value: name, label: name }))}
        />
      </div>

      <OwnerKpiGrid kpis={kpis} loading={attendance.isLoading} />

      {data && !data.hasSource && (
        <OwnerEmptyState
          variant="info"
          title="Aucun appel saisi"
          description="Sans relevé de présence, aucun taux n'est calculable — un taux de 0 % annoncerait une école désertée."
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <OwnerSection
          title="Absences par classe"
          subtitle="Part des relevés « absent » ou « excusé », classe par classe."
        >
          {attendance.isLoading || !data ? (
            <Skeleton height={180} className="rounded-lg" />
          ) : data.byClass.points.length === 0 ? (
            <OwnerEmptyState title="Aucune classe avec des appels saisis." />
          ) : (
            <BarChart points={data.byClass.points} unit="percent" showPrevious limit={12} />
          )}
        </OwnerSection>

        <OwnerSection
          title="Absences par matière"
          subtitle="Les matières les plus désertées, en heures cumulées."
        >
          {attendance.isLoading || !data ? (
            <Skeleton height={180} className="rounded-lg" />
          ) : data.absenceHoursBySubject.points.length === 0 ? (
            <OwnerEmptyState title="Aucune heure d'absence enregistrée." />
          ) : (
            <BarChart points={data.absenceHoursBySubject.points} unit="hours" limit={12} />
          )}
        </OwnerSection>
      </div>

      <OwnerSection
        title="Couverture de l'appel"
        subtitle="Séances tenues rapportées aux créneaux de l'emploi du temps."
        action={
          sessionsData ? (
            <span className="ds-bar-value">
              {formatMetricValue(sessionsData.coverageRate.value, 'percent')} de couverture
            </span>
          ) : undefined
        }
      >
        {sessions.isLoading || !sessionsData ? (
          <Skeleton height={200} className="rounded-lg" />
        ) : !sessionsData.hasSource ? (
          <OwnerEmptyState
            variant="info"
            title="Aucun créneau d'emploi du temps"
            description="Sans emploi du temps, une séance ne peut pas être « non tenue » : il n'y a rien à comparer."
          />
        ) : (
          <>
            <div className="ds-stat-grid mb-4" style={{ ['--ds-stat-cols' as string]: '3' }}>
              <MiniStat
                label="Séances tenues"
                value={formatMetricValue(sessionsData.held.value, 'count')}
              />
              <MiniStat
                label="Séances non tenues"
                value={formatMetricValue(sessionsData.notHeld.value, 'count')}
              />
              <MiniStat
                label="Taux de couverture"
                value={formatMetricValue(sessionsData.coverageRate.value, 'percent')}
              />
            </div>

            {sessionsData.byTeacher.length > 0 && (
              <div className="ds-owner-table-wrap">
                <table className="ds-owner-table">
                  <thead>
                    <tr>
                      <th>Enseignant</th>
                      <th className="ds-num">Tenues</th>
                      <th className="ds-num">Non tenues</th>
                      <th className="ds-num">Couverture</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionsData.byTeacher.slice(0, 15).map((row) => (
                      <tr key={row.key}>
                        <td data-label="Enseignant">{row.label}</td>
                        <td data-label="Tenues" className="ds-num">{row.held}</td>
                        <td data-label="Non tenues" className="ds-num">{row.notHeld}</td>
                        <td data-label="Couverture" className="ds-num">
                          {formatMetricValue(row.coverage, 'percent')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="ds-chart-note">
                  Enseignants désignés par leurs initiales : le pilotage n'exige pas de nommer.
                </p>
              </div>
            )}
          </>
        )}
      </OwnerSection>

      {/* Suivi opérationnel de la vie scolaire : utile quand il se passe
          quelque chose, encombrant le reste du temps. Ces deux blocs ne
          s'affichent donc que s'ils ont matière à le faire — un écran de
          pilotage n'a pas à consacrer un quart de sa hauteur à deux encarts
          « aucune décision enregistrée ». */}
      {(sessionsData?.makeupBreakdown.points.length ?? 0) > 0 ||
      (sessionsData?.moveRequests.points.length ?? 0) > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {(sessionsData?.makeupBreakdown.points.length ?? 0) > 0 && (
            <OwnerSection
              title="Suites données aux séances manquées"
              subtitle="Rattrapées, déplacées ou écartées."
            >
              <DonutChart points={sessionsData!.makeupBreakdown.points} centerLabel="décisions" />
            </OwnerSection>
          )}

          {(sessionsData?.moveRequests.points.length ?? 0) > 0 && (
            <OwnerSection
              title="Demandes de déplacement de cours"
              subtitle="Volume et sort des demandes adressées à l'administration."
            >
              <StackedBar points={sessionsData!.moveRequests.points} unit="count" showShares />
            </OwnerSection>
          )}
        </div>
      ) : null}

      <OwnerSection
        title="Conduite"
        subtitle={
          conductData?.settings
            ? `Note de base ${formatDecimal(conductData.settings.baseNote)}, moins un point par tranche de ${formatDecimal(conductData.settings.hoursPerPoint)} h d'absence.`
            : 'Note de comportement du trimestre.'
        }
      >
        {conduct.isLoading || !conductData ? (
          <Skeleton height={200} className="rounded-lg" />
        ) : !conductData.hasSource ? (
          <OwnerEmptyState
            variant="info"
            title="Aucune note de conduite calculée"
            description="Les notes de conduite se calculent à partir des heures d'absence du trimestre."
          />
        ) : (
          <>
            <div className="ds-stat-grid mb-4" style={{ ['--ds-stat-cols' as string]: '4' }}>
              <MiniStat
                label="Note moyenne"
                value={formatMetricValue(conductData.averageNote.value, 'grade')}
              />
              <MiniStat
                label="Pénalité moyenne"
                value={formatMetricValue(conductData.averagePenalty.value, 'grade')}
              />
              <MiniStat
                label="Élèves sous 10"
                value={formatMetricValue(conductData.belowThreshold.value, 'percent')}
              />
              <MiniStat
                label="Corrections manuelles"
                value={formatMetricValue(conductData.overrides.count.value, 'count')}
              />
            </div>
            <Histogram points={conductData.distribution.points} xLabel="note de conduite" />
          </>
        )}
      </OwnerSection>

      <div className="grid gap-4 lg:grid-cols-2">
        <OwnerSection title="Incidents disciplinaires" subtitle="Volume par gravité.">
          {conduct.isLoading || !conductData ? (
            <Skeleton height={160} className="rounded-lg" />
          ) : conductData.incidents.points.length === 0 ? (
            <OwnerEmptyState
              variant="info"
              title="Aucun incident enregistré"
              description="Le registre disciplinaire n'a pas d'écran de saisie monté : il peut rester vide."
            />
          ) : (
            <StackedBar points={conductData.incidents.points} unit="count" showShares />
          )}
        </OwnerSection>

        <OwnerSection
          title="Absences des enseignants"
          subtitle="Heures déclarées et part couverte par un motif."
        >
          {teachers.isLoading || !teachersData ? (
            <Skeleton height={160} className="rounded-lg" />
          ) : !teachersData.hasSource ? (
            <OwnerEmptyState
              variant="info"
              title="Aucune absence enseignant déclarée"
              description="L'écran de saisie des absences enseignants n'est pas déployé : la table peut rester vide, ce qui n'est pas la même chose que zéro heure d'absence."
            />
          ) : (
            <>
              <div className="ds-stat-grid mb-4" style={{ ['--ds-stat-cols' as string]: '2' }}>
                <MiniStat
                  label="Heures d'absence"
                  value={formatMetricValue(teachersData.absenceHours.value, 'hours')}
                />
                <MiniStat
                  label="Part justifiée"
                  value={formatMetricValue(teachersData.justifiedShare.value, 'percent')}
                />
              </div>
              <BarChart
                points={teachersData.byTeacher.slice(0, 10).map((row) => ({
                  key: row.key,
                  label: row.label,
                  value: row.hours,
                }))}
                unit="hours"
              />
            </>
          )}
        </OwnerSection>
      </div>

      <OwnerSection
        title="Assiduité demi-journée"
        subtitle="Relevé historique, conservé comme repli de l'appel par séance."
      >
        {attendance.isLoading || !data ? (
          <Skeleton height={100} className="rounded-lg" />
        ) : data.halfDayRate.value === null ? (
          <OwnerEmptyState title="Aucun appel demi-journée enregistré." />
        ) : (
          <div className="ds-bars">
            <div className="ds-bar-row">
              <span className="ds-bar-label">Taux de présence</span>
              <span className="ds-bar-track">
                <span
                  className="ds-bar-fill"
                  style={{ width: `${Math.min(100, (data.halfDayRate.value ?? 0) * 100)}%` }}
                />
              </span>
              <span className="ds-bar-value">
                {formatMetricValue(data.halfDayRate.value, 'percent')}
              </span>
            </div>
          </div>
        )}
      </OwnerSection>
    </OwnerPage>
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
        style={{ minWidth: 140 }}
        value={value}
        onChange={onChange}
        options={[{ value: ALL, label: allLabel }, ...options]}
        aria-label={`Filtrer par ${label.toLowerCase()}`}
      />
    </label>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="ds-stat">
      <div className="ds-stat-body">
        <span className="ds-stat-label">{label}</span>
        <span className="text-base font-semibold text-ds-text">{value}</span>
      </div>
      <span className="ds-stat-medallion" aria-hidden>
        <AlertTriangle width={18} height={18} />
      </span>
    </div>
  );
}
