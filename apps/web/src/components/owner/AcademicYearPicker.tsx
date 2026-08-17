import { useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Select } from 'antd';
import { CalendarRange } from 'lucide-react';
import { Drawer, Skeleton } from '../ds';
import { useOwnerContext } from '../../lib/hooks/useOwner';
import { useOwnerFilters } from '../../lib/stores/owner-filters';

/**
 * Sélecteur d'année scolaire (§5.3).
 *
 * Monté dans le topbar de l'espace Propriétaire, il pilote tous les écrans à la
 * fois : l'année choisie entre dans la clé React Query de chaque domaine, si
 * bien que passer de 2025-2026 à 2024-2025 recharge Effectifs, Finance et
 * Résultats sans qu'aucun écran n'ait à s'en occuper.
 *
 * L'**année de comparaison** n'est plus choisie ici : elle suit
 * automatiquement l'année précédente. Les deltas comparent donc toujours N à
 * N-1, ce qui est la seule lecture qu'on fait spontanément d'une flèche verte.
 *
 * La sélection vit dans l'URL (`?y=`) autant que dans la session : une vue se
 * partage alors telle qu'on la regarde, ce qui est le premier usage qu'un
 * dirigeant fait d'un tableau de bord.
 */
export function AcademicYearPicker() {
  const { data, isLoading } = useOwnerContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const academicYearId = useOwnerFilters((s) => s.academicYearId);
  const resolve = useOwnerFilters((s) => s.resolve);
  const setAcademicYearId = useOwnerFilters((s) => s.setAcademicYearId);

  const years = data?.academicYears;
  // L'URL n'a le dernier mot qu'au chargement : ensuite, c'est la sélection qui
  // écrit l'URL, et relire les paramètres reviendrait à se battre avec soi-même.
  const primed = useRef(false);

  useEffect(() => {
    if (!years?.length || primed.current) return;
    primed.current = true;
    resolve(years, data?.currentAcademicYearId ?? null, { year: searchParams.get('y') });
  }, [years, data?.currentAcademicYearId, resolve, searchParams]);

  useEffect(() => {
    if (!academicYearId) return;
    // Le sélecteur vit dans le topbar, donc hors du routeur : il est monté avant
    // que la redirection d'une adresse inconnue vers /owner n'ait abouti. Sans
    // cette garde, sa réécriture de la query écraserait cette redirection en
    // vol et figerait l'utilisateur sur l'adresse qu'il venait de quitter.
    if (!location.pathname.startsWith('/owner')) return;

    const next = new URLSearchParams(searchParams);
    next.set('y', academicYearId);
    if (next.toString() !== searchParams.toString()) {
      // `replace` : changer d'année n'est pas une navigation, le bouton retour
      // doit ramener à l'écran précédent, pas à l'année précédente.
      setSearchParams(next, { replace: true });
    }
  }, [academicYearId, location.pathname, searchParams, setSearchParams]);

  if (isLoading) return <Skeleton width={180} height={28} className="rounded-full" />;
  if (!years?.length) return null;

  const yearOptions = years.map((year) => ({ value: year.id, label: year.name }));

  const selectors = (
    <label className="ds-owner-year-field">
      <span>Année</span>
      <Select
        size="small"
        value={academicYearId ?? undefined}
        options={yearOptions}
        onChange={setAcademicYearId}
        style={{ minWidth: 120 }}
        aria-label="Année scolaire"
      />
    </label>
  );

  const currentLabel = years.find((year) => year.id === academicYearId)?.name ?? '—';

  return (
    <>
      {/* Écran large : le sélecteur dans le topbar. */}
      <div className="ds-owner-year hidden md:flex">{selectors}</div>

      {/* Mobile : le topbar n'a pas la place, la sélection passe en tiroir. */}
      <button
        type="button"
        className="ds-icon-btn md:hidden"
        style={{ width: 'auto', gap: 6, padding: '0 10px' }}
        onClick={() => setDrawerOpen(true)}
        aria-label="Choisir l'année scolaire"
      >
        <CalendarRange width={16} height={16} aria-hidden />
        <span className="text-xs font-semibold">{currentLabel}</span>
      </button>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Année scolaire">
        <div className="ds-owner-year ds-owner-year-stacked">{selectors}</div>
      </Drawer>
    </>
  );
}
