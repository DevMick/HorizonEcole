import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Select } from 'antd';
import { ArrowLeft, Save, Users } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { useAuthStore } from '../../lib/store';
import { useAcademicYears } from '../../lib/hooks/useAcademicYears';
import {
  fmtNote,
  useMyPrimaryClasses,
  usePrimaryClasses,
  usePrimaryEntryGrid,
  usePrimaryEvaluations,
} from '../../lib/hooks/usePrimary';
import { api } from '../../lib/api';
import { Button, Card, Skeleton, toast } from '../../components/ds';
import {
  ClassBanner,
  EmptyCard,
  PrimaryPageHead,
  StatGrid,
  StatTile,
} from '../../components/primary/PrimaryTeacherShell';

dayjs.locale('fr');

// ---------------------------------------------------------------------------
// Types locaux
// ---------------------------------------------------------------------------

type CellDraft = { raw: string };
type RowDraft = { isAbsent: boolean; cells: Record<string, CellDraft> };
type GridDraft = Record<string, RowDraft>;

interface SaveEntry {
  studentId: string;
  subjectId: string;
  note: number | null;
  isAbsent: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseNote(raw: string): number | null {
  const v = raw.trim().replace(',', '.');
  if (v === '') return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function buildDraftFromGrid(grid: ReturnType<typeof usePrimaryEntryGrid>['data']): GridDraft {
  if (!grid) return {};
  const draft: GridDraft = {};
  for (const student of grid.students) {
    const cells: Record<string, CellDraft> = {};
    for (const subject of grid.subjects) {
      const existing = student.grades[subject.subjectId];
      cells[subject.subjectId] = {
        raw: existing?.note !== null && existing?.note !== undefined ? String(existing.note) : '',
      };
    }
    const isAbsent = grid.subjects.length > 0
      ? Object.values(student.grades).some((g) => g.isAbsent)
      : false;
    draft[student.id] = { isAbsent, cells };
  }
  return draft;
}

function draftsEqual(a: GridDraft, b: GridDraft): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const sid of aKeys) {
    if (a[sid].isAbsent !== b[sid]?.isAbsent) return false;
    for (const subId of Object.keys(a[sid].cells)) {
      if (a[sid].cells[subId].raw !== b[sid]?.cells[subId]?.raw) return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export default function PrimarySaisieNotesPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';

  const { data: academicYears, currentYear } = useAcademicYears();
  const [academicYearId, setAcademicYearId] = useState<string>('');
  const [classId, setClassId] = useState<string>('');
  const [evaluationId, setEvaluationId] = useState<string>(() => searchParams.get('evaluationId') ?? '');

  useEffect(() => {
    if (!academicYearId && currentYear?.id) setAcademicYearId(currentYear.id);
  }, [currentYear?.id, academicYearId]);

  const adminClasses = usePrimaryClasses(academicYearId || undefined, isAdmin);
  const myClasses = useMyPrimaryClasses(academicYearId || undefined, !isAdmin);

  const classOptions = isAdmin
    ? (adminClasses.data || []).map((c) => ({ value: c.id, label: c.name }))
    : (myClasses.data?.classes || []).map((c) => ({ value: c.id, label: c.name }));

  const { data: evaluations } = usePrimaryEvaluations(
    academicYearId || undefined,
    classId || undefined,
  );

  // Auto-sélection de classe
  useEffect(() => {
    if (classId || classOptions.length === 0) return;
    if (evaluations === undefined) return;
    const firstWithEval = classOptions.find((opt) =>
      evaluations.some((ev) => ev.classId === opt.value),
    );
    setClassId(firstWithEval?.value ?? classOptions[0].value);
  }, [classOptions, classId, evaluations]);

  // Auto-sélection de composition (sauf si passée en query param)
  const initialEvalSet = useRef(false);
  useEffect(() => {
    const list = evaluations || [];
    if (list.length === 0) { if (!searchParams.get('evaluationId')) setEvaluationId(''); return; }
    if (evaluationId && list.some((e) => e.id === evaluationId)) {
      initialEvalSet.current = true;
      return;
    }
    if (!initialEvalSet.current) {
      setEvaluationId(list[0].id);
      initialEvalSet.current = true;
    }
  }, [evaluations, evaluationId, searchParams]);

  const { data: grid, isLoading: gridLoading } = usePrimaryEntryGrid(evaluationId || undefined);

  // ---------------------------------------------------------------------------
  // Draft local
  // ---------------------------------------------------------------------------

  const [draft, setDraft] = useState<GridDraft>({});
  const [savedDraft, setSavedDraft] = useState<GridDraft>({});

  useEffect(() => {
    if (!grid) return;
    const initial = buildDraftFromGrid(grid);
    setDraft(initial);
    setSavedDraft(initial);
  }, [grid]);

  const isDirty = useMemo(() => !draftsEqual(draft, savedDraft), [draft, savedDraft]);

  // ---------------------------------------------------------------------------
  // Stats live
  // ---------------------------------------------------------------------------

  const absentCount = Object.values(draft).filter((r) => r.isAbsent).length;
  const presentCount = Object.values(draft).length - absentCount;

  // Moyenne live par élève
  const liveAverages = useMemo<Record<string, number | null>>(() => {
    if (!grid) return {};
    const result: Record<string, number | null> = {};
    for (const student of grid.students) {
      const row = draft[student.id];
      if (!row) { result[student.id] = null; continue; }
      if (row.isAbsent) { result[student.id] = null; continue; }
      let total = 0;
      let count = 0;
      for (const subject of grid.subjects) {
        const note = parseNote(row.cells[subject.subjectId]?.raw ?? '');
        if (note !== null) { total += note; count++; }
      }
      if (count === 0) { result[student.id] = null; continue; }
      result[student.id] = grid.evaluation.divisor > 0
        ? total / grid.evaluation.divisor
        : null;
    }
    return result;
  }, [draft, grid]);

  // ---------------------------------------------------------------------------
  // Mutation de sauvegarde
  // ---------------------------------------------------------------------------

  const mutation = useMutation({
    mutationFn: async (entries: SaveEntry[]) =>
      api.put(`/primary/grades/${evaluationId}`, { entries }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['primary', 'entry', evaluationId] });
      queryClient.invalidateQueries({ queryKey: ['primary', 'results', evaluationId] });
      setSavedDraft(draft);
      toast.success('Notes enregistrées avec succès.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Erreur lors de l\'enregistrement.');
    },
  });

  const handleSave = () => {
    if (!grid) return;
    const entries: SaveEntry[] = [];
    for (const student of grid.students) {
      const row = draft[student.id];
      if (!row) continue;
      for (const subject of grid.subjects) {
        const note = row.isAbsent ? null : parseNote(row.cells[subject.subjectId]?.raw ?? '');
        entries.push({
          studentId: student.id,
          subjectId: subject.subjectId,
          note,
          isAbsent: row.isAbsent,
        });
      }
    }
    mutation.mutate(entries);
  };

  // ---------------------------------------------------------------------------
  // Handlers draft
  // ---------------------------------------------------------------------------

  const setNote = (studentId: string, subjectId: string, raw: string) => {
    setDraft((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        cells: {
          ...prev[studentId]?.cells,
          [subjectId]: { raw },
        },
      },
    }));
  };

  const setAbsent = (studentId: string, isAbsent: boolean) => {
    setDraft((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], isAbsent },
    }));
  };

  // ---------------------------------------------------------------------------
  // Info classe et évaluation
  // ---------------------------------------------------------------------------

  const myClass = myClasses.data?.classes?.[0];
  const currentEval = (evaluations || []).find((e) => e.id === evaluationId);

  // ---------------------------------------------------------------------------
  // Rendu
  // ---------------------------------------------------------------------------

  return (
    <div className="animate-fade-in mx-auto max-w-[100rem]">
      {/* En-tête */}
      <div className="mb-5">
        <Link
          to="/primary/grades"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-ds-text-secondary hover:text-ds-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Résultats &amp; Bulletins
        </Link>
        <PrimaryPageHead
          title="Saisie des Notes"
          subtitle={
            grid
              ? `${grid.class.name} — ${grid.evaluation.name} · ${dayjs(grid.evaluation.date).format('DD MMMM YYYY')}`
              : 'Sélectionnez une composition pour saisir les notes.'
          }
        />
      </div>

      {/* Filtres */}
      <Card className="mb-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="ds-field">
            <span>Année scolaire</span>
            <Select
              value={academicYearId || undefined}
              onChange={(v) => { setAcademicYearId(v); setClassId(''); setEvaluationId(''); initialEvalSet.current = false; }}
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
                onChange={(v) => { setClassId(v); setEvaluationId(''); initialEvalSet.current = false; }}
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
              onChange={(v) => { setEvaluationId(v); initialEvalSet.current = true; }}
              placeholder="Sélectionnez une composition"
              style={{ width: '100%' }}
              options={(evaluations || []).map((item) => ({
                value: item.id,
                label: `${item.name} — ${dayjs(item.date).format('DD/MM/YYYY')}`,
              }))}
            />
          </label>
        </div>
      </Card>

      {/* Bandeau classe pour l'enseignant */}
      {!isAdmin && myClass && (
        <ClassBanner
          className={myClass.name}
          level={myClass.level}
          studentsCount={myClass.studentsCount}
          yearName={academicYears?.find((y: any) => y.id === academicYearId)?.name}
        />
      )}

      {/* États vides / chargement */}
      {!evaluationId ? (
        <EmptyCard
          icon={Users}
          title="Aucune composition sélectionnée"
          text="Choisissez une composition dans les filtres ci-dessus pour ouvrir la grille de saisie."
        />
      ) : gridLoading || !grid ? (
        <div className="space-y-3">
          <StatGrid loading />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={52} className="rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {/* Stats */}
          <StatGrid count={3}>
            <StatTile label="Élèves inscrits" value={grid.students.length} icon={Users} />
            <StatTile label="Présents" value={presentCount} icon={Users} accent="success" />
            <StatTile label="Absents" value={absentCount} icon={Users} accent="danger" />
          </StatGrid>

          {/* Tableau principal */}
          <Card className="mb-6 overflow-hidden p-0">
            {/* Info évaluation */}
            {currentEval && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-ds-border bg-ds-subtle px-5 py-3 text-sm">
                <span className="font-medium text-ds-text">{currentEval.name}</span>
                <span className="text-ds-text-secondary">
                  {dayjs(currentEval.date).format('DD MMMM YYYY')}
                </span>
                <span className="text-ds-text-tertiary">
                  Barème ÷ {currentEval.divisor} → /{currentEval.averageScale}
                </span>
                {currentEval.isLocked && (
                  <span className="ds-badge ds-badge-warning">Verrouillée</span>
                )}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-ds-subtle">
                    {/* Colonnes fixes gauche */}
                    <th
                      scope="col"
                      className="sticky left-0 z-20 w-10 bg-ds-subtle px-3 py-3 text-center font-medium text-ds-text-tertiary"
                    >
                      #
                    </th>
                    <th
                      scope="col"
                      className="sticky left-10 z-20 min-w-[180px] bg-ds-subtle px-4 py-3 text-left font-medium text-ds-text"
                    >
                      Élève
                    </th>
                    {/* Colonnes matières */}
                    {grid.subjects.map((subject) => (
                      <th
                        key={subject.subjectId}
                        scope="col"
                        className="min-w-[100px] px-2 py-3 text-center font-medium text-ds-text"
                      >
                        <span className="block truncate leading-tight">{subject.name}</span>
                        <span className="block text-[.7rem] font-normal text-ds-text-tertiary">
                          /{subject.maxScore}
                        </span>
                      </th>
                    ))}
                    {/* Colonnes récap */}
                    <th
                      scope="col"
                      className="w-16 px-3 py-3 text-center font-medium text-ds-text-tertiary"
                    >
                      Absent
                    </th>
                    <th
                      scope="col"
                      className="min-w-[90px] px-3 py-3 text-center font-medium text-ds-text-secondary"
                    >
                      <span className="block leading-tight">Moyenne</span>
                      <span className="block text-[.7rem] font-normal text-ds-text-tertiary">
                        /{grid.evaluation.averageScale}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {grid.students.map((student, idx) => {
                    const row = draft[student.id] ?? { isAbsent: false, cells: {} };
                    const avg = liveAverages[student.id];

                    return (
                      <tr
                        key={student.id}
                        className={
                          row.isAbsent
                            ? 'bg-ds-subtle/50 opacity-60 transition-opacity'
                            : idx % 2 === 0
                              ? 'bg-white dark:bg-transparent'
                              : 'bg-ds-subtle/30'
                        }
                      >
                        {/* Numéro de ligne */}
                        <td className="sticky left-0 z-10 w-10 bg-inherit px-3 py-2.5 text-center text-xs text-ds-text-tertiary">
                          {idx + 1}
                        </td>
                        {/* Nom élève */}
                        <td className="sticky left-10 z-10 min-w-[180px] bg-inherit px-4 py-2.5">
                          <span className="block font-medium text-ds-text leading-tight">
                            {student.fullName}
                          </span>
                          <span className="block text-[.72rem] text-ds-text-tertiary font-mono">
                            {student.studentNumber}
                          </span>
                        </td>
                        {/* Inputs notes */}
                        {grid.subjects.map((subject) => (
                          <td key={subject.subjectId} className="px-2 py-2 text-center">
                            <input
                              type="number"
                              min={0}
                              max={subject.maxScore}
                              step={0.5}
                              disabled={row.isAbsent || currentEval?.isLocked}
                              value={row.cells[subject.subjectId]?.raw ?? ''}
                              onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === '' || (parseFloat(raw) >= 0 && parseFloat(raw) <= subject.maxScore)) {
                                  setNote(student.id, subject.subjectId, raw);
                                }
                              }}
                              onBlur={(e) => {
                                const parsed = parseNote(e.target.value);
                                if (parsed !== null) {
                                  const clamped = Math.min(Math.max(parsed, 0), subject.maxScore);
                                  setNote(student.id, subject.subjectId, String(clamped));
                                }
                              }}
                              className="h-9 w-20 rounded-md border border-ds-border bg-white px-2 text-center font-mono text-sm text-ds-text outline-none transition focus:border-ds-accent focus:ring-1 focus:ring-ds-accent disabled:cursor-not-allowed disabled:bg-ds-subtle disabled:opacity-50 dark:bg-ds-bg"
                              aria-label={`Note ${subject.name} pour ${student.fullName}`}
                            />
                          </td>
                        ))}
                        {/* Checkbox absent */}
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={row.isAbsent}
                            disabled={currentEval?.isLocked}
                            onChange={(e) => setAbsent(student.id, e.target.checked)}
                            className="h-4 w-4 cursor-pointer rounded border-ds-border accent-ds-accent disabled:cursor-not-allowed"
                            aria-label={`Marquer ${student.fullName} absent`}
                          />
                        </td>
                        {/* Moyenne live */}
                        <td className="px-3 py-2 text-center">
                          {row.isAbsent ? (
                            <span className="text-xs italic text-ds-text-tertiary">Absent</span>
                          ) : avg !== null ? (
                            <span className="font-mono text-sm font-semibold text-ds-text">
                              {fmtNote(avg)}
                            </span>
                          ) : (
                            <span className="text-xs text-ds-text-tertiary">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pied de carte : bouton enregistrer */}
            <div className="flex items-center justify-between border-t border-ds-border px-5 py-4">
              <span className="text-sm text-ds-text-secondary">
                {isDirty ? (
                  <span className="inline-flex items-center gap-1.5 text-amber-600">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    Modifications non enregistrées
                  </span>
                ) : (
                  <span className="text-ds-text-tertiary">Tout est enregistré</span>
                )}
              </span>
              <Button
                icon={<Save aria-hidden />}
                loading={mutation.isPending}
                onClick={handleSave}
                disabled={!isDirty || currentEval?.isLocked}
              >
                {currentEval?.isLocked ? 'Composition verrouillée' : 'Enregistrer'}
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
