import { useCallback, useRef, useState } from 'react';

/**
 * Infobulle partagée par les graphiques de l'espace Propriétaire.
 *
 * Pourquoi ce composant existe : les graphiques s'appuyaient sur `<title>` SVG,
 * c'est-à-dire l'infobulle native du navigateur. Elle n'apparaît qu'après une
 * seconde d'immobilité, ne se déclenche que sur la forme elle-même — un point
 * de 3,5 px de rayon sur une courbe — et ne peut pas être mise en forme. En
 * pratique, personne ne la voyait : le lecteur promenait son curseur sur le
 * graphique sans rien obtenir.
 *
 * Ici, l'infobulle est un simple bloc HTML posé au-dessus du graphique. Elle
 * suit le pointeur, apparaît immédiatement, et se retourne près du bord droit
 * pour ne jamais sortir du cadre. Les zones de survol sont dessinées largement
 * — une bande verticale complète sur une courbe, la colonne entière sur un
 * histogramme — plutôt que sur la forme visible.
 *
 * L'accessibilité ne dépend pas de ce mécanisme : chaque graphique porte déjà
 * un `role="img"` et un `aria-label` qui énonce la totalité des valeurs.
 */

export interface LigneInfobulle {
  label: string;
  valeur: string;
  /** Pastille de couleur, quand plusieurs séries cohabitent. */
  couleur?: string;
}

export interface ContenuInfobulle {
  titre: string;
  lignes: LigneInfobulle[];
}

interface EtatInfobulle extends ContenuInfobulle {
  x: number;
  y: number;
}

/** Largeur estimée de l'infobulle, pour décider du retournement près du bord. */
const LARGEUR_ESTIMEE = 190;

export function useChartTooltip() {
  const conteneur = useRef<HTMLDivElement>(null);
  const [etat, setEtat] = useState<EtatInfobulle | null>(null);

  const montrer = useCallback((evenement: { clientX: number; clientY: number }, contenu: ContenuInfobulle) => {
    const boite = conteneur.current?.getBoundingClientRect();
    if (!boite) return;
    setEtat({
      ...contenu,
      x: evenement.clientX - boite.left,
      y: evenement.clientY - boite.top,
    });
  }, []);

  const cacher = useCallback(() => setEtat(null), []);

  const infobulle = etat ? (
    <div
      className="ds-chart-tip"
      style={{
        // Au-delà du milieu, l'infobulle se place à gauche du pointeur : sinon
        // elle déborderait de la carte et se ferait rogner.
        left: etat.x,
        top: etat.y,
        transform:
          etat.x > (conteneur.current?.clientWidth ?? 0) - LARGEUR_ESTIMEE
            ? 'translate(calc(-100% - 14px), -50%)'
            : 'translate(14px, -50%)',
      }}
      role="presentation"
    >
      <p className="ds-chart-tip-title">{etat.titre}</p>
      <ul>
        {etat.lignes.map((ligne, index) => (
          <li key={`${ligne.label}-${index}`}>
            {ligne.couleur && (
              <span className="ds-chart-tip-dot" style={{ background: ligne.couleur }} aria-hidden />
            )}
            <span className="ds-chart-tip-label">{ligne.label}</span>
            <strong>{ligne.valeur}</strong>
          </li>
        ))}
      </ul>
    </div>
  ) : null;

  return { conteneur, montrer, cacher, infobulle };
}
