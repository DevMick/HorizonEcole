import { useOwnerContext } from '../../lib/hooks/useOwner';
import { useOwnerFilters } from '../../lib/stores/owner-filters';

export interface OwnerPageProps {
  title: string;
  /** Ce que la page mesure — une phrase, lisible par un non-technicien. */
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * En-tête commun des écrans `/owner/*` : titre, sous-titre, et rappel de
 * l'année observée.
 *
 * Rappeler l'année en clair n'est pas cosmétique. Le sélecteur vit dans le
 * topbar, loin des chiffres ; sans ce rappel, un propriétaire peut lire les
 * effectifs de 2024-2025 en croyant regarder l'année en cours — et l'erreur ne
 * se voit pas, puisque les nombres sont plausibles.
 */
export function OwnerPage({ title, subtitle, children }: OwnerPageProps) {
  const { data } = useOwnerContext();
  const academicYearId = useOwnerFilters((s) => s.academicYearId);
  const compareAcademicYearId = useOwnerFilters((s) => s.compareAcademicYearId);

  // Chaînage optionnel jusqu'au bout : une réponse incomplète doit dégrader le
  // rappel d'année, pas vider l'écran. Sans cette garde, un `academicYears`
  // absent fait tomber toute la page derrière l'ErrorBoundary — la pire
  // dégradation possible pour un tableau de bord, qui perd alors même les
  // chiffres qu'il avait déjà.
  const years = data?.academicYears ?? [];
  const yearName = years.find((y) => y.id === academicYearId)?.name;
  const compareName = years.find((y) => y.id === compareAcademicYearId)?.name;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5">
        <h1 className="font-display text-[1.5rem] font-bold tracking-tight text-ds-text">{title}</h1>
        <p className="mt-1 text-sm text-ds-text-secondary">
          {subtitle}
          {yearName && (
            <>
              {subtitle ? ' — ' : ''}
              <strong className="font-semibold text-ds-text">{yearName}</strong>
              {compareName && <>, comparée à {compareName}</>}
            </>
          )}
        </p>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}
