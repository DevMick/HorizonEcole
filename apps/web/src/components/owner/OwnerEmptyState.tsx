import { AlertTriangle, Info, Inbox, RefreshCw } from 'lucide-react';
import { Button } from '../ds';
import { cn } from '../../lib/utils';

export type OwnerEmptyVariant = 'empty' | 'info' | 'danger';

export interface OwnerEmptyStateProps {
  variant?: OwnerEmptyVariant;
  title: string;
  /** Une phrase, pas un paragraphe : ce qui manque, et pourquoi. */
  description?: React.ReactNode;
  /** Action de sortie — « Réessayer », « Voir 2024-2025 »… */
  action?: { label: string; onClick: () => void };
  className?: string;
}

const ICONS = { empty: Inbox, info: Info, danger: AlertTriangle } as const;

/**
 * État vide normalisé de l'espace Propriétaire (§5.7).
 *
 * Il existe pour une raison précise : **distinguer « zéro » de « inconnu »**.
 * Un module dont l'écran de saisie n'est pas monté n'a pas 0 FCFA de dépenses,
 * il n'a pas de données du tout — et l'afficher à zéro induirait le
 * propriétaire en erreur sur la santé de son école. Chaque agrégat sans ligne
 * source revient donc à `null` côté API et se rend ici, jamais en chiffre.
 */
export function OwnerEmptyState({
  variant = 'empty',
  title,
  description,
  action,
  className,
}: OwnerEmptyStateProps) {
  const Icon = ICONS[variant];

  return (
    <div
      className={cn('ds-owner-empty', `ds-owner-empty-${variant}`, className)}
      role={variant === 'danger' ? 'alert' : undefined}
    >
      <span className="ds-owner-empty-ic" aria-hidden>
        <Icon width={20} height={20} />
      </span>
      <div className="ds-owner-empty-body">
        <strong>{title}</strong>
        {description && <span>{description}</span>}
      </div>
      {action && (
        <Button
          variant="outline"
          size="sm"
          icon={variant === 'danger' ? <RefreshCw width={14} height={14} aria-hidden /> : undefined}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
