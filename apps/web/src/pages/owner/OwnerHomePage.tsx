import { useState } from 'react';

import {
  DeltaBadge,
  LineChart,
  OwnerClassFilter,
  OwnerEmptyState,
  OwnerPage,
  OwnerSection,
  formatMetricValue,
} from '../../components/owner';
import { Card, Skeleton } from '../../components/ds';
import {
  useOwnerContext,
  useOwnerEnrollmentTimeline,
  useOwnerFinanceSeasonality,
  useOwnerSummary,
  type OwnerSummaryKpi,
} from '../../lib/hooks/useOwner';

const SCHOOL_TYPE_LABEL: Record<string, string> = {
  PRIMAIRE: 'École primaire',
  COLLEGE: 'Collège',
  LYCEE: 'Lycée',
};

/**
 * Vue d'ensemble — les indicateurs clés et deux courbes.
 *
 * Les cartes ne sont pas un résumé décoratif : ce sont **les mêmes
 * indicateurs** que les écrans de détail, produits par les mêmes fonctions. Une
 * page d'accueil qui recalculerait ses chiffres finirait par en afficher
 * d'autres que les écrans qu'elle résume — et c'est l'accueil qu'on croit sur
 * parole.
 */
export default function OwnerHomePage() {
  // Les indicateurs se recalculent sur la classe retenue. Les deux courbes du
  // bas, elles, restent à l'échelle de l'établissement : effectifs sur cinq ans
  // et trésorerie mensuelle n'ont pas de sens classe par classe.
  const [classId, setClassId] = useState<string | undefined>(undefined);

  const context = useOwnerContext();
  const summary = useOwnerSummary({ classId });
  const timeline = useOwnerEnrollmentTimeline(5);
  const seasonality = useOwnerFinanceSeasonality();

  const establishment = context.data?.establishment;
  const data = summary.data?.data;

  if (context.isError || summary.isError) {
    return (
      <OwnerPage title="Vue d'ensemble">
        <OwnerEmptyState
          variant="danger"
          title="Impossible de charger la synthèse"
          description="La lecture des indicateurs a échoué. Vérifiez votre connexion, puis réessayez."
          action={{ label: 'Réessayer', onClick: () => summary.refetch() }}
        />
      </OwnerPage>
    );
  }

  return (
    <OwnerPage
      title="Vue d'ensemble"
      subtitle={
        establishment
          ? `${establishment.name} — ${SCHOOL_TYPE_LABEL[establishment.schoolType] ?? establishment.schoolType}`
          : 'Le pilotage de votre établissement'
      }
    >
      <div className="ds-owner-filters">
        <OwnerClassFilter value={classId} onChange={setClassId} />
      </div>

      {/* Huit cartes en primaire pur, neuf dès que le secondaire est ouvert
          (le taux de présence s'y ajoute). Le squelette en montre huit : mieux
          vaut une case qui s'ajoute qu'une case qui disparaît une fois la
          réponse arrivée. */}
      <div className="ds-stat-grid">
        {summary.isLoading || !data
          ? Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} height={92} className="rounded-lg" />
            ))
          : data.kpis.map((kpi) => <SummaryCard key={kpi.key} kpi={kpi} />)}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <OwnerSection title="Effectifs sur 5 ans" subtitle="Inscrits et nouveaux élèves, par année.">
          {timeline.isLoading || !timeline.data ? (
            <Skeleton height={200} className="rounded-lg" />
          ) : (
            <LineChart
              series={[
                {
                  key: 'total',
                  label: 'Inscrits',
                  points: timeline.data.data.series[0]?.points ?? [],
                },
                {
                  key: 'new',
                  label: 'Nouveaux',
                  points: timeline.data.data.series[1]?.points ?? [],
                },
              ]}
            />
          )}
        </OwnerSection>

        <OwnerSection
          title="Encaissements mensuels"
          subtitle="De septembre à août, avec l'année de comparaison en surimpression."
        >
          {seasonality.isLoading || !seasonality.data ? (
            <Skeleton height={200} className="rounded-lg" />
          ) : (
            <LineChart
              series={[
                {
                  key: 'current',
                  label: 'Encaissé',
                  points: seasonality.data.data.monthly.points,
                },
                {
                  key: 'previous',
                  label: 'Année de comparaison',
                  points: seasonality.data.data.monthly.points.map((point) => ({
                    ...point,
                    value: point.previous ?? null,
                  })),
                },
              ]}
              unit="currency"
            />
          )}
        </OwnerSection>
      </div>
    </OwnerPage>
  );
}

// ===========================================================================
// Fragments
// ===========================================================================

const ACCENT_TO_CARD: Record<OwnerSummaryKpi['accent'], boolean | 'success' | 'warning' | 'danger' | 'info'> = {
  role: true,
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
};

function SummaryCard({ kpi }: { kpi: OwnerSummaryKpi }) {
  return (
    <Card accent={ACCENT_TO_CARD[kpi.accent]} className="ds-stat">
      <div className="ds-stat-body">
        <span className="ds-stat-label">{kpi.label}</span>
        <span className="ds-stat-value">
          {formatMetricValue(kpi.metric.value, kpi.metric.unit)}
        </span>
        <DeltaBadge
          delta={kpi.metric.delta}
          deltaPct={kpi.metric.deltaPct}
          unit={kpi.metric.unit}
          polarity={kpi.key === 'outstanding' ? 'lower-is-better' : 'higher-is-better'}
        />
      </div>
      {/* Le code d'indicateur reste lisible par les lecteurs d'écran : il dit
          d'où vient le chiffre, ce qui vaut mieux qu'une infobulle au survol. */}
      <span className="ds-stat-source" aria-label={`Indicateur ${kpi.source}`}>
        {kpi.source}
      </span>
    </Card>
  );
}

