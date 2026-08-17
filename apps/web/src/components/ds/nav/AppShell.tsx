import { useEffect, useState } from 'react';
import { cn } from '../../../lib/utils';
import { AppSidebar } from './AppSidebar';
import { AppTopbar } from './AppTopbar';
import { MobileTabbar } from './MobileTabbar';
import type { NavSection, TabbarItem } from './navModel';

export interface AppShellProps {
  sections: NavSection[];
  selectedKey: string;
  tabbarItems: TabbarItem[];
  onNavigatePath: (path: string) => void;
  /** Pied de sidebar (chip utilisateur / menu profil). */
  sidebarFooter?: React.ReactNode;
  /** Actions de la topbar (thème, notifications, profil). */
  topbarActions?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  brandTitle?: string;
  brandSubtitle?: string;
  children: React.ReactNode;
}

/**
 * Coquille applicative « Encre & Craie » (§7) : sidebar complète > rail
 * tablette > tiroir + tabbar mobile. Le responsive structurel est en CSS ;
 * l'état d'ouverture du tiroir mobile est géré ici.
 */
export function AppShell({
  sections,
  selectedKey,
  tabbarItems,
  onNavigatePath,
  sidebarFooter,
  topbarActions,
  title,
  subtitle,
  brandTitle = 'HorizonEcole',
  // Repli volontairement neutre : le nom d'une école en dur ici s'afficherait
  // chez toutes les autres. Layout passe le nom réel de l'établissement.
  brandSubtitle = 'Gestion scolaire',
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);

  // Échap ferme le tiroir mobile.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const brand = (
    <div className="ds-brand">
      {/*
        Chemin construit sur BASE_URL ('/app/') et non relatif : la barre
        latérale s'affiche sur toutes les routes, et « logo.png » se résoudrait
        en /app/owner/logo.png dès qu'une route a deux niveaux.
      */}
      <img
        className="ds-brand-mark"
        src={`${import.meta.env.BASE_URL}logo-horizonecole.png`}
        alt=""
        width={34}
        height={34}
        aria-hidden
      />
      <div className="ds-brand-text">
        {/* Les deux couleurs de la marque ne s'appliquent qu'au nom du produit :
            un titre personnalisé passerait par la découpe et serait tronqué. */}
        <strong>
          {brandTitle === 'HorizonEcole' ? (
            <>
              <span className="ds-brand-ink">Horizon</span>
              <span className="ds-brand-ambre">Ecole</span>
            </>
          ) : (
            brandTitle
          )}
        </strong>
        <span>{brandSubtitle}</span>
      </div>
    </div>
  );

  return (
    <div className="ds-shell">
      <AppSidebar
        id="ds-app-sidebar"
        sections={sections}
        selectedKey={selectedKey}
        brand={brand}
        footer={sidebarFooter}
        open={mobileOpen}
        onNavigate={(leaf) => {
          leaf.onClick?.();
          close();
        }}
      />
      <div
        className={cn('ds-sidebar-scrim', mobileOpen && 'ds-open')}
        onClick={close}
        aria-hidden
      />

      <div className="ds-main">
        <AppTopbar
          title={title}
          subtitle={subtitle}
          actions={topbarActions}
          onOpenMenu={() => setMobileOpen(true)}
        />
        <main className="ds-content">{children}</main>
      </div>

      <MobileTabbar
        items={tabbarItems}
        selectedPath={selectedKey}
        onNavigate={(p) => {
          onNavigatePath(p);
          close();
        }}
        onOpenMenu={() => setMobileOpen(true)}
      />
    </div>
  );
}
