import { useMemo, useState } from 'react';
import { Award, Clock, GraduationCap, Users } from 'lucide-react';

import {
  BarChart,
  DonutChart,
  Histogram,
  LineChart,
  OwnerClassFilter,
  OwnerEmptyState,
  OwnerKpiGrid,
  OwnerPage,
  OwnerSection,
  StackedBar,
  formatDecimal,
  formatMetricValue,
} from '../../components/owner';
import { Skeleton, StatusBadge } from '../../components/ds';
import {
  useOwnerStaff,
  useOwnerStaffPayroll,
  useOwnerStaffWorkload,
  type OwnerStaffPayroll,
} from '../../lib/hooks/useOwner';

/**
 * Enseignants & personnel.
 *
 * Le schéma ne modélise aucun personnel non enseignant : ce que cet écran
 * appelle « personnel » est le corps enseignant, et il le dit. Laisser croire à
 * une vue exhaustive de la masse humaine de l'école serait le plus sûr moyen de
 * faire prendre une décision sur un périmètre incomplet.
 */
export default function OwnerStaffPage() {
  // Filtré sur une classe, l'écran ne retient que les enseignants qui y
  // interviennent : effectif, contrats et charge se recalculent sur cette
  // équipe. La paie, elle, reste globale — un salaire ne se répartit pas entre
  // les classes où l'enseignant intervient.
  const [classId, setClassId] = useState<string | undefined>(undefined);

  const staff = useOwnerStaff({ classId });
  const workload = useOwnerStaffWorkload({ classId });
  const payroll = useOwnerStaffPayroll();

  const data = staff.data?.data;
  const workloadData = workload.data?.data;
  const payrollData = payroll.data?.data;

  const kpis = useMemo(
    () => [
      { key: 'headcount', label: 'Effectif enseignant', icon: Users, metric: data?.headcount },
      {
        key: 'seniority',
        label: 'Ancienneté moyenne (années)',
        icon: Award,
        metric: data?.seniority,
        polarity: 'neutral' as const,
      },
      {
        key: 'hours',
        label: 'Charge hebdomadaire moyenne',
        icon: Clock,
        metric: workloadData?.averageHours,
        polarity: 'neutral' as const,
      },
      {
        key: 'coverage',
        label: 'Couverture des matières',
        icon: GraduationCap,
        metric: data?.subjectCoverage,
      },
    ],
    [data, workloadData],
  );

  if (staff.isError) {
    return (
      <OwnerPage title="Enseignants">
        <OwnerEmptyState
          variant="danger"
          title="Impossible de charger le corps enseignant"
          description="La lecture a échoué. Vérifiez votre connexion, puis réessayez."
          action={{ label: 'Réessayer', onClick: () => staff.refetch() }}
        />
      </OwnerPage>
    );
  }

  return (
    <OwnerPage title="Enseignants" subtitle="Effectif, charge et couverture des matières">
      <div className="ds-owner-filters">
        <OwnerClassFilter value={classId} onChange={setClassId} />
      </div>

      <OwnerKpiGrid kpis={kpis} loading={staff.isLoading} />

      <p className="ds-chart-note">
        Le schéma ne modélise que le corps enseignant : le personnel administratif et de service
        n'y figure pas, et n'est donc pas compté ici.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <OwnerSection title="Types de contrat" subtitle="CDI, CDD et vacataires.">
          {staff.isLoading || !data ? (
            <Skeleton height={180} className="rounded-lg" />
          ) : !data.hasSource ? (
            <OwnerEmptyState title="Aucun enseignant enregistré." />
          ) : (
            <DonutChart
              points={data.byContract.points}
              centerLabel="enseignants"
              centerValue={formatMetricValue(data.headcount.value, 'count')}
            />
          )}
        </OwnerSection>

        <OwnerSection
          title="Polyvalence"
          subtitle="Nombre de matières enseignées, enseignant par enseignant."
        >
          {staff.isLoading || !data ? (
            <Skeleton height={180} className="rounded-lg" />
          ) : data.polyvalence.points.length === 0 ? (
            <OwnerEmptyState title="Aucune matière affectée." />
          ) : (
            <Histogram points={data.polyvalence.points} xLabel="matières par enseignant" />
          )}
        </OwnerSection>
      </div>

      <OwnerSection
        title="Couverture des affectations"
        subtitle="Matières pourvues, professeurs principaux et comptes applicatifs."
      >
        {staff.isLoading || !data ? (
          <Skeleton height={160} className="rounded-lg" />
        ) : (
          <div className="ds-bars">
            <GaugeRow label="Matières pourvues" value={data.subjectCoverage.value} />
            <GaugeRow label="Classes avec professeur principal" value={data.mainTeachers.value} />
            <GaugeRow label="Comptes applicatifs actifs" value={data.accountCoverage.value} />
            <div className="ds-bar-row">
              <span className="ds-bar-label">Créneaux sans enseignant</span>
              <span className="ds-bar-track" />
              <span className="ds-bar-value">
                {formatMetricValue(data.unassignedSlots.value, 'count')}
              </span>
            </div>
            <div className="ds-bar-row">
              <span className="ds-bar-label">Affectations formalisées</span>
              <span className="ds-bar-track" />
              <span className="ds-bar-value">
                {formatMetricValue(data.assignments.value, 'count')}
              </span>
            </div>
          </div>
        )}
      </OwnerSection>

      <OwnerSection
        title="Contrats arrivant à échéance"
        subtitle="CDD dont le terme tombe dans l'année scolaire observée."
      >
        {staff.isLoading || !data ? (
          <Skeleton height={140} className="rounded-lg" />
        ) : data.endingContracts.length === 0 ? (
          <OwnerEmptyState title="Aucun contrat n'arrive à échéance cette année." />
        ) : (
          <div className="ds-owner-table-wrap">
            <table className="ds-owner-table">
              <thead>
                <tr>
                  <th>Enseignant</th>
                  <th>Contrat</th>
                  <th>Échéance</th>
                </tr>
              </thead>
              <tbody>
                {data.endingContracts.map((row) => (
                  <tr key={row.key}>
                    <td data-label="Enseignant">{row.label}</td>
                    <td data-label="Contrat">
                      <StatusBadge status="warning" icon={false}>
                        {row.contract}
                      </StatusBadge>
                    </td>
                    <td data-label="Échéance">{row.endDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OwnerSection>

      <OwnerSection
        title="Charge horaire hebdomadaire"
        subtitle="Heures d'emploi du temps par enseignant, comparées à la bande cible déclarée."
      >
        {workload.isLoading || !workloadData ? (
          <Skeleton height={200} className="rounded-lg" />
        ) : workloadData.weeklyHours.length === 0 ? (
          <OwnerEmptyState title="Aucun créneau affecté à un enseignant." />
        ) : (
          <>
            {!workloadData.hasTargets && (
              <OwnerEmptyState
                variant="info"
                title="Aucune bande cible déclarée"
                description="Sans heures hebdomadaires de référence, la surcharge n'est pas mesurable : elle n'est pas nulle."
                className="mb-3"
              />
            )}
            <div className="ds-owner-table-wrap">
              <table className="ds-owner-table">
                <thead>
                  <tr>
                    <th>Enseignant</th>
                    <th className="ds-num">Heures / semaine</th>
                    <th className="ds-num">Cible</th>
                    <th className="ds-num">Écart</th>
                  </tr>
                </thead>
                <tbody>
                  {workloadData.weeklyHours.slice(0, 20).map((row) => (
                    <tr key={row.key}>
                      <td data-label="Enseignant">{row.label}</td>
                      <td data-label="Heures" className="ds-num">{formatDecimal(row.hours)} h</td>
                      <td data-label="Cible" className="ds-num">
                        {row.target === null ? '—' : `${row.target} h`}
                      </td>
                      <td data-label="Écart" className="ds-num">
                        {row.gap === null ? '—' : `${row.gap > 0 ? '+' : ''}${formatDecimal(row.gap)} h`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </OwnerSection>

      {/* « Heures effectuées » ne s'affiche que si des heures ont réellement
          été déclarées. La saisie n'étant pas déployée, le bloc n'affichait
          qu'un encart expliquant sa propre inexistence — du bruit sur un écran
          de pilotage, où chaque bloc doit porter une décision. Il réapparaîtra
          de lui-même le jour où la saisie existera. */}
      {workloadData?.hasDeclaredHours && (
        <OwnerSection
          title="Heures effectuées"
          subtitle="Heures déclarées par les vacataires, mois par mois."
        >
          <LineChart
            series={[
              { key: 'hours', label: 'Heures déclarées', points: workloadData.hoursWorked.points },
            ]}
            unit="hours"
          />
        </OwnerSection>
      )}

      <PayrollSection state={payroll} data={payrollData} />
    </OwnerPage>
  );
}

// ===========================================================================
// Paie
// ===========================================================================

function PayrollSection({
  state,
  data,
}: {
  state: ReturnType<typeof useOwnerStaffPayroll>;
  data?: OwnerStaffPayroll;
}) {
  return (
    <OwnerSection
      title="Masse salariale"
      subtitle="Brut, net, charges et coût par élève sur l'année scolaire."
    >
      {state.isLoading || !data ? (
        <Skeleton height={220} className="rounded-lg" />
      ) : !data.hasSource ? (
        <OwnerEmptyState
          variant="info"
          title="Aucun bulletin de paie"
          description="Le module de paie n'est pas alimenté pour cette année : les montants restent vides plutôt que d'être affichés à zéro."
        />
      ) : (
        <>
          <div className="ds-stat-grid mb-4" style={{ ['--ds-stat-cols' as string]: '4' }}>
            <MiniStat label="Brut" value={formatMetricValue(data.grossTotal.value, 'currency')} />
            <MiniStat label="Net payé" value={formatMetricValue(data.netTotal.value, 'currency')} />
            <MiniStat
              label="Salaire net moyen"
              value={formatMetricValue(data.averageSalary.value, 'currency')}
            />
            <MiniStat
              label="Coût par élève"
              value={formatMetricValue(data.costPerStudent.value, 'currency')}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="ds-chart-note">Décomposition de la paie</p>
              <StackedBar points={data.breakdown.points} showShares />
            </div>
            <div>
              <p className="ds-chart-note">Charges sociales</p>
              <StackedBar points={data.socialCharges.points} showShares />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <p className="ds-chart-note">Masse salariale brute, mois par mois</p>
            <LineChart series={[{ key: 'gross', label: 'Brut', points: data.monthly.points }]} />
          </div>

          <div className="ds-bars" style={{ marginTop: 16 }}>
            <GaugeRow label="Part des retenues dans le brut" value={data.deductions.value} />
          </div>

          {data.advances.byStatus.points.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p className="ds-chart-note">
                Acomptes versés : {formatMetricValue(data.advances.total.value, 'currency')}
              </p>
              <BarChart points={data.advances.byStatus.points} unit="currency" />
            </div>
          )}
        </>
      )}
    </OwnerSection>
  );
}

// ===========================================================================
// Fragments partagés
// ===========================================================================

function GaugeRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="ds-bar-row">
      <span className="ds-bar-label">{label}</span>
      <span className="ds-bar-track">
        <span className="ds-bar-fill" style={{ width: `${Math.min(100, (value ?? 0) * 100)}%` }} />
      </span>
      <span className="ds-bar-value">{formatMetricValue(value, 'percent')}</span>
    </div>
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
        <Users width={18} height={18} />
      </span>
    </div>
  );
}
