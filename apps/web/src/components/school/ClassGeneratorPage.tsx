import { ArrowLeft, GraduationCap } from 'lucide-react';
import { Button, Card } from '../ds';

export type SchoolCycle = 'PRIMAIRE' | 'SECONDAIRE';

export interface LevelDef { key: string; label: string; cycle?: SchoolCycle }

/**
 * Niveaux du primaire (CP1 → CM2). Créées avec `cycle: 'PRIMAIRE'`, ces classes
 * basculent sur le module primaire : grille de matières à barèmes hétérogènes,
 * compositions, et moyenne = somme des notes ÷ diviseur du niveau.
 */
export const PRIMAIRE_LEVELS: LevelDef[] = [
  { key: 'CP1', label: 'CP1 — Cours Préparatoire 1', cycle: 'PRIMAIRE' },
  { key: 'CP2', label: 'CP2 — Cours Préparatoire 2', cycle: 'PRIMAIRE' },
  { key: 'CE1', label: 'CE1 — Cours Élémentaire 1', cycle: 'PRIMAIRE' },
  { key: 'CE2', label: 'CE2 — Cours Élémentaire 2', cycle: 'PRIMAIRE' },
  { key: 'CM1', label: 'CM1 — Cours Moyen 1', cycle: 'PRIMAIRE' },
  { key: 'CM2', label: 'CM2 — Cours Moyen 2 (CEPE)', cycle: 'PRIMAIRE' },
];

export const COLLEGE_LEVELS: LevelDef[] = [
  { key: '6ème', label: '6ème — Sixième' },
  { key: '5ème', label: '5ème — Cinquième' },
  { key: '4ème', label: '4ème — Quatrième' },
  { key: '3ème', label: '3ème — Troisième (BEPC)' },
];

export const LYCEE_LEVELS: LevelDef[] = [
  { key: '2nde A', label: '2nde A — Littéraire' },
  { key: '2nde C', label: '2nde C — Scientifique' },
  { key: '1ère A', label: '1ère A — Littéraire' },
  { key: '1ère C', label: '1ère C — Sciences exactes' },
  { key: '1ère D', label: '1ère D — Sciences de la nature' },
  { key: 'Tle A', label: 'Tle A — Baccalauréat' },
  { key: 'Tle C', label: 'Tle C — Baccalauréat' },
  { key: 'Tle D', label: 'Tle D — Baccalauréat' },
];

export interface LevelGroup {
  label: string;
  levels: LevelDef[];
}

export interface ClassGeneratorPageProps {
  counts: Record<string, number>;
  onCountChange: (levelKey: string, count: number) => void;
  existingCountFor: (levelKey: string) => number;
  onCancel: () => void;
  onSubmit: () => void;
  submitting?: boolean;
  toCreateCount: number;
  /**
   * Groupes de niveaux à proposer, fournis par l'établissement connecté. Un
   * collège n'y voit que la 6ème → 3ème, un lycée y ajoute le second cycle, une
   * école primaire n'y voit que le CP1 → CM2 : le générateur ne connaît donc
   * plus le référentiel, il l'affiche.
   */
  groups?: LevelGroup[];
}

function LevelRow({ level, count, existing, onChange }: { level: LevelDef; count: number; existing: number; onChange: (n: number) => void }) {
  return (
    <div className="ds-coeff-row">
      <span className="ds-coeff-name">
        <GraduationCap width={16} height={16} aria-hidden style={{ color: 'var(--role-accent)' }} />
        <strong>{level.label}</strong>
        {existing > 0 && <span className="ds-badge ds-badge-neutral ml-2">{existing} existante{existing > 1 ? 's' : ''}</span>}
      </span>
      <input
        type="number" min={0} max={20} className="ds-input font-mono ds-coeff-input"
        value={count || 0}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
        aria-label={`Nombre de divisions — ${level.label}`}
      />
    </div>
  );
}

/** Index niveau → cycle, pour étiqueter les classes créées par le générateur. */
export const LEVEL_CYCLES: Record<string, SchoolCycle> = Object.fromEntries([
  ...PRIMAIRE_LEVELS.map((l) => [l.key, 'PRIMAIRE' as const]),
  ...COLLEGE_LEVELS.map((l) => [l.key, 'SECONDAIRE' as const]),
  ...LYCEE_LEVELS.map((l) => [l.key, 'SECONDAIRE' as const]),
]);

/**
 * Générateur de classes — crée en masse les divisions numérotées d'un ou
 * plusieurs niveaux (ex. « Sixième » × 3 → Sixième 1, Sixième 2, Sixième 3),
 * sur la base du système ivoirien (primaire CP1→CM2, collège 6e→3e,
 * lycée 2nde→Tle A/C/D). Les divisions déjà existantes (même nom) sont
 * automatiquement ignorées.
 */
export function ClassGeneratorPage(props: ClassGeneratorPageProps) {
  const { counts, onCountChange, existingCountFor, onCancel, onSubmit, submitting, toCreateCount, groups } = props;

  // Sans établissement chargé, on retombe sur le référentiel complet plutôt que
  // sur un écran vide — l'API refusera de toute façon un niveau hors du type.
  const effectiveGroups: LevelGroup[] = groups?.length
    ? groups
    : [
        { label: 'École primaire — CP1 à CM2', levels: PRIMAIRE_LEVELS },
        { label: 'Premier cycle — Collège', levels: COLLEGE_LEVELS },
        { label: 'Second cycle — Lycée', levels: LYCEE_LEVELS },
      ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center gap-3">
        <Button variant="ghost" size="sm" iconOnly icon={<ArrowLeft aria-hidden />} aria-label="Retour à la liste" onClick={onCancel} />
        <div>
          <h1 className="font-display text-[1.5rem] font-bold tracking-tight text-ds-text">Générer les classes</h1>
          <p className="mt-1 text-sm text-ds-text-secondary">
            Indique le nombre de divisions par niveau pour ton établissement — les classes numérotées (ex. Sixième 1, Sixième 2…) sont créées automatiquement.
          </p>
        </div>
      </div>

      {effectiveGroups.map((group) => (
        <Card key={group.label} padded={false} className="mb-4">
          <div className="ds-coeff-head"><span>{group.label}</span><span>Divisions</span></div>
          <div className="ds-coeff-list">
            {group.levels.map((l) => (
              <LevelRow key={l.key} level={l} count={counts[l.key] || 0} existing={existingCountFor(l.key)} onChange={(n) => onCountChange(l.key, n)} />
            ))}
          </div>
        </Card>
      ))}

      <div className="ds-sticky-save">
        <span className="ds-save-count flex-1">
          {toCreateCount > 0 ? `${toCreateCount} classe${toCreateCount > 1 ? 's' : ''} à créer` : 'Aucune nouvelle classe à créer'}
        </span>
        <Button variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button loading={submitting} disabled={toCreateCount === 0} onClick={onSubmit}>Générer</Button>
      </div>
    </div>
  );
}
