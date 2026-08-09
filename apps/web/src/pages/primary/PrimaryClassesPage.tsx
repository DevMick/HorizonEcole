import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Eye, Settings2, Trash2 } from 'lucide-react';
import { InputNumber, Select, Spin } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  fmtShort,
  normalizePrimaryLevel,
  PRIMARY_LEVEL_ORDER,
  primaryLevelRank,
  usePrimaryClassGrid,
  usePrimaryClasses,
  type PrimaryClassSummary,
  type PrimaryLevel,
} from '../../lib/hooks/usePrimary';
import { Button, Modal, toast } from '../../components/ds';
import { EntityBoard } from '../../components/shared/EntityBoard';

/**
 * Classes du primaire (administration) — présentation « Encre & Craie ».
 *
 * L'écran reprend la mise en page en cartes des Années scolaires : une carte par
 * classe, ses badges, et des actions rapides. Les six classes CP1 → CM2 sont
 * créées d'office à la création de l'établissement primaire, avec leur grille de
 * matières, leurs barèmes, leur diviseur et leurs seuils. Le bouton « Détail »
 * expose ce paramétrage, et « Configurer » permet de le retoucher.
 *
 * La désignation du titulaire ne se fait pas ici : elle relève d'un écran dédié.
 */
export default function PrimaryClassesPage() {
  const queryClient = useQueryClient();
  const [detailClassId, setDetailClassId] = useState<string | null>(null);
  const [gridClassId, setGridClassId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteClassId, setDeleteClassId] = useState<string | null>(null);

  // Pas de filtre par année : une classe du primaire, sa grille et ses barèmes
  // ne dépendent pas de l'année scolaire — seul le titulaire en dépend, et il
  // se désigne ailleurs.
  const { data: classes, isLoading } = usePrimaryClasses();

  // Les cartes suivent l'ordre pédagogique CP1 → CM2. L'API le renvoie déjà
  // ainsi ; on le réaffirme ici pour que l'écran ne dépende pas de l'ordre du
  // tableau reçu.
  const items = useMemo(
    () =>
      [...(classes || [])].sort((a, b) => {
        const rank = primaryLevelRank(a.level ?? a.name) - primaryLevelRank(b.level ?? b.name);
        return rank !== 0 ? rank : a.name.localeCompare(b.name, 'fr');
      }),
    [classes],
  );

  return (
    <div className="animate-fade-in">
      <EntityBoard
        title="Classes du primaire"
        subtitle="Grilles de matières, barèmes, seuils et titulaires des classes CP1 à CM2."
        icon={BookOpen}
        primaryLabel="Nouvelle classe"
        onPrimary={() => setCreateOpen(true)}
        items={items}
        loading={isLoading}
        cardOf={(item: PrimaryClassSummary) => ({
          key: item.id,
          title: item.name,
          subtitle: item.level ?? 'Niveau non reconnu',
          badges: [
            item.isConfigured
              ? {
                  label: `${item.subjectsCount} matière${item.subjectsCount > 1 ? 's' : ''}`,
                  kind: 'success' as const,
                }
              : { label: 'Grille non installée', kind: 'warning' as const },
          ],
          onClick: () => setDetailClassId(item.id),
        })}
        cardActions={(item: PrimaryClassSummary) => {
          const level = normalizePrimaryLevel(item.level ?? item.name);
          const hasSuffix =
            level !== null &&
            item.name.trim().toUpperCase() !== level;
          return (
            <>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                icon={<Eye aria-hidden />}
                aria-label="Voir le détail du paramétrage"
                title="Voir le détail du paramétrage"
                onClick={() => setDetailClassId(item.id)}
              />
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                icon={<Settings2 aria-hidden />}
                aria-label="Configurer la grille et les seuils"
                title="Configurer la grille et les seuils"
                onClick={() => setGridClassId(item.id)}
              />
              {hasSuffix && (
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  icon={<Trash2 aria-hidden className="text-ds-error" />}
                  aria-label="Supprimer cette classe"
                  title="Supprimer cette classe"
                  onClick={() => setDeleteClassId(item.id)}
                />
              )}
            </>
          );
        }}
        emptyTitle="Aucune classe du primaire"
        emptyText="Les classes CP1 à CM2 sont créées automatiquement à la création de l'établissement."
      />

      <DetailModal classId={detailClassId} onClose={() => setDetailClassId(null)} />
      <GridModal classId={gridClassId} onClose={() => setGridClassId(null)} />
      <DeleteClassModal
        classId={deleteClassId}
        classes={items}
        onClose={() => setDeleteClassId(null)}
        onDone={() => {
          queryClient.invalidateQueries({ queryKey: ['primary', 'classes'] });
          setDeleteClassId(null);
        }}
      />
      <CreateClassModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onDone={() => {
          queryClient.invalidateQueries({ queryKey: ['primary', 'classes'] });
          setCreateOpen(false);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Création d'une nouvelle classe
// ---------------------------------------------------------------------------

const LEVEL_OPTIONS = PRIMARY_LEVEL_ORDER.map((level) => ({ value: level, label: level }));

/**
 * Crée une nouvelle classe pour le niveau choisi.
 *
 * Si une classe « CP1 » existe déjà, l'API la renomme automatiquement en
 * « CP1 A » et la nouvelle devient « CP1 B ». Les créations suivantes
 * continuent avec C, D… La grille de matières, les barèmes, le diviseur et
 * les seuils sont installés immédiatement par le serveur.
 */
function CreateClassModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [level, setLevel] = useState<PrimaryLevel>('CP1');

  const createM = useMutation({
    mutationFn: async () => (await api.post('/primary/classes', { level })).data,
    onSuccess: () => {
      toast.success('Classe créée et grille installée.');
      onDone();
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.error || 'Impossible de créer la classe.'),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouvelle classe du primaire"
      width={460}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button loading={createM.isPending} onClick={() => createM.mutate()}>
            Créer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="ds-field">
          <span>Niveau</span>
          <Select
            value={level}
            onChange={(value) => setLevel(value as PrimaryLevel)}
            style={{ width: '100%' }}
            options={LEVEL_OPTIONS}
          />
        </label>
        <div className="rounded-lg bg-ds-subtle p-3 text-[.82rem] text-ds-text-secondary">
          <p>
            Si une classe <strong>{level}</strong> existe déjà, elle sera renommée{' '}
            <strong>{level} A</strong> et la nouvelle sera <strong>{level} B</strong>.
          </p>
          <p className="mt-1">
            La grille de matières, les barèmes et les seuils du niveau sont installés
            automatiquement.
          </p>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Suppression d'une classe supplémentaire
// ---------------------------------------------------------------------------

function DeleteClassModal({
  classId,
  classes,
  onClose,
  onDone,
}: {
  classId: string | null;
  classes: PrimaryClassSummary[];
  onClose: () => void;
  onDone: () => void;
}) {
  const target = classes.find((c) => c.id === classId);

  const deleteM = useMutation({
    mutationFn: async () => (await api.delete(`/primary/classes/${classId}`)).data,
    onSuccess: () => {
      toast.success('Classe supprimée.');
      onDone();
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.error || 'Impossible de supprimer la classe.'),
  });

  return (
    <Modal
      open={Boolean(classId)}
      onClose={onClose}
      title="Supprimer la classe"
      width={420}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="danger" loading={deleteM.isPending} onClick={() => deleteM.mutate()}>
            Supprimer
          </Button>
        </>
      }
    >
      <p className="text-sm text-ds-text">
        Supprimer <strong>{target?.name}</strong> ? Cette action est irréversible.
      </p>
      <p className="mt-2 text-sm text-ds-text-secondary">
        Les élèves et notes associés seront également supprimés. Si c'est la seule classe
        restante du niveau, elle sera renommée vers son nom de base.
      </p>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Détail du paramétrage (lecture seule)
// ---------------------------------------------------------------------------

/**
 * Fiche de lecture du paramétrage d'une classe : la grille de matières avec leur
 * barème, le diviseur, l'échelle, les seuils et les compositions prévues par le
 * niveau. C'est la réponse au bouton « Détail » — rien ne s'y modifie.
 */
function DetailModal({ classId, onClose }: { classId: string | null; onClose: () => void }) {
  const { data: grid, isLoading } = usePrimaryClassGrid(classId ?? undefined);

  return (
    <Modal
      open={Boolean(classId)}
      onClose={onClose}
      title={`Paramétrage — ${grid?.class.name ?? ''}`}
      width={560}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Fermer
        </Button>
      }
    >
      {isLoading || !grid ? (
        <div className="flex justify-center py-10">
          <Spin />
        </div>
      ) : grid.subjects.length === 0 ? (
        <p className="py-4 text-center text-sm text-ds-text-tertiary">
          Aucune matière : la grille du niveau n'est pas installée.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="ds-badge ds-badge-info">{grid.class.level ?? 'Niveau ?'}</span>
            {grid.settings && (
              <>
                <span className="ds-badge ds-badge-neutral">
                  Moyenne sur {grid.settings.averageScale}
                </span>
                <span className="ds-badge ds-badge-neutral">
                  Diviseur {fmtShort(grid.settings.divisor)}
                </span>
              </>
            )}
          </div>

          <div>
            <p className="mb-1 text-[.78rem] font-semibold text-ds-text-secondary">
              Grille de matières
            </p>
            <ul className="ds-detail-list">
              {grid.subjects.map((subject) => (
                <li key={subject.subjectId} className="ds-parent-row">
                  <strong className="min-w-0 truncate text-[.86rem] text-ds-text">
                    {subject.name}
                  </strong>
                  <span className="font-mono text-[.82rem] text-ds-text-secondary">
                    sur {subject.maxScore}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg bg-ds-surface-2 p-3 text-sm text-ds-text-secondary">
            <div>
              Total des barèmes : <strong>{grid.totalMaxScore}</strong> — moyenne ={' '}
              <span className="font-mono">
                total ÷ {fmtShort(grid.settings?.divisor)} → /{grid.settings?.averageScale}
              </span>
            </div>
            {grid.settings && (
              <div className="mt-1">
                Admission à <strong>{fmtShort(grid.settings.moyenneAdmission)}</strong> · redoublement
                sous <strong>{fmtShort(grid.settings.moyenneRedoublement)}</strong>
              </div>
            )}
          </div>

          {grid.profile && grid.profile.evaluations.length > 0 && (
            <div>
              <p className="mb-1 text-[.78rem] font-semibold text-ds-text-secondary">
                Compositions prévues par le niveau
              </p>
              <div className="flex flex-wrap gap-1.5">
                {grid.profile.evaluations.map((name) => (
                  <span key={name} className="ds-badge ds-badge-neutral">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Configuration de la grille
// ---------------------------------------------------------------------------

/**
 * Édition des barèmes et des seuils d'une classe. Le diviseur est affiché en
 * direct — « total ÷ 8,5 → /20 » — pendant qu'on retouche les barèmes : c'est la
 * seule façon de rendre évidente la contrainte que leur somme reflète l'échelle.
 */
function GridModal({ classId, onClose }: { classId: string | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: grid, isLoading } = usePrimaryClassGrid(classId ?? undefined);

  const [maxScores, setMaxScores] = useState<Record<string, number>>({});
  const [scale, setScale] = useState<number>(20);
  const [admission, setAdmission] = useState<number>(10);
  const [redoublement, setRedoublement] = useState<number>(9);

  useEffect(() => {
    if (!grid) return;
    setMaxScores(Object.fromEntries(grid.subjects.map((s) => [s.subjectId, s.maxScore])));
    setScale(grid.settings?.averageScale ?? grid.profile?.scale ?? 20);
    setAdmission(grid.settings?.moyenneAdmission ?? 10);
    setRedoublement(grid.settings?.moyenneRedoublement ?? 9);
  }, [grid]);

  const totalMaxScore = useMemo(
    () => Object.values(maxScores).reduce((sum, value) => sum + (value || 0), 0),
    [maxScores],
  );
  const divisor = scale > 0 ? Math.round((totalMaxScore / scale) * 100) / 100 : 0;

  const saveM = useMutation({
    mutationFn: async () =>
      (
        await api.put(`/primary/classes/${classId}/grid`, {
          subjects: (grid?.subjects || []).map((subject, index) => ({
            subjectId: subject.subjectId,
            maxScore: maxScores[subject.subjectId] ?? subject.maxScore,
            sortOrder: index + 1,
          })),
          averageScale: scale,
          moyenneAdmission: admission,
          moyenneRedoublement: redoublement,
        })
      ).data,
    onSuccess: () => {
      toast.success('Grille enregistrée.');
      queryClient.invalidateQueries({ queryKey: ['primary'] });
      onClose();
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.error || "Impossible d'enregistrer la grille."),
  });

  return (
    <Modal
      open={Boolean(classId)}
      onClose={onClose}
      title={`Grille — ${grid?.class.name ?? ''}`}
      width={600}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button
            loading={saveM.isPending}
            disabled={!grid || grid.subjects.length === 0}
            onClick={() => saveM.mutate()}
          >
            Enregistrer
          </Button>
        </>
      }
    >
      {isLoading || !grid ? (
        <div className="flex justify-center py-10">
          <Spin />
        </div>
      ) : grid.subjects.length === 0 ? (
        <p className="py-4 text-center text-sm text-ds-text-tertiary">
          Aucune matière : réinstallez d'abord la grille du niveau.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            {grid.subjects.map((subject) => (
              <div key={subject.subjectId} className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-ds-text">{subject.name}</span>
                <InputNumber
                  min={1}
                  max={100}
                  value={maxScores[subject.subjectId]}
                  onChange={(value) =>
                    setMaxScores((prev) => ({ ...prev, [subject.subjectId]: Number(value) || 0 }))
                  }
                  addonBefore="sur"
                  style={{ width: 140 }}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="ds-field min-w-[140px] flex-1">
              <span>Échelle de la moyenne</span>
              <Select
                value={scale}
                onChange={setScale}
                style={{ width: '100%' }}
                options={[
                  { value: 10, label: 'sur 10' },
                  { value: 20, label: 'sur 20' },
                ]}
              />
            </label>
            <label className="ds-field min-w-[140px] flex-1">
              <span>Moyenne d'admission</span>
              <InputNumber
                min={0}
                max={scale}
                step={0.5}
                value={admission}
                onChange={(value) => setAdmission(Number(value) || 0)}
                style={{ width: '100%' }}
              />
            </label>
            <label className="ds-field min-w-[140px] flex-1">
              <span>Seuil de redoublement</span>
              <InputNumber
                min={0}
                max={scale}
                step={0.5}
                value={redoublement}
                onChange={(value) => setRedoublement(Number(value) || 0)}
                style={{ width: '100%' }}
              />
            </label>
          </div>

          <div className="rounded-lg bg-ds-surface-2 p-3 text-sm text-ds-text-secondary">
            Total des barèmes : <strong>{totalMaxScore}</strong> — moyenne ={' '}
            <span className="font-mono">
              total ÷ {fmtShort(divisor)} → /{scale}
            </span>
            <div className="mt-1 text-xs text-ds-text-tertiary">
              Le diviseur se déduit des barèmes : il n'est jamais saisi à la main.
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
