import { Card } from '../ds';
import { cn } from '../../lib/utils';

export interface OwnerSectionProps {
  title: string;
  /** Ce que la section mesure, en une phrase. */
  subtitle?: React.ReactNode;
  /** Filtres locaux, bascule d'affichage, lien d'export… */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Bloc de contenu de l'espace Propriétaire : une carte, un titre, un
 * sous-titre explicatif et un emplacement d'action.
 *
 * Le sous-titre n'est pas décoratif. Un indicateur mal compris est un
 * indicateur mal utilisé : « taux de réinscription » n'a pas le même sens
 * pour le comptable et pour le dirigeant, et c'est ici qu'on tranche.
 */
export function OwnerSection({ title, subtitle, action, children, className }: OwnerSectionProps) {
  return (
    <Card className={cn('ds-owner-section', className)}>
      <div className="ds-owner-section-head">
        <div className="ds-owner-section-title">
          <strong>{title}</strong>
          {subtitle && <span>{subtitle}</span>}
        </div>
        {action && <div className="ds-owner-section-action">{action}</div>}
      </div>
      {children}
    </Card>
  );
}
