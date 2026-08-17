/**
 * Moteur d'annotation : pose des pastilles numérotées reliées par une flèche à
 * l'élément qu'elles désignent, directement dans la page.
 *
 * Le dessin est fait **dans le navigateur**, avant la capture : les pastilles
 * font donc partie des pixels de l'image. Une pastille posée en calque HTML
 * au-dessus d'une image, elle, ne survivrait pas au passage dans Word — et une
 * capture sans ses numéros rend le tableau de légende inutilisable.
 *
 * La fonction est exportée sous forme de source, pour être injectée telle
 * quelle par page.evaluate().
 */

/**
 * @param {Array<{n:number, selecteur:string, cote?:string}>} cibles
 * Exécuté dans la page. Retourne le compte-rendu de ce qui a pu être posé.
 */
function poserAnnotations(cibles) {
  const NS = 'http://www.w3.org/2000/svg';
  const COULEUR = '#D81E2C';
  const RAYON = 17;
  const MARGE = 14;

  const ancien = document.getElementById('guide-annotations');
  if (ancien) ancien.remove();

  const largeurPage = Math.max(document.documentElement.scrollWidth, window.innerWidth);
  const hauteurPage = Math.max(document.documentElement.scrollHeight, window.innerHeight);

  const svg = document.createElementNS(NS, 'svg');
  svg.id = 'guide-annotations';
  svg.setAttribute('width', largeurPage);
  svg.setAttribute('height', hauteurPage);
  svg.setAttribute('viewBox', `0 0 ${largeurPage} ${hauteurPage}`);
  Object.assign(svg.style, {
    position: 'absolute',
    left: '0',
    top: '0',
    width: largeurPage + 'px',
    height: hauteurPage + 'px',
    zIndex: '2147483000',
    pointerEvents: 'none',
    overflow: 'visible',
  });

  const defs = document.createElementNS(NS, 'defs');
  defs.innerHTML =
    `<marker id="guide-fleche" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">` +
    `<path d="M 0 0 L 10 5 L 0 10 z" fill="${COULEUR}"/></marker>`;
  svg.appendChild(defs);
  document.body.appendChild(svg);

  /**
   * Rectangle absolu d'un élément. Si l'élément est masqué — fréquent : les
   * composants de formulaire remplacent l'input d'origine par un rendu maison,
   * et l'input réel reste caché — on remonte au premier ancêtre visible plutôt
   * que d'abandonner l'annotation.
   */
  function rectangleVisible(el) {
    let courant = el;
    for (let i = 0; courant && i < 6; i++) {
      const r = courant.getBoundingClientRect();
      const s = getComputedStyle(courant);
      const visible =
        r.width >= 4 &&
        r.height >= 4 &&
        s.visibility !== 'hidden' &&
        s.display !== 'none' &&
        Number(s.opacity) > 0.05;
      if (visible) {
        return {
          x: r.x + window.scrollX,
          y: r.y + window.scrollY,
          w: r.width,
          h: r.height,
          remonte: i > 0,
        };
      }
      courant = courant.parentElement;
    }
    return null;
  }

  const propre = (s) => (s || '').replace(/\s+/g, ' ').trim();

  /**
   * Comparaison indulgente : la casse et les accents ne doivent pas décider du
   * succès d'une annotation. « RACCOURCIS » à l'écran est souvent « Raccourcis »
   * dans le code — la mise en majuscules vient de la feuille de style.
   */
  const cle = (s) =>
    propre(s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[’']/g, "'");

  /**
   * Résout la cible d'une pastille.
   *
   * L'application ne pose presque pas d'`id` : viser par sélecteur CSS donnerait
   * des ancrages qui cassent à la première refonte de style. On vise donc par
   * ce que le lecteur voit — un libellé de bouton, une étiquette de champ, un
   * en-tête de colonne :
   *
   *   texte=Nouvel élève      bouton ou lien portant ce libellé
   *   champ=Nom               le bloc « étiquette + saisie » d'un formulaire
   *   aria=Voir la fiche      élément portant cet aria-label ou ce title
   *   colonne=Montant         en-tête de colonne d'un tableau
   *   menu=Inscriptions       entrée du menu latéral
   *   contient=Moyenne        premier bloc dont le texte contient cette chaîne
   *   #id, .classe, …         sélecteur CSS, pour le reste
   */
  function resoudre(selecteur, index) {
    const i = Math.max(0, index || 0);
    const prendre = (liste) => (liste.length > i ? liste[i] : null);
    const m = /^([a-z]+)=(.*)$/s.exec(selecteur);

    if (m) {
      const [, type, valeur] = m;
      const v = propre(valeur);

      if (type === 'texte') {
        // On cherche d'abord dans la zone de travail : sans cela, « Élèves »
        // désignerait l'entrée du menu latéral — première dans le document —
        // et non le bouton de la page dont parle la légende.
        const zones = [
          ...document.querySelectorAll('.ds-modal, .ant-modal, .ant-drawer-content'),
          document.querySelector('main'),
          document.body,
        ].filter(Boolean);
        const k = cle(v);
        for (const zone of zones) {
          const boutons = [...zone.querySelectorAll('button, a, [role="button"], .ant-btn')];
          const exacts = boutons.filter(
            (el) => cle(el.innerText) === k || cle(el.textContent) === k,
          );
          if (exacts.length > i) return exacts[i];
          // Bouton à icône seule : le libellé n'est pas dans le texte mais dans
          // l'attribut d'accessibilité. C'est le cas de la plupart des actions
          // de liste — « Voir la fiche », « Affecter aux classes »…
          const parEtiquette = boutons.filter(
            (el) =>
              cle(el.getAttribute('aria-label')) === k || cle(el.getAttribute('title')) === k,
          );
          if (parEtiquette.length > i) return parEtiquette[i];
          const partiels = boutons.filter((el) => cle(el.innerText).includes(k));
          if (partiels.length > i) return partiels[i];
        }
        return null;
      }

      if (type === 'champ') {
        const etiquettes = [...document.querySelectorAll('label, .ant-form-item-label label, .ds-field span')]
          .filter((el) => cle(el.textContent).replace(/\s*\*$/, '') === cle(v));
        const cible = prendre(etiquettes);
        if (!cible) return null;
        // Le bloc entier — étiquette et zone de saisie — parle mieux au lecteur
        // que la seule étiquette.
        return cible.closest('.ant-form-item, .ds-field, label') || cible;
      }

      if (type === 'aria') {
        return prendre([
          ...document.querySelectorAll(`[aria-label="${v}"], [title="${v}"]`),
        ]);
      }

      if (type === 'colonne') {
        // Les espaces d'un en-tête viennent souvent de la mise en page, pas du
        // texte : « MOY. /20 » à l'écran s'écrit « MOY./20 » dans le document.
        // On compare donc aussi espaces retirés.
        const serre = (s) => cle(s).replace(/\s+/g, '');
        const entetes = [...document.querySelectorAll('th')];
        const exacts = entetes.filter((el) => cle(el.textContent) === cle(v));
        if (exacts.length > i) return exacts[i];
        return prendre(entetes.filter((el) => serre(el.textContent) === serre(v)));
      }

      if (type === 'menu') {
        return prendre(
          [...document.querySelectorAll('.ds-nav-item, .ant-menu-item, .ant-menu-submenu-title')]
            .filter((el) => propre(el.innerText) === v),
        );
      }

      if (type === 'groupe') {
        // Intitulé de section du menu latéral (« ÉCOLE PRIMAIRE »…).
        return prendre(
          [...document.querySelectorAll('.ds-nav-group-label')].filter(
            (el) => propre(el.textContent).toUpperCase() === v.toUpperCase(),
          ),
        );
      }

      if (type === 'bloc') {
        // Comme « contient », mais on remonte à la carte qui englobe le texte :
        // le lecteur voit désigner l'encadré entier, pas un mot isolé.
        const k = cle(v);
        const exact = [...document.querySelectorAll('main *, .ds-modal *, .ant-modal *')].filter(
          (el) =>
            cle(el.textContent).includes(k) &&
            ![...el.children].some((enfant) => cle(enfant.textContent).includes(k)),
        );
        const trouve = prendre(exact);
        if (!trouve) return null;
        return trouve.closest('.ds-card, .ant-card, .ds-panel, section, article') || trouve;
      }

      if (type === 'contient') {
        const k = cle(v);
        const tous = [...document.querySelectorAll('main *, .ds-modal *, .ant-modal *')].filter((el) => {
          if (!cle(el.textContent).includes(k)) return false;
          // On garde le bloc le plus proche du texte, pas la page entière.
          return ![...el.children].some((enfant) => cle(enfant.textContent).includes(k));
        });
        return prendre(tous);
      }
    }

    try {
      return prendre([...document.querySelectorAll(selecteur)]);
    } catch {
      return null;
    }
  }

  const poses = [];
  const rapport = [];

  const chevauche = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  // Premier passage : on résout **toutes** les cibles avant d'en placer une
  // seule. Sans cela, la pastille n° 3 peut venir se poser sur l'élément que
  // désignera la n° 4 — recouvrant un libellé que la légende suivante commente.
  const resolues = [];
  for (const cible of cibles) {
    const el = resoudre(cible.selecteur, cible.index);
    if (!el) {
      rapport.push({ n: cible.n, ok: false, motif: 'sélecteur introuvable' });
      continue;
    }
    const r = rectangleVisible(el);
    if (!r) {
      rapport.push({ n: cible.n, ok: false, motif: 'élément non visible' });
      continue;
    }
    resolues.push({ cible, r });
  }

  /** Zones à ne pas recouvrir : les éléments désignés eux-mêmes, sauf le sien. */
  const zonesCibles = resolues.map(({ r }) => ({
    x: r.x - 4,
    y: r.y - 4,
    w: r.w + 8,
    h: r.h + 8,
  }));

  for (let index = 0; index < resolues.length; index++) {
    const { cible, r } = resolues[index];

    // Cadre discret autour de l'élément désigné : le lecteur voit d'un coup
    // d'œil l'étendue exacte de ce dont parle la légende.
    const cadre = document.createElementNS(NS, 'rect');
    cadre.setAttribute('x', r.x - 3);
    cadre.setAttribute('y', r.y - 3);
    cadre.setAttribute('width', r.w + 6);
    cadre.setAttribute('height', r.h + 6);
    cadre.setAttribute('rx', '6');
    cadre.setAttribute('fill', 'none');
    cadre.setAttribute('stroke', COULEUR);
    cadre.setAttribute('stroke-width', '2');
    cadre.setAttribute('stroke-dasharray', '5 4');
    cadre.setAttribute('opacity', '0.85');
    svg.appendChild(cadre);

    // Côtés candidats, dans l'ordre demandé puis par défaut. On bascule
    // automatiquement si la pastille sortirait de l'image ou en recouvrait une
    // autre.
    const ordre = cible.cote
      ? [cible.cote, 'gauche', 'droite', 'haut', 'bas']
      : ['gauche', 'droite', 'haut', 'bas'];
    const candidats = {
      gauche: { cx: r.x - MARGE - RAYON, cy: r.y + r.h / 2 },
      droite: { cx: r.x + r.w + MARGE + RAYON, cy: r.y + r.h / 2 },
      haut: { cx: r.x + Math.min(r.w / 2, 60), cy: r.y - MARGE - RAYON },
      bas: { cx: r.x + Math.min(r.w / 2, 60), cy: r.y + r.h + MARGE + RAYON },
    };

    let choisi = null;
    // Deux tours : au premier on refuse de recouvrir un autre élément annoté ;
    // au second on relâche cette exigence, faute de quoi une page dense
    // laisserait des légendes sans pastille.
    for (const strict of [true, false]) {
      for (const cote of ordre) {
        const c = candidats[cote];
        if (!c) continue;
        const boite = {
          x: c.cx - RAYON - 4,
          y: c.cy - RAYON - 4,
          w: (RAYON + 4) * 2,
          h: (RAYON + 4) * 2,
        };
        const dansLimites =
          boite.x >= 2 && boite.y >= 2 && boite.x + boite.w <= largeurPage - 2;
        if (!dansLimites) continue;
        if (poses.some((p) => chevauche(boite, p))) continue;
        if (
          strict &&
          zonesCibles.some((z, j) => j !== index && chevauche(boite, z))
        ) {
          continue;
        }
        choisi = { ...c, boite };
        break;
      }
      if (choisi) break;
    }
    if (!choisi) {
      // Dernier recours : à droite, quitte à serrer. Mieux vaut une pastille un
      // peu tassée qu'une légende sans repère sur l'image.
      const c = candidats.droite;
      choisi = {
        ...c,
        boite: { x: c.cx - RAYON, y: c.cy - RAYON, w: RAYON * 2, h: RAYON * 2 },
      };
    }
    poses.push(choisi.boite);

    // Flèche : de la pastille vers le point du cadre le plus proche.
    const ancreX = Math.max(r.x, Math.min(choisi.cx, r.x + r.w));
    const ancreY = Math.max(r.y, Math.min(choisi.cy, r.y + r.h));
    const dx = ancreX - choisi.cx;
    const dy = ancreY - choisi.cy;
    const dist = Math.hypot(dx, dy) || 1;
    const depart = {
      x: choisi.cx + (dx / dist) * (RAYON + 2),
      y: choisi.cy + (dy / dist) * (RAYON + 2),
    };

    const ligne = document.createElementNS(NS, 'line');
    ligne.setAttribute('x1', depart.x);
    ligne.setAttribute('y1', depart.y);
    ligne.setAttribute('x2', ancreX - (dx / dist) * 3);
    ligne.setAttribute('y2', ancreY - (dy / dist) * 3);
    ligne.setAttribute('stroke', COULEUR);
    ligne.setAttribute('stroke-width', '2.5');
    ligne.setAttribute('marker-end', 'url(#guide-fleche)');
    svg.appendChild(ligne);

    // Pastille : cerne blanc pour rester lisible sur un fond sombre comme clair.
    const halo = document.createElementNS(NS, 'circle');
    halo.setAttribute('cx', choisi.cx);
    halo.setAttribute('cy', choisi.cy);
    halo.setAttribute('r', RAYON + 2.5);
    halo.setAttribute('fill', '#FFFFFF');
    svg.appendChild(halo);

    const rond = document.createElementNS(NS, 'circle');
    rond.setAttribute('cx', choisi.cx);
    rond.setAttribute('cy', choisi.cy);
    rond.setAttribute('r', RAYON);
    rond.setAttribute('fill', COULEUR);
    svg.appendChild(rond);

    const num = document.createElementNS(NS, 'text');
    num.setAttribute('x', choisi.cx);
    num.setAttribute('y', choisi.cy + 1);
    num.setAttribute('text-anchor', 'middle');
    num.setAttribute('dominant-baseline', 'middle');
    num.setAttribute('fill', '#FFFFFF');
    num.setAttribute('font-family', 'Segoe UI, Arial, sans-serif');
    num.setAttribute('font-size', '19');
    num.setAttribute('font-weight', '700');
    num.textContent = String(cible.n);
    svg.appendChild(num);

    // On remonte la position de la pastille : si la capture est volontairement
    // recadrée, une pastille posée plus bas existerait dans la page mais serait
    // absente de l'image — et sa ligne de légende renverrait dans le vide.
    rapport.push({
      n: cible.n,
      ok: true,
      remonte: r.remonte,
      basPastille: Math.round(choisi.cy + RAYON + 4),
    });
  }

  return rapport;
}

module.exports = { poserAnnotations };
