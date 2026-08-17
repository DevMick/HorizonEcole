import { Select } from 'antd';

import { useOwnerContext } from '../../lib/hooks/useOwner';

/**
 * Filtre « Classe » de l'espace Propriétaire.
 *
 * La liste vient du référentiel `/owner/context`, jamais des données affichées.
 * La nuance est ce qui rend le filtre utilisable : une liste construite à
 * partir de la réponse courante se réduirait à la seule classe filtrée, et
 * l'utilisateur ne pourrait plus en sortir ni en choisir une autre.
 *
 * Les écrans qui exposent déjà plusieurs filtres construisent les leurs
 * localement ; celui-ci sert les écrans qui n'en avaient aucun.
 */
export interface OwnerClassFilterProps {
  /** Identifiant de la classe retenue, ou `undefined` pour « Toutes ». */
  value?: string;
  onChange: (classId: string | undefined) => void;
  /** Compare par nom plutôt que par identifiant, pour les écrans qui l'exigent. */
  parNom?: boolean;
  label?: string;
}

const TOUTES = '';

export function OwnerClassFilter({
  value,
  onChange,
  parNom = false,
  label = 'Classe',
}: OwnerClassFilterProps) {
  const context = useOwnerContext();
  const classes = context.data?.classes ?? [];

  // Une seule classe ne mérite pas un sélecteur : il n'offrirait aucun choix.
  if (classes.length < 2) return null;

  return (
    <label className="ds-owner-year-field">
      <span>{label}</span>
      <Select
        size="small"
        style={{ minWidth: 150 }}
        value={value ?? TOUTES}
        onChange={(choix) => onChange(choix === TOUTES ? undefined : choix)}
        options={[
          { value: TOUTES, label: 'Toutes' },
          ...classes.map((klass) => ({
            value: parNom ? klass.name : klass.id,
            label: klass.name,
          })),
        ]}
        aria-label="Filtrer par classe"
      />
    </label>
  );
}
