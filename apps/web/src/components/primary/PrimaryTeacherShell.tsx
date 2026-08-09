import type { LucideIcon } from 'lucide-react';
import { Select } from 'antd';
import { GraduationCap } from 'lucide-react';
import { Card, Skeleton } from '../ds';
import { cn } from '../../lib/utils';

/**
 * Briques communes aux écrans du titulaire du primaire, habillées « Encre &
 * Craie » comme l'espace Famille : cartes à languette, stat-cards à médaillon,
 * listes en chronologie plutôt que tableaux.
 *
 * Les huit pages de l'enseignant partageaient jusqu'ici le même en-tête, le
 * même sélecteur d'année et les mêmes états vides, chacun réécrit à la main.
 * Les regrouper ici évite qu'ils divergent au premier ajustement.
 */

/** En-tête de page : titre, sous-titre, et la date ou l'année en légende. */
export function PrimaryPageHead({
  title,
  subtitle,
  meta,
}: {
  title: React.ReactNode;
  subtitle?: string;
  meta?: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <h1 className="font-display text-[1.5rem] font-bold tracking-tight text-ds-text">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-ds-text-secondary">{subtitle}</p>}
      {meta && <p className="mt-1 text-sm text-ds-text-secondary">{meta}</p>}
    </div>
  );
}

/**
 * Bandeau de classe — l'équivalent du sélecteur d'enfant de l'espace Famille :
 * il rappelle en permanence sur quelle classe on travaille.
 */
export function ClassBanner({
  className: cls,
  level,
  studentsCount,
  yearName,
  right,
}: {
  className: string;
  level?: string | null;
  studentsCount?: number;
  yearName?: string;
  right?: React.ReactNode;
}) {
  return (
    <Card accent className="mb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="ds-stat-medallion" aria-hidden>
            <GraduationCap width={20} height={20} />
          </span>
          <span className="min-w-0">
            <strong className="block font-display text-[1.05rem] text-ds-text">{cls}</strong>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[.78rem] text-ds-text-tertiary">
              {level && <span className="ds-badge ds-badge-role">{level}</span>}
              {typeof studentsCount === 'number' && <span>{studentsCount} élève(s)</span>}
              {yearName && <span>· Année {yearName}</span>}
            </span>
          </span>
        </div>
        {right && <div className="flex-none">{right}</div>}
      </div>
    </Card>
  );
}

/** Sélecteur d'année scolaire, dans la carte de filtres de l'espace Famille. */
export function YearFilterCard({
  years,
  yearId,
  onYearChange,
  children,
}: {
  years: any[];
  yearId: string;
  onYearChange: (id: string) => void;
  children?: React.ReactNode;
}) {
  return (
    <Card className="mb-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="ds-field">
          <span>Année scolaire</span>
          <Select
            placeholder="Sélectionner…"
            value={yearId || undefined}
            onChange={onYearChange}
            options={(years || []).map((year: any) => ({
              value: year.id,
              label: `${year.name}${year.isCurrent ? ' (En cours)' : ''}`,
            }))}
            style={{ width: '100%' }}
          />
        </label>
        {children}
      </div>
    </Card>
  );
}

/** Stat-card à médaillon (§9.1) — la carte chiffrée de l'espace Famille. */
export function StatTile({
  label,
  value,
  icon: Icon,
  accent = true,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  accent?: boolean | 'success' | 'warning' | 'danger' | 'info';
}) {
  return (
    <Card accent={accent} className="ds-stat">
      <div className="ds-stat-body">
        <span className="ds-stat-label">{label}</span>
        <span className="ds-stat-value">{value}</span>
      </div>
      <span className="ds-stat-medallion" aria-hidden>
        <Icon width={20} height={20} />
      </span>
    </Card>
  );
}

/**
 * Grille de stat-cards : 4 → 2 → 1 colonnes, gérée par le CSS du DS.
 *
 * `.ds-stat-grid` est figé à quatre colonnes. Avec trois cartes, la quatrième
 * restait vide et les cartes s'arrêtaient au deux tiers de la page. On aligne
 * donc le nombre de colonnes sur le nombre réel de cartes, sans toucher au CSS
 * partagé (les tableaux de bord à quatre cartes gardent leur mise en page).
 */
export function StatGrid({ loading, count = 4, children }: {
  loading?: boolean;
  /** Nombre de cartes — sert aussi au nombre de squelettes pendant le chargement. */
  count?: number;
  /** Absent pendant le chargement : la grille n'affiche alors que des squelettes. */
  children?: React.ReactNode;
}) {
  const columns = Math.min(Math.max(count, 1), 4);

  return (
    <div
      className="ds-stat-grid mb-4"
      style={
        columns === 4
          ? undefined
          : ({ '--ds-stat-cols': String(columns) } as React.CSSProperties)
      }
    >
      {loading
        ? Array.from({ length: count }).map((_, index) => (
            <Skeleton key={index} height={92} className="rounded-lg" />
          ))
        : children}
    </div>
  );
}

/** En-tête d'une carte-liste : titre à gauche, compteur ou action à droite. */
export function ListHead({
  icon: Icon,
  title,
  right,
}: {
  icon: LucideIcon;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="ds-activity-head">
      <span className="flex items-center gap-2">
        <Icon width={16} height={16} aria-hidden style={{ color: 'var(--role-accent)' }} />
        <strong className="font-display text-ds-text">{title}</strong>
      </span>
      {right}
    </div>
  );
}

/** État vide « Encre & Craie » : carte à languette, icône, titre, explication. */
export function EmptyCard({
  icon: Icon,
  title,
  text,
  accent = 'info',
  action,
}: {
  icon: LucideIcon;
  title: string;
  text?: string;
  accent?: boolean | 'success' | 'warning' | 'danger' | 'info';
  action?: React.ReactNode;
}) {
  return (
    <Card className="text-center" accent={accent}>
      <Icon className="mx-auto mb-2 text-ds-text-tertiary" aria-hidden />
      <p className="font-display font-bold text-ds-text">{title}</p>
      {text && <p className="mx-auto mt-1 max-w-md text-sm text-ds-text-secondary">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </Card>
  );
}

/** Écran affiché tant qu'aucune classe n'est confiée à l'enseignant. */
export function NoClassState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="animate-fade-in mx-auto max-w-5xl">
      <PrimaryPageHead title={title} subtitle={subtitle} />
      <EmptyCard
        icon={GraduationCap}
        title="Aucune classe ne vous est attribuée"
        text="L'administration doit vous désigner titulaire d'une classe du primaire pour cette année scolaire."
      />
    </div>
  );
}

/** Moyenne en chiffre mono, verte au-dessus du seuil, rouge en dessous. */
export function AverageChip({
  value,
  scale,
  threshold,
}: {
  value: number | null;
  scale: number;
  threshold: number;
}) {
  if (value === null) {
    return <span className="ds-grade-avg shrink-0">—</span>;
  }
  return (
    <span className={cn('ds-grade-avg shrink-0', value >= threshold ? 'ds-avg-pass' : 'ds-avg-fail')}>
      {value.toFixed(2).replace('.', ',')}
      <span className="ml-0.5 text-[.72rem] font-medium text-ds-text-tertiary">/{scale}</span>
    </span>
  );
}
