import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select } from 'antd';
import { Award, FileText, PenSquare, Trophy, Users } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { useAuthStore } from '../../lib/store';
import { useAcademicYears } from '../../lib/hooks/useAcademicYears';
import {
  fmtNote,
  fmtShort,
  openPrimaryPdf,
  rankLabel,
  useMyPrimaryClasses,
  usePrimaryClasses,
  usePrimaryEvaluations,
  usePrimaryResults,
  type PrimaryResults,
  type PrimaryStatus,
} from '../../lib/hooks/usePrimary';
import { Button, Card, Skeleton, StatusBadge, toast, type BadgeStatus } from '../../components/ds';
import {
  AverageChip,
  ClassBanner,
  EmptyCard,
  ListHead,
  PrimaryPageHead,
  StatGrid,
  StatTile,
} from '../../components/primary/PrimaryTeacherShell';
dayjs.locale('fr');

const STATUS_TONE: Record<PrimaryStatus, BadgeStatus> = {
  ADMIS: 'success',
  EXAMEN: 'warning',
  REDOUBLE: 'danger',
  NON_CLASSE: 'neutral',
};

/** Détecte si l'évaluation est la Composition de Passage (ou Examen Blanc 2 pour CM2). */
function isPassageEval(name: string | undefined): boolean {
  if (!name) return false;
  const n = name.trim().toUpperCase();
  return (
    n.includes('COMPOSITION DE PASSAGE') ||
    n.includes('COMPOS PASSAGE') ||
    n.includes('EXAMEN BLANC 2') ||
    n === 'EB 2' ||
    n === 'EB2'
  );
}

/**
 * Résultats & Bulletins du primaire.
 *
 * Visualisation des fiches de classement par composition, impression des
 * bulletins individuels et en bloc, et — pour la Composition de Passage —
 * tableau de synthèse annuelle avec la MGA calculée selon la formule :
 *
 *   Non-CM2 : MGA = (moyAnnuelle × 1 + moyPassage × 2) / 3
 *             où moyAnnuelle = moy(C1, C2, C3) sur les compositions saisies
 *   CM2     : MGA = (C1 × 1 + C2 × 1 + EB1 × 2 + EB2 × 2) / 6
 */
export default function PrimaryGradeEntryPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';

  const { data: academicYears, currentYear } = useAcademicYears();
  const [academicYearId, setAcademicYearId] = useState<string>('');
  const [classId, setClassId] = useState<string>('');
  const [evaluationId, setEvaluationId] = useState<string>('');
  const [printing, setPrinting] = useState<string | null>(null);

  useEffect(() => {
    if (!academicYearId && currentYear?.id) setAcademicYearId(currentYear.id);
  }, [currentYear?.id, academicYearId]);

  const adminClasses = usePrimaryClasses(academicYearId || undefined, isAdmin);
  const myClasses = useMyPrimaryClasses(academicYearId || undefined, !isAdmin);

  const classOptions = isAdmin
    ? (adminClasses.data || []).map((item) => ({ value: item.id, label: item.name }))
    : (myClasses.data?.classes || []).map((item) => ({ value: item.id, label: item.name }));

  const { data: evaluations } = usePrimaryEvaluations(
    academicYearId || undefined,
    classId || undefined,
  );

  useEffect(() => {
    if (classId || classOptions.length === 0) return;
    if (evaluations === undefined) return;
    const firstWithEval = classOptions.find((opt) =>
      evaluations.some((ev) => ev.classId === opt.value),
    );
    setClassId(firstWithEval?.value ?? classOptions[0].value);
  }, [classOptions, classId, evaluations]);

  useEffect(() => {
    const list = evaluations || [];
    if (list.length === 0) { setEvaluationId(''); return; }
    if (!list.some((item) => item.id === evaluationId)) setEvaluationId(list[0].id);
  }, [evaluations, evaluationId]);

  const { data: results, isLoading } = usePrimaryResults(evaluationId || undefined);

  const print = async (kind: 'ranking' | 'bulletins' | 'annual') => {
    if (kind === 'annual' ? !classId || !academicYearId : !evaluationId) return;
    setPrinting(kind);
    try {
      const url =
        kind === 'ranking'
          ? `/primary/results/${evaluationId}/ranking.pdf`
          : kind === 'bulletins'
            ? `/primary/results/${evaluationId}/bulletins.pdf`
            : `/primary/results/class/${classId}/annual-report.pdf?academicYearId=${academicYearId}`;
      await openPrimaryPdf(url);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Génération du document impossible.');
    } finally {
      setPrinting(null);
    }
  };

  const myClass = myClasses.data?.classes?.[0];

  return (
    <div className="animate-fade-in mx-auto max-w-[100rem]">
      <PrimaryPageHead
        title="Résultats & Bulletins"
        subtitle="Fiches de classement, bulletins individuels et synthèse annuelle par composition."
      />

      {!isAdmin && myClass && (
        <ClassBanner
          className={myClass.name}
          level={myClass.level}
          studentsCount={myClass.studentsCount}
          yearName={academicYears?.find((year: any) => year.id === academicYearId)?.name}
        />
      )}

      <Card className="mb-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="ds-field">
            <span>Année scolaire</span>
            <Select
              value={academicYearId || undefined}
              onChange={(v) => { setAcademicYearId(v); setClassId(''); setEvaluationId(''); }}
              style={{ width: '100%' }}
              options={(academicYears || []).map((year: any) => ({
                value: year.id,
                label: `${year.name}${year.isCurrent ? ' (En cours)' : ''}`,
              }))}
            />
          </label>
          {isAdmin && (
            <label className="ds-field">
              <span>Classe</span>
              <Select
                value={classId || undefined}
                onChange={(v) => { setClassId(v); setEvaluationId(''); }}
                placeholder="Sélectionnez une classe"
                style={{ width: '100%' }}
                options={classOptions}
              />
            </label>
          )}
          <label className="ds-field">
            <span>Composition</span>
            <Select
              value={evaluationId || undefined}
              onChange={setEvaluationId}
              placeholder="Sélectionnez une composition"
              style={{ width: '100%' }}
              options={(evaluations || []).map((item) => ({
                value: item.id,
                label: `${item.name} — ${dayjs(item.date).format('DD/MM/YYYY')}`,
              }))}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-ds-border pt-4 lg:justify-end">
          <Button
            size="sm"
            icon={<PenSquare aria-hidden />}
            onClick={() => navigate(`/primary/saisie${evaluationId ? `?evaluationId=${evaluationId}` : ''}`)}
            disabled={!evaluationId}
          >
            Saisir les notes
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<FileText aria-hidden />}
            onClick={() => print('ranking')}
            loading={printing === 'ranking'}
            disabled={!evaluationId}
          >
            Fiche de classement (PDF)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<FileText aria-hidden />}
            onClick={() => print('bulletins')}
            loading={printing === 'bulletins'}
            disabled={!evaluationId}
          >
            Bulletins de la classe
          </Button>
          <Button
            size="sm"
            icon={<FileText aria-hidden />}
            onClick={() => print('annual')}
            loading={printing === 'annual'}
            disabled={!classId || !academicYearId || (evaluations || []).length === 0}
          >
            Bilan annuel (PDF)
          </Button>
        </div>
      </Card>

      {!evaluationId ? (
        <EmptyCard
          icon={Trophy}
          title="Aucune composition sélectionnée"
          text={
            isAdmin
              ? 'Choisissez une classe et une composition pour afficher les résultats.'
              : "Aucune composition n'a encore été ouverte pour votre classe cette année."
          }
        />
      ) : isLoading || !results ? (
        <>
          <StatGrid loading />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height={72} className="rounded-lg" />
            ))}
          </div>
        </>
      ) : (
        <ResultsView results={results} evaluationId={evaluationId} />
      )}

    </div>
  );
}

// ---------------------------------------------------------------------------
// Fiche de classement (résultats d'une composition)
// ---------------------------------------------------------------------------

const COMP_STATUS_LABELS: Record<PrimaryStatus, string> = {
  ADMIS: 'Admis(e)',
  EXAMEN: 'À examiner',
  REDOUBLE: 'Insuffisant(e)',
  NON_CLASSE: 'Non classé(e)',
};

function ResultsView({ results, evaluationId }: { results: PrimaryResults; evaluationId: string }) {
  const scale = results.evaluation.averageScale;
  const [printingStudent, setPrintingStudent] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => { setPage(1); }, [evaluationId]);

  const printStudentBulletin = async (studentId: string) => {
    setPrintingStudent(studentId);
    try {
      await openPrimaryPdf(`/primary/results/${evaluationId}/bulletins/${studentId}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Génération du bulletin impossible.');
    } finally {
      setPrintingStudent(null);
    }
  };

  const recapRows = [
    { key: 'boys', label: 'Garçons', data: results.recap.boys },
    { key: 'girls', label: 'Filles', data: results.recap.girls },
    { key: 'total', label: 'Total', data: results.recap.total },
  ];

  const total = results.results.length;
  const startIdx = (page - 1) * pageSize;
  const pagedResults = results.results.slice(startIdx, startIdx + pageSize);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <StatGrid>
        <StatTile label="Moyenne de la classe" value={`${fmtNote(results.stats.classAverage)}/${scale}`} icon={Trophy} />
        <StatTile label="Ont composé" value={`${results.stats.composed}/${results.stats.enrolled}`} icon={Users} accent="info" />
        <StatTile
          label="Taux de réussite"
          value={results.stats.successRate === null ? '—' : `${fmtNote(results.stats.successRate)}%`}
          icon={Award}
          accent={results.stats.successRate === null || results.stats.successRate >= 75 ? 'success' : 'warning'}
        />
        <StatTile label="Plus forte moyenne" value={fmtNote(results.stats.bestAverage)} icon={Trophy} accent="success" />
      </StatGrid>

      {/* Contexte de la composition */}
      <Card accent className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="font-display text-ds-text">
            {results.class.name} — {results.evaluation.name}
          </strong>
          <span className="ds-badge ds-badge-neutral font-mono">
            total ÷ {fmtShort(results.evaluation.divisor)} → /{scale}
          </span>
          {results.evaluation.isExam && (
            <StatusBadge status="role" icon={false}>Examen blanc</StatusBadge>
          )}
        </div>
        <p className="mt-2 text-[.78rem] text-ds-text-tertiary">
          Admission à partir de {fmtShort(results.thresholds.admission)}/{scale} · insuffisant en
          dessous de {fmtShort(results.thresholds.redoublement)}/{scale}. Une matière non saisie
          compte 0 ; un élève absent n'est pas classé.
        </p>
      </Card>

      {/* Cartes élèves */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {pagedResults.map((record) => (
          <Card key={record.studentId} className={record.isAbsent ? 'opacity-70' : undefined}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <strong className="block font-display text-ds-text">{record.fullName}</strong>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[.74rem] text-ds-text-tertiary">
                  <span className="font-mono">{record.studentNumber}</span>
                  <span>· {rankLabel(record.rank, record.isExAequo)}</span>
                  {record.mention && <span>· {record.mention}</span>}
                </span>
                {record.missingCount > 0 && !record.isAbsent && (
                  <span className="mt-0.5 block text-[.72rem] text-amber-600">
                    {record.missingCount} note{record.missingCount > 1 ? 's' : ''} manquante{record.missingCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex flex-none flex-col items-end gap-1">
                <AverageChip
                  value={record.isAbsent ? null : record.average}
                  scale={scale}
                  threshold={results.thresholds.admission}
                />
                <StatusBadge status={STATUS_TONE[record.status]} icon={false}>
                  {COMP_STATUS_LABELS[record.status]}
                </StatusBadge>
              </div>
            </div>

            {record.isAbsent ? (
              <p className="mt-3 border-t border-ds-border pt-3 text-[.78rem] italic text-ds-text-tertiary">
                Élève absent à cette composition — non classé.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-ds-border pt-3">
                {results.subjects.map((subject) => {
                  const note = record.notes[subject.subjectId];
                  return (
                    <span
                      key={subject.subjectId}
                      className="flex min-w-[84px] flex-col rounded-md bg-ds-subtle px-2.5 py-1.5"
                    >
                      <span className="truncate text-[.68rem] text-ds-text-tertiary">
                        {subject.name} /{subject.maxScore}
                      </span>
                      <span className="font-mono text-[.82rem] font-bold text-ds-text">
                        {note === null || note === undefined ? '—' : fmtNote(note)}
                      </span>
                    </span>
                  );
                })}
                <span className="flex min-w-[84px] flex-col rounded-md bg-ds-subtle px-2.5 py-1.5">
                  <span className="text-[.68rem] text-ds-text-tertiary">
                    Total /{results.totalMaxScore}
                  </span>
                  <span className="font-mono text-[.82rem] font-bold text-ds-text">
                    {fmtNote(record.total)}
                  </span>
                </span>
              </div>
            )}

            <div className="mt-2 flex justify-end border-t border-ds-border pt-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<FileText aria-hidden />}
                onClick={() => printStudentBulletin(record.studentId)}
                loading={printingStudent === record.studentId}
              >
                Bulletin
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {total > 5 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[.82rem] text-ds-text-secondary">
            {startIdx + 1}–{Math.min(startIdx + pageSize, total)} sur {total} élève(s)
          </span>
          <div className="flex items-center gap-2">
            <Select
              value={pageSize}
              onChange={(v) => { setPageSize(v); setPage(1); }}
              size="small"
              style={{ width: 120 }}
              options={[
                { value: 5, label: '5 par page' },
                { value: 10, label: '10 par page' },
                { value: 50, label: '50 par page' },
              ]}
            />
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ‹
            </Button>
            <span className="min-w-[4rem] text-center text-[.82rem] text-ds-text">
              {page} / {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              ›
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

