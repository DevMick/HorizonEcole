import { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, ListChecks, Pencil, Trash2 } from 'lucide-react';
import { AutoComplete, DatePicker, Spin } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAcademicYears } from '../../lib/hooks/useAcademicYears';
import {
  fmtShort,
  normalizePrimaryLevel,
  primaryLevelRank,
  usePrimaryClasses,
  usePrimaryEvaluations,
  usePrimaryLevels,
  type PrimaryEvaluation,
  type PrimaryLevelProfile,
} from '../../lib/hooks/usePrimary';
import { Button, Modal, toast } from '../../components/ds';
import { EntityBoard } from '../../components/shared/EntityBoard';
import { cn } from '../../lib/utils';

/**
 * Compositions du primaire (administration) — présentation « Encre & Craie ».
 *
 * L'écran est organisé par classe, comme celui des Classes du primaire : une
 * carte par classe CP1 → CM2, qui montre d'un coup d'œil où en est son
 * calendrier — les compositions que son niveau prévoit, celles qui existent
 * déjà, celles qui manquent. Le paramétrage du niveau sait combien il en faut
 * et lesquelles : c'est lui qui remplit la carte, pas une saisie.
 *
 * La création est faite pour le geste réel de l'école : une même composition
 * tombe le même jour dans plusieurs classes. On choisit donc une composition et
 * une date, puis les classes concernées — présélectionnées d'après le niveau,
 * ce qui règle le cas du CM2 (examens blancs au lieu de la composition 3 et de
 * la composition de passage) sans rien avoir à démêler à la main.
 */

interface ClassRow {
  id: string;
  name: string;
  level: string | null;
  isConfigured: boolean;
  profile: PrimaryLevelProfile | null;
  /** Compositions prévues par le niveau, dans leur ordre. */
  planned: string[];
  evaluations: PrimaryEvaluation[];
  createdNames: Set<string>;
  missing: string[];
  /** Compositions créées hors du calendrier du niveau (rattrapage, essai…). */
  extras: PrimaryEvaluation[];
  publishedCount: number;
}

interface CreationPreset {
  name: string;
  classIds: string[];
}

const NAME_SHORT_LABELS: Record<string, string> = {
  'COMPOSITION 1': 'Comp. 1',
  'COMPOSITION 2': 'Comp. 2',
  'COMPOSITION 3': 'Comp. 3',
  'COMPOSITION DE PASSAGE': 'Passage',
  'EXAMEN BLANC 1': 'Ex. blanc 1',
  'EXAMEN BLANC 2': 'Ex. blanc 2',
};

/** Libellé compact, pour tenir sur une carte sans la faire déborder. */
const shortName = (name: string) => NAME_SHORT_LABELS[normName(name)] ?? name;

/** Les intitulés sont normalisés en majuscules par l'API : on compare pareil. */
const normName = (name: string | null | undefined) => String(name ?? '').trim().toUpperCase();

/**
 * Date habituelle d'une composition dans l'année scolaire — reprise du
 * calendrier de l'API pour préremplir le formulaire. Retourne `null` pour un
 * intitulé libre : rien à proposer, on garde alors la date déjà choisie.
 */
function suggestedDate(
  year: { startYear: number; endYear: number } | null,
  name: string,
): Dayjs | null {
  if (!year) return null;
  const schedule: Record<string, { month: number; day: number }> = {
    'COMPOSITION 1': { month: 12, day: 15 },
    'COMPOSITION 2': { month: 3, day: 15 },
    'COMPOSITION 3': { month: 4, day: 30 },
    'EXAMEN BLANC 1': { month: 4, day: 30 },
    'COMPOSITION DE PASSAGE': { month: 6, day: 15 },
    'EXAMEN BLANC 2': { month: 6, day: 15 },
  };
  const slot = schedule[normName(name)];
  if (!slot) return null;
  // Le premier trimestre tombe sur l'année civile de début, la suite sur celle de fin.
  const civilYear = slot.month >= 9 ? year.startYear : year.endYear;
  return dayjs(new Date(civilYear, slot.month - 1, slot.day));
}

export default function PrimaryEvaluationsPage() {
  const queryClient = useQueryClient();
  const { currentYear } = useAcademicYears();

  // L'écran travaille toujours sur l'année en cours : elle n'est plus au choix.
  const academicYearId = currentYear?.id ?? '';

  const { data: classes, isLoading: classesLoading } = usePrimaryClasses();
  const { data: levels } = usePrimaryLevels();
  const { data: evaluations, isLoading: evaluationsLoading } = usePrimaryEvaluations(
    academicYearId || undefined,
  );

  const [openClassId, setOpenClassId] = useState<string | null>(null);
  const [gridEvaluationId, setGridEvaluationId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PrimaryEvaluation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PrimaryEvaluation | null>(null);

  const deleteM = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/primary/evaluations/${id}`)).data,
    onSuccess: () => {
      toast.success('Composition supprimée.');
      invalidate();
      setDeleteTarget(null);
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.error || 'Impossible de supprimer la composition.'),
  });

  // La modale de création garde son état tant qu'elle est montée ; sa clé ne
  // change qu'à l'ouverture, pour que la fermeture conserve son animation.
  const [creationOpen, setCreationOpen] = useState(false);
  const [creationKey, setCreationKey] = useState(0);
  const [creationPreset, setCreationPreset] = useState<CreationPreset>({ name: '', classIds: [] });

  const openCreation = (preset: CreationPreset) => {
    setCreationPreset(preset);
    setCreationKey((key) => key + 1);
    setCreationOpen(true);
  };

  /**
   * Une ligne par classe : son calendrier tel que le niveau le prévoit, croisé
   * avec ce qui existe réellement pour l'année en cours.
   */
  const rows = useMemo<ClassRow[]>(() => {
    const profiles = new Map((levels ?? []).map((profile) => [profile.level, profile]));

    const byClass = new Map<string, PrimaryEvaluation[]>();
    (evaluations ?? []).forEach((evaluation) => {
      const list = byClass.get(evaluation.classId);
      if (list) list.push(evaluation);
      else byClass.set(evaluation.classId, [evaluation]);
    });

    return [...(classes ?? [])]
      .sort((a, b) => {
        const rank = primaryLevelRank(a.level ?? a.name) - primaryLevelRank(b.level ?? b.name);
        return rank !== 0 ? rank : a.name.localeCompare(b.name, 'fr');
      })
      .map((schoolClass) => {
        const level = normalizePrimaryLevel(schoolClass.level ?? schoolClass.name);
        const profile = (level && profiles.get(level)) || null;
        const planned = profile?.evaluations ?? [];

        const list = [...(byClass.get(schoolClass.id) ?? [])].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.date.localeCompare(b.date),
        );
        const createdNames = new Set(list.map((evaluation) => normName(evaluation.name)));

        return {
          id: schoolClass.id,
          name: schoolClass.name,
          level: schoolClass.level,
          isConfigured: schoolClass.isConfigured,
          profile,
          planned,
          evaluations: list,
          createdNames,
          missing: planned.filter((name) => !createdNames.has(name)),
          extras: list.filter((evaluation) => !planned.includes(normName(evaluation.name))),
          publishedCount: list.filter((evaluation) => evaluation.publishedAt).length,
        };
      });
  }, [classes, evaluations, levels]);

  const openRow = rows.find((row) => row.id === openClassId) ?? null;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['primary'] });

  return (
    <div className="animate-fade-in">
      <EntityBoard
        title="Compositions du primaire"
        subtitle="Calendrier des compositions par classe : ce que le niveau prévoit, ce qui reste à créer."
        icon={ListChecks}
        primaryLabel="Créer une composition"
        onPrimary={() => openCreation({ name: '', classIds: [] })}
        items={rows}
        loading={classesLoading || evaluationsLoading}
        cardOf={(row: ClassRow) => ({
          key: row.id,
          title: row.name,
          subtitle: row.profile?.label?.split(' — ').slice(1).join(' — ') ?? undefined,
          badges: [
            ...(row.isConfigured
              ? []
              : [{ label: 'Grille non installée', kind: 'warning' as const }]),
            row.planned.length > 0
              ? {
                  label: `${row.planned.length - row.missing.length}/${row.planned.length} compositions`,
                  kind: row.missing.length === 0 ? ('success' as const) : ('warning' as const),
                }
              : {
                  label: `${row.evaluations.length} composition${row.evaluations.length > 1 ? 's' : ''}`,
                  kind: 'neutral' as const,
                },
            ...(row.publishedCount > 0
              ? [
                  {
                    label: `${row.publishedCount} publiée${row.publishedCount > 1 ? 's' : ''}`,
                    kind: 'info' as const,
                  },
                ]
              : []),
          ],
          meta: <PlanChips row={row} />,
          onClick: () => setOpenClassId(row.id),
        })}
        cardActions={(row: ClassRow) => (
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            icon={<Eye aria-hidden />}
            aria-label="Voir les compositions de la classe"
            title="Voir les compositions de la classe"
            onClick={() => setOpenClassId(row.id)}
          />
        )}
        emptyTitle="Aucune classe du primaire"
        emptyText="Les classes CP1 à CM2 sont créées automatiquement à la création de l'établissement."
      />

      <ClassModal
        row={openRow}
        onClose={() => setOpenClassId(null)}
        onCreate={(name) => openCreation({ name, classIds: openRow ? [openRow.id] : [] })}
        onViewGrid={setGridEvaluationId}
        onEdit={setEditing}
        onDelete={setDeleteTarget}
      />

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer la composition"
        width={420}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              loading={deleteM.isPending}
              onClick={() => deleteM.mutate(deleteTarget!.id)}
            >
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm text-ds-text">
          Supprimer <strong>{deleteTarget?.name}</strong> ? Cette action supprime également
          toutes les notes saisies et ne peut pas être annulée.
        </p>
      </Modal>

      <CreateModal
        key={creationKey}
        open={creationOpen}
        preset={creationPreset}
        rows={rows}
        academicYear={currentYear}
        academicYearId={academicYearId}
        onClose={() => setCreationOpen(false)}
        onDone={invalidate}
      />

      <EditModal evaluation={editing} onClose={() => setEditing(null)} onDone={invalidate} />

      <GridModal evaluationId={gridEvaluationId} onClose={() => setGridEvaluationId(null)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendrier d'une classe, résumé sur sa carte
// ---------------------------------------------------------------------------

/**
 * Les compositions du niveau, dans l'ordre : en accent celles qui existent, en
 * gris pâle celles qui manquent. C'est le cœur de la carte — il répond à « où
 * en est cette classe ? » sans avoir à l'ouvrir.
 */
function PlanChips({ row }: { row: ClassRow }) {
  if (row.planned.length === 0 && row.evaluations.length === 0) {
    return (
      <span className="mt-1 text-[.74rem] text-ds-text-tertiary">
        Niveau non reconnu : aucun calendrier prévu.
      </span>
    );
  }

  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {row.planned.map((name) => {
        const done = row.createdNames.has(name);
        return (
          <span
            key={name}
            title={done ? `${name} — créée` : `${name} — à créer`}
            className={cn('ds-badge', done ? 'ds-badge-role' : 'ds-badge-neutral opacity-60')}
          >
            {shortName(name)}
          </span>
        );
      })}
      {row.extras.map((evaluation) => (
        <span
          key={evaluation.id}
          title={`${evaluation.name} — hors calendrier du niveau`}
          className="ds-badge ds-badge-info"
        >
          {shortName(evaluation.name)}
        </span>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Compositions d'une classe
// ---------------------------------------------------------------------------

/**
 * Fiche d'une classe : ce qui reste à créer d'après son niveau, puis les
 * compositions existantes avec les leviers de l'administration — verrouiller la
 * saisie, publier aux familles, réaligner la grille.
 */
function ClassModal({
  row,
  onClose,
  onCreate,
  onViewGrid,
  onEdit,
  onDelete,
}: {
  row: ClassRow | null;
  onClose: () => void;
  onCreate: (name: string) => void;
  onViewGrid: (id: string) => void;
  onEdit: (evaluation: PrimaryEvaluation) => void;
  onDelete: (evaluation: PrimaryEvaluation) => void;
}) {
  return (
    <Modal
      open={Boolean(row)}
      onClose={onClose}
      title={`Compositions — ${row?.name ?? ''}`}
      width={640}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Fermer
        </Button>
      }
    >
      {!row ? null : !row.isConfigured ? (
        <p className="py-4 text-center text-sm text-ds-text-tertiary">
          La grille de cette classe n'est pas installée : configurez-la depuis « Classes du
          primaire » avant de créer une composition.
        </p>
      ) : (
        <div className="space-y-4">
          {row.missing.length > 0 && (
            <div>
              <p className="mb-1.5 text-[.78rem] font-semibold text-ds-text-secondary">
                Prévues par le niveau, pas encore créées
              </p>
              <div className="flex flex-wrap gap-2">
                {row.missing.map((name) => (
                  <Button key={name} variant="outline" size="sm" onClick={() => onCreate(name)}>
                    {name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {row.evaluations.length === 0 ? (
            <p className="py-4 text-center text-sm text-ds-text-tertiary">
              Aucune composition pour cette classe cette année.
            </p>
          ) : (
            <ul className="ds-detail-list">
              {row.evaluations.map((evaluation) => (
                <li key={evaluation.id} className="ds-parent-row flex-wrap gap-y-2">
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <strong className="truncate text-[.86rem] text-ds-text">
                      {evaluation.name}
                    </strong>
                    <span className="flex flex-wrap items-center gap-1.5 text-[.74rem] text-ds-text-tertiary">
                      <span>{dayjs(evaluation.date).format('DD/MM/YYYY')}</span>
                      <span className="font-mono">
                        total ÷ {fmtShort(evaluation.divisor)} → /{evaluation.averageScale}
                      </span>
                      <span>
                        {evaluation.gradesCount ?? 0} note
                        {(evaluation.gradesCount ?? 0) > 1 ? 's' : ''}
                      </span>
                    </span>
                    {evaluation.isExam && (
                      <span className="ds-badge ds-badge-role">Examen blanc</span>
                    )}
                  </span>
                  <span className="flex flex-none items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      icon={<Eye aria-hidden />}
                      aria-label="Voir la grille figée"
                      title="Voir la grille figée"
                      onClick={() => onViewGrid(evaluation.id)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      icon={<Pencil aria-hidden />}
                      aria-label="Modifier"
                      title="Modifier l'intitulé ou la date"
                      onClick={() => onEdit(evaluation)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      icon={<Trash2 aria-hidden className="text-danger-600" />}
                      aria-label="Supprimer la composition"
                      title="Supprimer la composition"
                      onClick={() => onDelete(evaluation)}
                    />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Création : une composition, une date, plusieurs classes
// ---------------------------------------------------------------------------

interface ClassChoice {
  row: ClassRow;
  /** Sélectionnable ? Une composition déjà créée ou une grille absente bloquent. */
  disabled: boolean;
  /** Ce qui empêche — ou ce qui mérite d'être signalé sans empêcher. */
  note: string | null;
  /** Le niveau prévoit-il cette composition ? Sert à la présélection. */
  planned: boolean;
}

function CreateModal({
  open,
  preset,
  rows,
  academicYear,
  academicYearId,
  onClose,
  onDone,
}: {
  open: boolean;
  preset: CreationPreset;
  rows: ClassRow[];
  academicYear: { startYear: number; endYear: number } | null;
  academicYearId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(preset.name);
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [selected, setSelected] = useState<string[]>(preset.classIds);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Tant que l'utilisateur n'a pas coché lui-même, changer d'intitulé
  // resélectionne les classes que le niveau concerne — c'est ce qui écarte
  // le CM2 d'une « composition 3 » sans avoir à y penser. Dès qu'il touche une
  // case, son choix prime et n'est plus recalculé.
  const manualRef = useRef(preset.classIds.length > 0);

  const choices = useMemo<ClassChoice[]>(() => {
    const target = normName(name);
    return rows.map((row) => {
      const planned = row.planned.includes(target);
      if (!row.isConfigured) {
        return { row, disabled: true, note: 'Grille non installée', planned };
      }
      if (target && row.createdNames.has(target)) {
        return { row, disabled: true, note: 'Déjà créée', planned };
      }
      if (target && !planned) {
        return { row, disabled: false, note: 'Hors calendrier du niveau', planned };
      }
      return { row, disabled: false, note: null, planned };
    });
  }, [rows, name]);

  const suggestion = useMemo(
    () =>
      choices
        .filter((choice) => !choice.disabled && choice.planned)
        .map((choice) => choice.row.id),
    [choices],
  );

  /** Intitulés proposés : ceux des calendriers de niveau, avec qui les attend. */
  const nameOptions = useMemo(() => {
    const levelsByName = new Map<string, string[]>();
    rows.forEach((row) => {
      row.planned.forEach((planned) => {
        const list = levelsByName.get(planned) ?? [];
        const label = row.level ?? row.name;
        if (!list.includes(label)) list.push(label);
        levelsByName.set(planned, list);
      });
    });

    return [...levelsByName.entries()].map(([value, levels]) => ({
      value,
      label: (
        <span className="flex items-center justify-between gap-3">
          <span>{value}</span>
          <span className="text-[.72rem] text-ds-text-tertiary">{levels.join(', ')}</span>
        </span>
      ),
    }));
  }, [rows]);

  useEffect(() => {
    if (!open) return;
    setName(preset.name);
    setSelected(preset.classIds);
    setDate(suggestedDate(academicYear, preset.name) ?? dayjs());
    setErrors({});
    manualRef.current = preset.classIds.length > 0;
    // `preset` est un nouvel objet à chaque ouverture : l'effet rejoue alors,
    // et seulement alors — la modale ne se réinitialise pas sous les doigts.
  }, [open, preset, academicYear]);

  const applyName = (value: string) => {
    setName(value);
    const nextDate = suggestedDate(academicYear, value);
    if (nextDate) setDate(nextDate);
    if (manualRef.current) return;
    const target = normName(value);
    setSelected(
      rows
        .filter((row) => row.isConfigured && row.planned.includes(target) && !row.createdNames.has(target))
        .map((row) => row.id),
    );
  };

  const toggle = (classId: string) => {
    manualRef.current = true;
    setSelected((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId],
    );
  };

  const eligible = choices.filter((choice) => !choice.disabled).map((choice) => choice.row.id);
  const retained = selected.filter((id) => eligible.includes(id));

  const createM = useMutation({
    mutationFn: async () => {
      const target = normName(name);
      const iso = date.format('YYYY-MM-DD');
      const byId = new Map(rows.map((row) => [row.id, row]));

      // Une requête par classe : l'API crée une composition à la fois, et fige
      // sa grille au passage. `allSettled` pour qu'un refus sur une classe
      // n'emporte pas les créations réussies des autres.
      const results = await Promise.allSettled(
        retained.map((classId) => {
          const row = byId.get(classId)!;
          const index = row.planned.indexOf(target);
          return api.post('/primary/evaluations', {
            academicYearId,
            classId,
            name: target,
            date: iso,
            sortOrder: index >= 0 ? index + 1 : row.evaluations.length + 1,
          });
        }),
      );

      const failures: Record<string, string> = {};
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const reason = result.reason as any;
          failures[retained[index]] =
            reason?.response?.data?.error || 'Création refusée par le serveur.';
        }
      });
      return { failures, total: retained.length };
    },
    onSuccess: ({ failures, total }) => {
      const failed = Object.keys(failures);
      const created = total - failed.length;
      onDone();

      if (created > 0) {
        toast.success(`${created} composition${created > 1 ? 's' : ''} créée${created > 1 ? 's' : ''}.`);
      }
      if (failed.length === 0) {
        onClose();
        return;
      }
      // Les classes en échec restent cochées, avec leur motif : c'est la seule
      // façon de comprendre ce qui a bloqué et de réessayer sans tout refaire.
      setErrors(failures);
      setSelected(failed);
      if (created === 0) toast.error('Aucune composition créée.');
    },
    onError: () => toast.error("Impossible de créer les compositions."),
  });

  const canSubmit = Boolean(academicYearId) && normName(name).length > 0 && retained.length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouvelle composition"
      width={620}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button
            loading={createM.isPending}
            disabled={!canSubmit}
            onClick={() => createM.mutate()}
          >
            {retained.length > 1 ? `Créer pour ${retained.length} classes` : 'Créer'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <label className="ds-field min-w-[240px] flex-1">
            <span>Composition</span>
            <AutoComplete
              value={name}
              onChange={applyName}
              options={nameOptions}
              placeholder="Ex : COMPOSITION 1"
              style={{ width: '100%' }}
              filterOption={(input, option) =>
                String(option?.value ?? '').includes(input.trim().toUpperCase())
              }
            />
            <span className="text-[.74rem] text-ds-text-tertiary">
              Au CM2, « EXAMEN BLANC 1 » et « EXAMEN BLANC 2 » ajoutent l'EPS à la grille.
            </span>
          </label>
          <label className="ds-field min-w-[180px]">
            <span>Date</span>
            <DatePicker
              value={date}
              onChange={(value) => value && setDate(value)}
              allowClear={false}
              format="DD/MM/YYYY"
              style={{ width: '100%' }}
            />
          </label>
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[.78rem] font-semibold text-ds-text-secondary">
              Classes concernées
            </span>
            <span className="flex items-center gap-2">
              <span className="ds-badge ds-badge-role">
                {retained.length} / {eligible.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={suggestion.length === 0}
                title="Sélectionner les classes dont le niveau prévoit cette composition"
                onClick={() => {
                  manualRef.current = true;
                  setSelected(suggestion);
                }}
              >
                Prévues
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  manualRef.current = true;
                  setSelected(eligible);
                }}
              >
                Toutes
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  manualRef.current = true;
                  setSelected([]);
                }}
              >
                Aucune
              </Button>
            </span>
          </div>

          <div className="ds-check-grid">
            {choices.map(({ row, disabled, note }) => (
              <label
                key={row.id}
                className={cn(
                  'ds-check',
                  selected.includes(row.id) && !disabled && 'ds-check-on',
                  disabled && 'cursor-not-allowed opacity-50',
                )}
                title={note ?? undefined}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(row.id) && !disabled}
                  disabled={disabled}
                  onChange={() => toggle(row.id)}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{row.name}</span>
                  {(errors[row.id] || note) && (
                    <span
                      className={cn(
                        'truncate text-[.72rem] font-normal',
                        errors[row.id] ? 'text-danger-600' : 'text-ds-text-tertiary',
                      )}
                    >
                      {errors[row.id] ?? note}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Modification d'une composition
// ---------------------------------------------------------------------------

/** Intitulé et date d'une composition existante — sa grille, elle, reste figée. */
function EditModal({
  evaluation,
  onClose,
  onDone,
}: {
  evaluation: PrimaryEvaluation | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState('');
  const [date, setDate] = useState<Dayjs>(dayjs());

  useEffect(() => {
    if (!evaluation) return;
    setName(evaluation.name);
    setDate(dayjs(evaluation.date));
  }, [evaluation]);

  const saveM = useMutation({
    mutationFn: async () =>
      (
        await api.patch(`/primary/evaluations/${evaluation!.id}`, {
          name: name.trim().toUpperCase(),
          date: date.format('YYYY-MM-DD'),
        })
      ).data,
    onSuccess: () => {
      toast.success('Composition modifiée.');
      onDone();
      onClose();
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.error || "Impossible d'enregistrer la composition."),
  });

  return (
    <Modal
      open={Boolean(evaluation)}
      onClose={onClose}
      title="Modifier la composition"
      width={460}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button
            loading={saveM.isPending}
            disabled={name.trim().length === 0}
            onClick={() => saveM.mutate()}
          >
            Modifier
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <label className="ds-field">
          <span>Intitulé</span>
          <input
            className="ds-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex : COMPOSITION 1"
          />
        </label>
        <label className="ds-field">
          <span>Date</span>
          <DatePicker
            value={date}
            onChange={(value) => value && setDate(value)}
            allowClear={false}
            format="DD/MM/YYYY"
            style={{ width: '100%' }}
          />
        </label>
        <p className="text-[.74rem] text-ds-text-tertiary">
          La grille figée à la création n'est pas modifiée ici : elle se réaligne depuis la fiche de
          la classe, et seulement tant qu'aucune note n'est saisie.
        </p>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Détail d'une composition (grille figée, lecture seule)
// ---------------------------------------------------------------------------

/**
 * Fiche d'une composition : sa grille telle qu'elle a été figée à la création.
 * C'est cette grille-là — et non celle, éventuellement retouchée depuis, de la
 * classe — qui fait foi pour les notes déjà saisies.
 */
function GridModal({
  evaluationId,
  onClose,
}: {
  evaluationId: string | null;
  onClose: () => void;
}) {
  const { data: evaluation, isLoading } = useQuery<PrimaryEvaluation>({
    queryKey: ['primary', 'evaluation', evaluationId],
    enabled: Boolean(evaluationId),
    queryFn: async () => (await api.get(`/primary/evaluations/${evaluationId}`)).data.data,
  });

  const subjects = evaluation?.subjects ?? [];
  const totalMaxScore = subjects.reduce((sum, subject) => sum + subject.maxScore, 0);

  return (
    <Modal
      open={Boolean(evaluationId)}
      onClose={onClose}
      title={`Composition — ${evaluation?.name ?? ''}`}
      width={520}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Fermer
        </Button>
      }
    >
      {isLoading || !evaluation ? (
        <div className="flex justify-center py-10">
          <Spin />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="ds-badge ds-badge-neutral">
              {dayjs(evaluation.date).format('DD/MM/YYYY')}
            </span>
            {evaluation.isExam && <span className="ds-badge ds-badge-role">Examen blanc</span>}
            <span className="ds-badge ds-badge-neutral">Moyenne sur {evaluation.averageScale}</span>
            <span className="ds-badge ds-badge-neutral">
              Diviseur {fmtShort(evaluation.divisor)}
            </span>
          </div>

          {subjects.length === 0 ? (
            <p className="py-4 text-center text-sm text-ds-text-tertiary">
              Aucune matière figée pour cette composition.
            </p>
          ) : (
            <div>
              <p className="mb-1 text-[.78rem] font-semibold text-ds-text-secondary">
                Grille figée à la création
              </p>
              <ul className="ds-detail-list">
                {subjects.map((subject) => (
                  <li key={subject.id} className="ds-parent-row">
                    <strong className="min-w-0 truncate text-[.86rem] text-ds-text">
                      {subject.name}
                    </strong>
                    <span className="font-mono text-[.82rem] text-ds-text-secondary">
                      sur {subject.maxScore}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 rounded-lg bg-ds-subtle p-3 text-sm text-ds-text-secondary">
                Total des barèmes : <strong>{totalMaxScore}</strong> — moyenne ={' '}
                <span className="font-mono">
                  total ÷ {fmtShort(evaluation.divisor)} → /{evaluation.averageScale}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
