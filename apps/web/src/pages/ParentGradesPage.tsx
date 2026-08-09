import { useEffect, useMemo, useState } from 'react';
import { Select } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { Award, Trophy, Users } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { api } from '../lib/api';
import { ChildSwitcher } from '../components/parent/ChildSwitcher';
import { GradesBoard } from '../components/school/GradesBoard';
import { BulletinsBoard } from '../components/school/BulletinsBoard';
import { SchoolFiltersCard } from '../components/school/SchoolFiltersCard';
import { useAcademicYears, useActiveChild, fullName } from '../lib/hooks/useParentSpace';
import { Card, Skeleton, StatusBadge } from '../components/ds';
import {
  AverageChip,
  EmptyCard,
  PrimaryPageHead,
  StatGrid,
  StatTile,
} from '../components/primary/PrimaryTeacherShell';
import { fmtNote, fmtShort, rankLabel } from '../lib/hooks/usePrimary';
import type { PrimaryReport } from '../components/school/PrimaryReportBoard';

dayjs.locale('fr');

const STATUS_TONE = {
  ADMIS: 'success',
  EXAMEN: 'warning',
  REDOUBLE: 'danger',
  NON_CLASSE: 'neutral',
} as const;

const STATUS_LABELS: Record<string, string> = {
  ADMIS: 'Admis(e)',
  EXAMEN: 'À examiner',
  REDOUBLE: 'Insuffisant(e)',
  NON_CLASSE: 'Non classé(e)',
};

function PrimaryChildResult({
  report,
  childName,
}: {
  report: PrimaryReport;
  childName: string;
}) {
  const { evaluation, subjects, result, classAverage, composed, thresholds } = report;
  const scale = evaluation.averageScale;
  const totalMaxScore = subjects.reduce((sum, s) => sum + s.maxScore, 0);
  const statusTone = STATUS_TONE[result.status] ?? 'neutral';

  return (
    <>
      <StatGrid count={3}>
        <StatTile
          label="Moyenne de la classe"
          value={classAverage !== null ? `${fmtNote(classAverage)}/${scale}` : '—'}
          icon={Trophy}
        />
        <StatTile
          label="Élèves ayant composé"
          value={composed}
          icon={Users}
          accent="info"
        />
        <StatTile
          label={`Rang de ${childName.split(' ')[0]}`}
          value={result.isAbsent ? '—' : rankLabel(result.rank, result.isExAequo)}
          icon={Award}
          accent={
            result.rank !== null && !result.isAbsent && result.rank <= 3 ? 'success' : true
          }
        />
      </StatGrid>

      <Card accent className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="font-display text-ds-text">{evaluation.name}</strong>
          <span className="ds-badge ds-badge-neutral font-mono">
            total ÷ {fmtShort(evaluation.divisor)} → /{scale}
          </span>
          {evaluation.isExam && (
            <StatusBadge status="role" icon={false}>
              Examen blanc
            </StatusBadge>
          )}
        </div>
        <p className="mt-2 text-[.78rem] text-ds-text-tertiary">
          Admission à partir de {fmtShort(thresholds.admission)}/{scale} · insuffisant en dessous de{' '}
          {fmtShort(thresholds.redoublement)}/{scale}.
        </p>
      </Card>

      <Card className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <strong className="block font-display text-ds-text">{childName}</strong>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[.74rem] text-ds-text-tertiary">
              {!result.isAbsent && result.rank !== null && (
                <span>{rankLabel(result.rank, result.isExAequo)}</span>
              )}
              {result.mention && <span>· {result.mention}</span>}
            </span>
          </div>
          <div className="flex flex-none flex-col items-end gap-1">
            <AverageChip
              value={result.isAbsent ? null : result.average}
              scale={scale}
              threshold={thresholds.admission}
            />
            <StatusBadge status={statusTone} icon={false}>
              {STATUS_LABELS[result.status] ?? result.status}
            </StatusBadge>
          </div>
        </div>

        {result.isAbsent ? (
          <p className="mt-3 border-t border-ds-border pt-3 text-[.78rem] italic text-ds-text-tertiary">
            Absent(e) à cette composition — non classé(e).
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-ds-border pt-3">
            {subjects.map((subject) => {
              const note = result.notes[subject.subjectId];
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
              <span className="text-[.68rem] text-ds-text-tertiary">Total /{totalMaxScore}</span>
              <span className="font-mono text-[.82rem] font-bold text-ds-text">
                {fmtNote(result.total)}
              </span>
            </span>
          </div>
        )}
      </Card>
    </>
  );
}

export default function ParentGradesPage() {
  const { children, child, childId, setChildId } = useActiveChild();
  const { data: years, currentYear } = useAcademicYears();

  const [yearId, setYearId] = useState('');
  const [selectedEvalId, setSelectedEvalId] = useState<string>('');
  const [semesterId, setSemesterId] = useState<string | undefined>();
  const [subjectId, setSubjectId] = useState<string | undefined>();

  useEffect(() => {
    if (currentYear && !yearId) setYearId(currentYear.id);
  }, [currentYear, yearId]);

  useEffect(() => {
    setSelectedEvalId('');
  }, [childId, yearId]);

  const isPrimary = child?.class?.cycle === 'PRIMAIRE';

  // ─── Données secondaire ───────────────────────────────────────────────────

  const { data: semesters } = useQuery({
    queryKey: ['semesters', yearId],
    queryFn: async () => (await api.get(`/semesters?academicYearId=${yearId}`)).data.data || [],
    enabled: !!yearId && !isPrimary,
  });

  const gradesQuery = useMemo(() => {
    const p = new URLSearchParams({ academicYearId: yearId });
    if (semesterId) p.set('semesterId', semesterId);
    if (subjectId) p.set('subjectId', subjectId);
    return p.toString();
  }, [yearId, semesterId, subjectId]);

  const { data: gradesData, isLoading: gradesLoading } = useQuery({
    queryKey: ['parent-grades', childId, yearId, semesterId ?? 'all', subjectId ?? 'all'],
    queryFn: async () =>
      (await api.get(`/parent/children/${childId}/grades?${gradesQuery}`)).data.data,
    enabled: !!childId && !!yearId && !isPrimary,
  });

  const { data: bulletinsData, isLoading: bulletinsLoading } = useQuery({
    queryKey: ['parent-bulletins', childId, yearId],
    queryFn: async () =>
      (await api.get(`/parent/children/${childId}/bulletins?academicYearId=${yearId}`)).data.data,
    enabled: !!childId && !!yearId && !isPrimary,
  });

  // ─── Données primaire ─────────────────────────────────────────────────────

  const { data: primary, isLoading: primaryLoading } = useQuery({
    queryKey: ['parent-primary', childId, yearId],
    queryFn: async () =>
      (await api.get(`/parent/children/${childId}/primary?academicYearId=${yearId}`)).data.data,
    enabled: !!childId && !!yearId && isPrimary,
  });

  const evaluations: PrimaryReport[] = primary?.evaluations || [];

  useEffect(() => {
    if (evaluations.length > 0 && !selectedEvalId) {
      setSelectedEvalId(evaluations[0].evaluation.id);
    }
  }, [evaluations, selectedEvalId]);

  const selectedReport = evaluations.find((r) => r.evaluation.id === selectedEvalId);
  const childName = child ? fullName(child) : 'votre enfant';
  const childFirstName = child?.firstName ?? 'votre enfant';

  return (
    <div className="animate-fade-in mx-auto max-w-5xl">
      <PrimaryPageHead
        title="Résultats & Bulletins"
        subtitle={
          isPrimary
            ? `Résultats de ${childFirstName}, composition par composition${child?.class?.name ? ` — classe de ${child.class.name}` : ''}.`
            : `Notes et bulletins de ${childFirstName}${gradesData?.class?.name ? ` — classe de ${gradesData.class.name}` : ''}.`
        }
      />

      <ChildSwitcher items={children} value={childId} onChange={setChildId} />

      {isPrimary ? (
        <>
          {/* Sélecteurs : année + composition */}
          <Card className="mb-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="ds-field">
                <span>Année scolaire</span>
                <Select
                  placeholder="Sélectionner…"
                  value={yearId || undefined}
                  onChange={(v) => {
                    setYearId(v);
                    setSelectedEvalId('');
                  }}
                  options={(years || []).map((y: any) => ({
                    value: y.id,
                    label: `${y.name}${y.isCurrent ? ' (En cours)' : ''}`,
                  }))}
                  style={{ width: '100%' }}
                />
              </label>
              <label className="ds-field">
                <span>Composition</span>
                <Select
                  placeholder="Sélectionner une composition…"
                  value={selectedEvalId || undefined}
                  onChange={setSelectedEvalId}
                  options={evaluations.map((r) => ({
                    value: r.evaluation.id,
                    label: `${r.evaluation.name} — ${dayjs(r.evaluation.date).format('DD/MM/YYYY')}`,
                  }))}
                  style={{ width: '100%' }}
                  disabled={primaryLoading || evaluations.length === 0}
                />
              </label>
            </div>
          </Card>

          {primaryLoading ? (
            <>
              <StatGrid loading count={3} />
              <Skeleton height={90} className="mb-4 rounded-lg" />
              <Skeleton height={180} className="rounded-lg" />
            </>
          ) : !selectedReport ? (
            <EmptyCard
              icon={Trophy}
              title="Aucune composition disponible"
              text="Les résultats des compositions apparaîtront ici dès que l'école les aura publiés."
            />
          ) : (
            <>
              <PrimaryChildResult report={selectedReport} childName={childName} />

              {primary?.yearAverage !== null && primary?.yearAverage !== undefined && (
                <Card accent="role" className="flex flex-wrap items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-[.72rem] font-bold uppercase tracking-wide text-ds-text-tertiary">
                      Moyenne annuelle
                    </span>
                    <span
                      className="font-mono text-[1.7rem] font-semibold leading-none"
                      style={{ color: 'var(--role-accent)' }}
                    >
                      {fmtNote(primary.yearAverage)}
                      <span className="ml-1 text-[.85rem] text-ds-text-tertiary">
                        /{selectedReport.evaluation.averageScale}
                      </span>
                    </span>
                  </div>
                  <span className="ml-auto text-[.8rem] text-ds-text-tertiary">
                    Moyenne des {evaluations.length} composition
                    {evaluations.length > 1 ? 's' : ''} publiée
                    {evaluations.length > 1 ? 's' : ''}
                  </span>
                </Card>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <SchoolFiltersCard
            years={years || []}
            yearId={yearId}
            onYearChange={(v) => {
              setYearId(v);
              setSemesterId(undefined);
              setSubjectId(undefined);
            }}
            semesters={semesters}
            semesterId={semesterId}
            onSemesterChange={setSemesterId}
            subjects={gradesData?.subjects || []}
            subjectId={subjectId}
            onSubjectChange={setSubjectId}
          />

          <GradesBoard
            bySubject={gradesData?.bySubject || []}
            stats={gradesData?.stats}
            loading={gradesLoading}
            semesterSelected={!!semesterId}
            filtered={!!(semesterId || subjectId)}
            emptyText={`Aucune note n'a encore été saisie pour ${childFirstName} sur cette période.`}
          />

          <div className="mt-6">
            <h2 className="mb-3 font-display text-[1.1rem] font-bold text-ds-text">Bulletins</h2>
            <BulletinsBoard
              bulletins={bulletinsData?.bulletins || []}
              loading={bulletinsLoading}
            />
          </div>
        </>
      )}
    </div>
  );
}
