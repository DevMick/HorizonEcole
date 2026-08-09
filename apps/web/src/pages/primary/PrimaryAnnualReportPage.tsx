import { useEffect, useState } from 'react';
import { Award, Medal, Printer, TrendingUp, Trophy, Users } from 'lucide-react';
import { Table } from 'antd';
import { useAcademicYears } from '../../lib/hooks/useAcademicYears';
import {
  PRIMARY_STATUS_LABELS,
  fmtNote,
  openPrimaryPdf,
  rankLabel,
  useMyPrimaryClasses,
  usePrimaryAnnualReport,
  type PrimaryStatus,
} from '../../lib/hooks/usePrimary';
import { Button, Card, Skeleton, StatusBadge, toast, type BadgeStatus } from '../../components/ds';
import {
  AverageChip,
  ClassBanner,
  EmptyCard,
  NoClassState,
  PrimaryPageHead,
  StatGrid,
  StatTile,
  YearFilterCard,
} from '../../components/primary/PrimaryTeacherShell';

/**
 * « Bilan annuel » — la synthèse de l'année pour la classe du titulaire.
 *
 * Chaque élève y a une carte : sa moyenne à chacune des compositions, sa moyenne
 * annuelle, son rang et sa décision. C'est le tableau que le conseil des maîtres
 * lit en fin d'année, avant de trancher les cas « à examiner » — ceux qui tombent
 * entre les deux seuils de la classe.
 *
 * Le classement se lit du 1er au dernier, comme la fiche papier : d'où la liste
 * ordonnée par rang plutôt qu'un tableau à trier.
 */

const STATUS_TONE: Record<PrimaryStatus, BadgeStatus> = {
  ADMIS: 'success',
  EXAMEN: 'warning',
  REDOUBLE: 'danger',
  NON_CLASSE: 'neutral',
};

export default function PrimaryAnnualReportPage() {
  const { data: academicYears, currentYear } = useAcademicYears();
  const [academicYearId, setAcademicYearId] = useState<string>('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!academicYearId && currentYear?.id) setAcademicYearId(currentYear.id);
  }, [currentYear?.id, academicYearId]);

  const { data: mine, isLoading: loadingClass } = useMyPrimaryClasses(academicYearId || undefined);
  const schoolClass = mine?.classes?.[0] ?? null;

  const { data: report, isLoading } = usePrimaryAnnualReport(
    schoolClass?.id,
    academicYearId || undefined,
  );

  const exportReport = async () => {
    if (!schoolClass?.id || !academicYearId) return;
    setExporting(true);
    try {
      await openPrimaryPdf(
        `/primary/results/class/${schoolClass.id}/annual-report.pdf?academicYearId=${academicYearId}`,
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Génération du bilan impossible.');
    } finally {
      setExporting(false);
    }
  };

  if (loadingClass) {
    return (
      <div className="animate-fade-in mx-auto max-w-5xl space-y-4">
        <Skeleton height={70} className="rounded-lg" />
        <Skeleton height={92} className="rounded-lg" />
      </div>
    );
  }

  if (!schoolClass) {
    return <NoClassState title="Bilan annuel" subtitle="La synthèse de l'année de votre classe." />;
  }

  const evaluations = report?.evaluations || [];
  const rows = [...(report?.results || [])].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

  return (
    <div className="animate-fade-in mx-auto max-w-5xl">
      <PrimaryPageHead
        title="Bilan annuel"
        subtitle="Moyennes, rangs et décisions de fin d'année, tels qu'ils seront lus au conseil des maîtres."
      />

      <ClassBanner
        className={schoolClass.name}
        level={schoolClass.level}
        studentsCount={schoolClass.studentsCount}
        yearName={academicYears?.find((year: any) => year.id === academicYearId)?.name}
      />

      <YearFilterCard
        years={academicYears || []}
        yearId={academicYearId}
        onYearChange={setAcademicYearId}
      >
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 sm:justify-end lg:col-span-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Printer aria-hidden />}
            onClick={exportReport}
            loading={exporting}
            disabled={!report || evaluations.length === 0}
          >
            Bilan (PDF)
          </Button>
        </div>
      </YearFilterCard>

      {isLoading ? (
        <>
          <StatGrid loading />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} height={96} className="rounded-lg" />
            ))}
          </div>
        </>
      ) : !report || evaluations.length === 0 ? (
        <EmptyCard
          icon={Trophy}
          title="Bilan indisponible"
          text="Aucune composition n'a encore été ouverte pour cette année scolaire. Le bilan se construit à partir des compositions notées."
        />
      ) : (
        <>
          <StatGrid>
            <StatTile label="Effectif" value={report.stats.enrolled} icon={Users} />
            <StatTile
              label="Moyenne de la classe"
              value={fmtNote(report.stats.classAverage)}
              icon={TrendingUp}
              accent="info"
            />
            <StatTile label="Admis" value={report.stats.admitted} icon={Award} accent="success" />
            <StatTile
              label="Taux de réussite"
              value={
                report.stats.successRate === null ? '—' : `${fmtNote(report.stats.successRate)}%`
              }
              icon={Trophy}
              accent={
                report.stats.successRate === null || report.stats.successRate >= 75
                  ? 'success'
                  : 'warning'
              }
            />
          </StatGrid>

          {/* Les décisions et les règles qui les produisent, avant la liste. */}
          <Card accent className="mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="font-display text-ds-text">Décisions de fin d'année</strong>
              <StatusBadge status="success">{report.stats.admitted} admis</StatusBadge>
              <StatusBadge status="warning">{report.stats.underReview} à examiner</StatusBadge>
              <StatusBadge status="danger">{report.stats.repeating} redoublent</StatusBadge>
            </div>
            <p className="mt-2 text-[.78rem] text-ds-text-tertiary">
              Admission à partir de {fmtNote(report.thresholds.admission)}/{report.scale} ·
              redoublement en dessous de {fmtNote(report.thresholds.redoublement)}/{report.scale} ·
              moyenne annuelle = moyenne des compositions composées.
            </p>
          </Card>

          {rows.length === 0 ? (
            <EmptyCard
              icon={Users}
              title="Aucun élève inscrit"
              text="Le bilan s'affichera dès que des élèves seront inscrits dans cette classe."
            />
          ) : (
            <Card padded={false} className="mb-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ds-border px-4 py-3">
                <strong className="font-display text-ds-text">Classement annuel</strong>
                <span className="ds-badge ds-badge-neutral">{rows.length}</span>
              </div>
              <Table
                rowKey="studentId"
                dataSource={rows}
                pagination={false}
                size="small"
                scroll={{ x: 'max-content' }}
                rowClassName={(row) => (row.status === 'REDOUBLE' ? 'opacity-60' : '')}
                columns={[
                  {
                    title: 'RANG',
                    key: 'rank',
                    width: 80,
                    align: 'center' as const,
                    onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' as const } }),
                    render: (_: unknown, row: any) => (
                      <span className="font-medium tabular-nums">
                        {rankLabel(row.rank, row.isExAequo)}
                      </span>
                    ),
                  },
                  {
                    title: 'Nom et Prénoms',
                    key: 'fullName',
                    render: (_: unknown, row: any) => (
                      <span className="font-medium">{row.fullName}</span>
                    ),
                  },
                  ...evaluations.map((evaluation: any) => ({
                    title: evaluation.name,
                    key: evaluation.id,
                    width: 110,
                    align: 'center' as const,
                    onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' as const } }),
                    render: (_: unknown, row: any) => (
                      <span className="tabular-nums">{fmtNote(row.averages[evaluation.id])}</span>
                    ),
                  })),
                  {
                    title: 'MOY. ANNUELLE',
                    key: 'yearAverage',
                    width: 120,
                    align: 'center' as const,
                    onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' as const } }),
                    render: (_: unknown, row: any) => (
                      <strong
                        className={
                          row.yearAverage === null
                            ? 'text-ds-text-tertiary'
                            : row.yearAverage >= report.thresholds.admission
                              ? 'text-emerald-600'
                              : row.yearAverage < report.thresholds.redoublement
                                ? 'text-red-600'
                                : 'text-amber-600'
                        }
                      >
                        {fmtNote(row.yearAverage)}
                      </strong>
                    ),
                  },
                  {
                    title: 'MENTION',
                    key: 'mention',
                    width: 110,
                    align: 'center' as const,
                    render: (_: unknown, row: any) => row.mention ?? '—',
                  },
                  {
                    title: 'DÉCISION',
                    key: 'status',
                    width: 120,
                    align: 'center' as const,
                    render: (_: unknown, row: any) => (
                      <StatusBadge status={STATUS_TONE[row.status as PrimaryStatus]} icon={false}>
                        {PRIMARY_STATUS_LABELS[row.status as PrimaryStatus]}
                      </StatusBadge>
                    ),
                  },
                ]}
              />
            </Card>
          )}

          {report.stats.underReview > 0 && (
            <Card accent="warning" className="mt-4">
              <div className="flex items-start gap-3">
                <span className="ds-stat-medallion" aria-hidden>
                  <Medal width={20} height={20} />
                </span>
                <div>
                  <strong className="font-display text-ds-text">
                    {report.stats.underReview} élève(s) à examiner
                  </strong>
                  <p className="mt-1 text-sm text-ds-text-secondary">
                    Leur moyenne annuelle tombe entre le seuil de redoublement et celui
                    d'admission : la décision n'est pas automatique, elle revient au conseil des
                    maîtres.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
