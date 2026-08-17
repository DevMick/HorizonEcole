import { useEffect, useMemo, useRef, useState } from 'react';
import { Select } from 'antd';
import { AlertTriangle, Banknote, CreditCard, Percent, Wallet } from 'lucide-react';

import {
  BarChart,
  DonutChart,
  LineChart,
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
  useOwnerFinanceCollection,
  useOwnerFinanceDebtors,
  useOwnerFinanceExpenses,
  useOwnerFinanceOverview,
  useOwnerFinanceSeasonality,
  useOwnerFinanceTimeline,
  useOwnerRevenueBreakdown,
  type OwnerFinanceFilters,
} from '../../lib/hooks/useOwner';

const ALL = '';

/**
 * Finance — facturation, recouvrement, dépenses.
 *
 * L'écran distingue deux taux de recouvrement, et c'est délibéré. Le taux brut
 * rapporte l'encaissé au facturé de l'année entière : consulté en janvier, il
 * est mécaniquement bas sans que rien n'aille mal. Le taux à échéance rapporte
 * l'encaissé à ce qui était réellement exigible ce jour-là — c'est celui qui
 * se lit en cours d'année, et le seul sur lequel on décide de relancer.
 */
export default function OwnerFinancePage() {
  const [filters, setFilters] = useState<OwnerFinanceFilters>({});

  const overview = useOwnerFinanceOverview(filters);
  const collection = useOwnerFinanceCollection(filters);
  const revenue = useOwnerRevenueBreakdown(filters);
  const seasonality = useOwnerFinanceSeasonality();
  const debtors = useOwnerFinanceDebtors(filters);
  const expenses = useOwnerFinanceExpenses();
  const timeline = useOwnerFinanceTimeline(5);

  const data = overview.data?.data;

  const options = useRef<{ levels: string[]; classes: string[]; feeTypes: { id: string; label: string }[] }>({
    levels: [],
    classes: [],
    feeTypes: [],
  });

  useEffect(() => {
    const breakdown = revenue.data?.data;
    if (!breakdown) return;
    const untouched = !filters.level && !filters.classId && !filters.paymentTypeId;
    if (!untouched && options.current.levels.length > 0) return;

    options.current = {
      levels: breakdown.byLevel.points.map((point) => point.key),
      classes: breakdown.byClass.points.map((point) => point.key),
      feeTypes: breakdown.byFeeType.points.map((point) => ({ id: point.key, label: point.label })),
    };
  }, [revenue.data, filters]);

  const kpis = useMemo(
    () => [
      { key: 'invoiced', label: 'Facturé', icon: Banknote, metric: data?.invoiced },
      { key: 'collected', label: 'Encaissé', icon: Wallet, metric: data?.collected },
      {
        key: 'outstanding',
        label: 'Impayés',
        icon: AlertTriangle,
        metric: data?.outstanding,
        polarity: 'lower-is-better' as const,
      },
      { key: 'rate', label: 'Recouvrement', icon: Percent, metric: data?.collectionRate },
    ],
    [data],
  );

  if (overview.isError) {
    return (
      <OwnerPage title="Finance">
        <OwnerEmptyState
          variant="danger"
          title="Impossible de charger les données financières"
          description="La lecture de la facturation a échoué. Vérifiez votre connexion, puis réessayez."
          action={{ label: 'Réessayer', onClick: () => overview.refetch() }}
        />
      </OwnerPage>
    );
  }

  const setFilter = (key: keyof OwnerFinanceFilters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value === ALL ? undefined : value }));

  const collectionData = collection.data?.data;
  const revenueData = revenue.data?.data;
  const seasonalityData = seasonality.data?.data;
  const debtorsData = debtors.data?.data;

  return (
    <OwnerPage title="Finance" subtitle="Facturation, recouvrement et dépenses">
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
          options={options.current.classes.map((name) => ({ value: name, label: name }))}
        />
        <FilterSelect
          label="Type de frais"
          value={filters.paymentTypeId ?? ALL}
          onChange={(value) => setFilter('paymentTypeId', value)}
          allLabel="Tous"
          options={options.current.feeTypes.map((row) => ({ value: row.id, label: row.label }))}
        />
      </div>

      <OwnerKpiGrid kpis={kpis} loading={overview.isLoading} />

      {data && data.invoiced.value === null && (
        <OwnerEmptyState
          variant="info"
          title="Aucune facture sur cette année"
          description="Tant qu'aucune facture n'est émise, le recouvrement n'a pas de base de calcul — un taux affiché ici serait arbitraire."
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <OwnerSection
          title="Recouvrement à échéance"
          subtitle="L'encaissé rapporté à ce qui était exigible à ce jour — le taux à lire en cours d'année."
        >
          {overview.isLoading || !data ? (
            <Skeleton height={160} className="rounded-lg" />
          ) : (
            <div className="ds-bars">
              <GaugeRow label="Recouvrement brut" value={data.collectionRate.value} />
              <GaugeRow label="Recouvrement à échéance" value={data.onScheduleRate.value} />
              <GaugeRow label="Taux de facturation" value={data.invoicingRate.value} />
              <div className="ds-bar-row">
                <span className="ds-bar-label">Attendu échu</span>
                <span className="ds-bar-track" />
                <span className="ds-bar-value">
                  {formatMetricValue(data.dueToDate.value, 'currency')}
                </span>
              </div>
              <div className="ds-bar-row">
                <span className="ds-bar-label">Recette moyenne / élève</span>
                <span className="ds-bar-track" />
                <span className="ds-bar-value">
                  {formatMetricValue(data.revenuePerStudent.value, 'currency')}
                </span>
              </div>
            </div>
          )}
        </OwnerSection>

        <OwnerSection
          title="Vieillissement de la créance"
          subtitle="Une créance de six millions ne dit rien tant qu'on ignore son ancienneté."
        >
          {collection.isLoading || !collectionData ? (
            <Skeleton height={160} className="rounded-lg" />
          ) : !collectionData.hasSource ? (
            <OwnerEmptyState
              variant="info"
              title="Aucun échéancier"
              description="Sans tranches de paiement, ni retard ni ancienneté ne sont mesurables."
            />
          ) : (
            <StackedBar points={collectionData.ageing.points} showShares />
          )}
        </OwnerSection>
      </div>

      <OwnerSection
        title="Retards de paiement"
        subtitle="Tranches échues non soldées, par numéro de tranche."
        action={
          collectionData ? (
            <span className="ds-bar-value">
              Retard moyen {formatMetricValue(collectionData.averageDelay.value, 'days')}
            </span>
          ) : undefined
        }
      >
        {collection.isLoading || !collectionData ? (
          <Skeleton height={160} className="rounded-lg" />
        ) : !collectionData.hasSource ? (
          <OwnerEmptyState title="Aucune tranche à suivre." />
        ) : (
          <>
            <div className="ds-stat-grid mb-4" style={{ ['--ds-stat-cols' as string]: '3' }}>
              <MiniStat
                label="Tranches en retard"
                value={formatMetricValue(collectionData.lateInstallments.value, 'count')}
              />
              <MiniStat
                label="Montant en retard"
                value={formatMetricValue(collectionData.lateAmount.value, 'currency')}
              />
              <MiniStat
                label="Élèves à jour"
                value={formatMetricValue(collectionData.studentsUpToDate.value, 'percent')}
              />
            </div>
            <BarChart points={collectionData.byInstallmentNumber.points} unit="currency" />
          </>
        )}
      </OwnerSection>

      <div className="grid gap-4 lg:grid-cols-2">
        <OwnerSection title="Recettes par type de frais" subtitle="Ce que recouvre le montant facturé.">
          {revenue.isLoading || !revenueData ? (
            <Skeleton height={180} className="rounded-lg" />
          ) : (
            <DonutChart
              points={revenueData.byFeeType.points}
              unit="currency"
              centerLabel="facturé"
              centerValue={formatMetricValue(data?.invoiced.value ?? null, 'currency')}
            />
          )}
        </OwnerSection>

        <OwnerSection title="Encaissé par mode de paiement" subtitle="Espèces, chèque, virement, mobile money.">
          {revenue.isLoading || !revenueData ? (
            <Skeleton height={180} className="rounded-lg" />
          ) : (
            <DonutChart points={revenueData.byPaymentMethod.points} unit="currency" centerLabel="encaissé" />
          )}
        </OwnerSection>
      </div>

      <OwnerSection
        title="Saisonnalité des encaissements"
        subtitle="Douze mois, de septembre à août, avec l'année de comparaison en surimpression."
      >
        {seasonality.isLoading || !seasonalityData ? (
          <Skeleton height={220} className="rounded-lg" />
        ) : (
          <>
            <LineChart
              series={[
                { key: 'current', label: 'Encaissé', points: seasonalityData.monthly.points },
                {
                  key: 'previous',
                  label: 'Année de comparaison',
                  points: seasonalityData.monthly.points.map((point) => ({
                    ...point,
                    value: point.previous ?? null,
                  })),
                },
                ...(seasonalityData.expenses
                  ? [
                      {
                        key: 'expenses',
                        label: 'Dépenses',
                        points: seasonalityData.expenses.points,
                      },
                    ]
                  : []),
              ]}
            />
            {!seasonalityData.expenses && (
              <p className="ds-chart-note">
                Aucune dépense saisie pour cette année : la courbe des charges est absente, elle
                n'est pas à zéro.
              </p>
            )}
          </>
        )}
      </OwnerSection>

      <div className="grid gap-4 lg:grid-cols-2">
        <OwnerSection
          title="Créance par classe"
          subtitle="Agrégée par classe — un impayé ne désigne jamais une famille."
          action={
            debtorsData ? (
              <span className="ds-bar-value">
                3 classes concentrent {formatMetricValue(debtorsData.concentration.value, 'percent')}
              </span>
            ) : undefined
          }
        >
          {debtors.isLoading || !debtorsData ? (
            <Skeleton height={180} className="rounded-lg" />
          ) : debtorsData.byClass.points.length === 0 ? (
            <OwnerEmptyState title="Aucun impayé sur cette année." />
          ) : (
            <BarChart points={debtorsData.byClass.points} unit="currency" />
          )}
        </OwnerSection>

        <OwnerSection title="Recettes par niveau" subtitle="Facturé par niveau de classe.">
          {revenue.isLoading || !revenueData ? (
            <Skeleton height={180} className="rounded-lg" />
          ) : (
            <BarChart points={revenueData.byLevel.points} unit="currency" />
          )}
        </OwnerSection>
      </div>

      <OwnerSection
        title="Grille tarifaire et écarts"
        subtitle="Tarif de référence par niveau, et écart avec le montant réellement facturé."
      >
        {revenue.isLoading || !revenueData ? (
          <Skeleton height={180} className="rounded-lg" />
        ) : revenueData.feeRates.length === 0 ? (
          <OwnerEmptyState
            variant="info"
            title="Aucune grille tarifaire"
            description="Sans tarif de référence, l'écart entre tarif et facturé n'est pas calculable."
          />
        ) : (
          <div className="ds-owner-table-wrap">
            <table className="ds-owner-table">
              <thead>
                <tr>
                  <th>Niveau</th>
                  <th className="ds-num">Tarif de référence</th>
                  <th>Régime</th>
                  <th className="ds-num">Écart au facturé</th>
                </tr>
              </thead>
              <tbody>
                {revenueData.feeRates.map((rate) => {
                  const gap = revenueData.rateGap.points.find((point) => point.key === rate.level);
                  return (
                    <tr key={`${rate.level}-${rate.stateAssigned}`}>
                      <td data-label="Niveau">{rate.level}</td>
                      <td data-label="Tarif" className="ds-num">
                        {formatMetricValue(rate.amount, 'currency')}
                      </td>
                      <td data-label="Régime">
                        {rate.stateAssigned ? "Affecté par l'État" : 'Standard'}
                      </td>
                      <td data-label="Écart" className="ds-num">
                        {rate.stateAssigned ? '—' : formatMetricValue(gap?.value ?? null, 'currency')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="ds-chart-note">
              Manque à gagner « affectés État » :{' '}
              {formatMetricValue(revenueData.stateAssignedGap.value, 'currency')}
            </p>
          </div>
        )}
      </OwnerSection>

      <OwnerSection
        title="Structure des échéanciers"
        subtitle="Nombre de tranches et étalement, par condition de paiement."
      >
        {revenue.isLoading || !revenueData ? (
          <Skeleton height={140} className="rounded-lg" />
        ) : revenueData.conditionStructure.length === 0 ? (
          <OwnerEmptyState title="Aucune condition de paiement définie." />
        ) : (
          <div className="ds-owner-table-wrap">
            <table className="ds-owner-table">
              <thead>
                <tr>
                  <th>Échéancier</th>
                  <th className="ds-num">Tranches</th>
                  <th className="ds-num">Étalement</th>
                </tr>
              </thead>
              <tbody>
                {revenueData.conditionStructure.map((condition) => (
                  <tr key={condition.key}>
                    <td data-label="Échéancier">{condition.label}</td>
                    <td data-label="Tranches" className="ds-num">{condition.lines}</td>
                    <td data-label="Étalement" className="ds-num">
                      {condition.maxDelayDays === null ? '—' : `${condition.maxDelayDays} j`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OwnerSection>

      <ExpensesSection state={expenses} />

      <OwnerSection
        title="Évolution pluriannuelle"
        subtitle="Facturé et encaissé sur les cinq dernières années."
      >
        {timeline.isLoading || !timeline.data ? (
          <Skeleton height={220} className="rounded-lg" />
        ) : (
          <LineChart
            series={[
              { key: 'invoiced', label: 'Facturé', points: timeline.data.data.series[0]?.points ?? [] },
              { key: 'collected', label: 'Encaissé', points: timeline.data.data.series[1]?.points ?? [] },
            ]}
          />
        )}
      </OwnerSection>
    </OwnerPage>
  );
}

// ===========================================================================
// Dépenses, budgets et marge
// ===========================================================================

function ExpensesSection({
  state,
}: {
  state: ReturnType<typeof useOwnerFinanceExpenses>;
}) {
  const data = state.data?.data;

  return (
    <OwnerSection
      title="Dépenses et marge"
      subtitle="Charges approuvées, exécution budgétaire et résultat d'exploitation."
    >
      {state.isLoading || !data ? (
        <Skeleton height={200} className="rounded-lg" />
      ) : (
        <>
          {data.unavailable.length > 0 && (
            <OwnerEmptyState
              variant="info"
              title="Modules non alimentés"
              description={`Aucune donnée pour : ${data.unavailable
                .map((domain) => DOMAIN_LABELS[domain] ?? domain)
                .join(', ')}. Ces écrans de saisie ne sont pas encore déployés — les montants restent vides plutôt que d'être affichés à zéro.`}
              className="mb-3"
            />
          )}

          <div className="ds-stat-grid mb-4" style={{ ['--ds-stat-cols' as string]: '4' }}>
            <MiniStat
              label="Dépenses"
              value={formatMetricValue(data.total.value, 'currency')}
            />
            <MiniStat
              label="En attente d'approbation"
              value={formatMetricValue(data.pendingApproval.value, 'currency')}
            />
            <MiniStat label="Marge" value={formatMetricValue(data.margin.value, 'currency')} />
            <MiniStat
              label="Poids de la masse salariale"
              value={formatMetricValue(data.payrollShare.value, 'percent')}
            />
          </div>

          {data.margin.value === null && (
            <p className="ds-chart-note">
              La marge exige que les dépenses <strong>et</strong> la paie soient alimentées : sans
              les deux, un résultat calculé serait flatteur et faux.
            </p>
          )}

          {data.byCategory.points.length > 0 && (
            <DonutChart points={data.byCategory.points} unit="currency" centerLabel="dépenses" />
          )}

          {data.budgetPlanVsActual.length > 0 && (
            <div className="ds-owner-table-wrap" style={{ marginTop: 14 }}>
              <table className="ds-owner-table">
                <thead>
                  <tr>
                    <th>Poste</th>
                    <th className="ds-num">Prévu</th>
                    <th className="ds-num">Réalisé</th>
                    <th className="ds-num">Reste</th>
                    <th className="ds-num">Exécution</th>
                  </tr>
                </thead>
                <tbody>
                  {data.budgetPlanVsActual.map((row) => (
                    <tr key={row.key}>
                      <td data-label="Poste">{row.label}</td>
                      <td data-label="Prévu" className="ds-num">
                        {formatMetricValue(row.planned, 'currency')}
                      </td>
                      <td data-label="Réalisé" className="ds-num">
                        {formatMetricValue(row.spent, 'currency')}
                      </td>
                      <td data-label="Reste" className="ds-num">
                        {formatMetricValue(row.remaining, 'currency')}
                      </td>
                      <td data-label="Exécution" className="ds-num">
                        {row.planned > 0
                          ? `${formatDecimal((row.spent / row.planned) * 100)} %`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </OwnerSection>
  );
}

const DOMAIN_LABELS: Record<string, string> = {
  expenses: 'dépenses',
  payroll: 'paie',
  budgets: 'budgets',
  invoices: 'facturation',
  installments: 'échéanciers',
  'fee-rates': 'grille tarifaire',
};

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
        <CreditCard width={18} height={18} />
      </span>
    </div>
  );
}
