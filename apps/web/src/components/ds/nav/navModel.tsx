import type { MenuProps } from 'antd';
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  FilePlus,
  ClipboardCheck,
  BookOpen,
  FileText,
  Home,
  PenSquare,
  Trophy,
  Wallet,
  Menu as MenuIcon,
} from 'lucide-react';

/** Modèle de navigation simple dérivé du menu Ant de use-app-navigation. */
export interface NavLeaf {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}
export interface NavSection {
  /** Libellé de groupe (undefined = éléments de premier niveau sans en-tête). */
  label?: string;
  items: NavLeaf[];
}

type AntItem = NonNullable<MenuProps['items']>[number] & {
  key?: React.Key;
  label?: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  children?: AntItem[];
};

/**
 * Convertit le menu Ant (source de vérité : use-app-navigation.tsx) en sections
 * DS. Les entrées avec `children` deviennent un groupe (label + items), les
 * feuilles de premier niveau une section sans label. Aucune donnée inventée.
 */
export function adaptMenu(items: MenuProps['items']): NavSection[] {
  const sections: NavSection[] = [];
  for (const raw of (items ?? []) as AntItem[]) {
    if (!raw || (raw as { type?: string }).type === 'divider') continue;
    const children = raw.children;
    if (children && children.length) {
      sections.push({
        label: typeof raw.label === 'string' ? raw.label : String(raw.key),
        items: children.map(toLeaf),
      });
    } else {
      sections.push({ items: [toLeaf(raw)] });
    }
  }
  return sections;
}

function toLeaf(item: AntItem): NavLeaf {
  return {
    key: String(item.key),
    label: typeof item.label === 'string' ? item.label : String(item.key),
    icon: item.icon,
    onClick: item.onClick,
  };
}

export interface TabbarItem {
  label: string;
  icon: React.ReactNode;
  path: string;
}

const ICON = { className: 'h-5 w-5', 'aria-hidden': true } as const;

/**
 * Raccourcis de la tabbar mobile (§7) : 4 destinations fréquentes par rôle,
 * toutes reliées à des routes réelles existantes. Le 5ᵉ bouton « Menu » ouvre
 * le tiroir de navigation complet (géré par l'AppShell).
 */
export function getTabbarItems(
  role?: string | null,
  options: { primaryOnly?: boolean } = {},
): TabbarItem[] {
  const normalizedRole = String(role).toUpperCase();
  // Propriétaire : quatre raccourcis, tous dans son espace. Sans cette branche,
  // le repli administratif en fin de fonction l'enverrait vers /dashboard,
  // /people/students, /academic/timetable et /academic/inscriptions — quatre
  // écrans qui lui sont fermés. C'est un point de sécurité, pas de confort.
  if (normalizedRole === 'OWNER') {
    return [
      { label: 'Accueil', icon: <LayoutDashboard {...ICON} />, path: '/owner' },
      { label: 'Effectifs', icon: <Users {...ICON} />, path: '/owner/effectifs' },
      { label: 'Résultats', icon: <Trophy {...ICON} />, path: '/owner/resultats' },
      { label: 'Finance', icon: <Wallet {...ICON} />, path: '/owner/finance' },
    ];
  }
  if (normalizedRole === 'STUDENT') {
    return [
      { label: 'Accueil', icon: <Home {...ICON} />, path: '/student' },
      { label: 'Notes', icon: <PenSquare {...ICON} />, path: '/student/grades' },
      { label: 'Planning', icon: <CalendarClock {...ICON} />, path: '/student/timetable' },
      { label: 'Bulletins', icon: <FileText {...ICON} />, path: '/student/bulletins' },
    ];
  }
  if (normalizedRole === 'PARENT') {
    if (options.primaryOnly) {
      return [
        { label: 'Accueil', icon: <Home {...ICON} />, path: '/parent' },
        { label: 'Résultats', icon: <Trophy {...ICON} />, path: '/parent/grades' },
      ];
    }
    return [
      { label: 'Accueil', icon: <Home {...ICON} />, path: '/parent' },
      { label: 'Résultats', icon: <Trophy {...ICON} />, path: '/parent/grades' },
      { label: 'Présences', icon: <ClipboardCheck {...ICON} />, path: '/parent/attendance' },
    ];
  }
  if (normalizedRole === 'TEACHER') {
    // Titulaire du primaire : ni présence par séance ni emploi du temps par
    // matière — ses quatre gestes sont sa classe, ses élèves, ses notes et ses
    // moyennes.
    if (options.primaryOnly) {
      return [
        { label: 'Ma Classe', icon: <Home {...ICON} />, path: '/primary/my-class' },
        { label: 'Élèves', icon: <Users {...ICON} />, path: '/primary/my-students' },
        { label: 'Résultats & Bulletins', icon: <Trophy {...ICON} />, path: '/primary/grades' },
      ];
    }
    return [
      { label: 'Accueil', icon: <LayoutDashboard {...ICON} />, path: '/dashboard' },
      { label: 'Présence', icon: <ClipboardCheck {...ICON} />, path: '/teacher/attendance' },
      { label: 'Notes', icon: <BookOpen {...ICON} />, path: '/evaluations/grades' },
      { label: 'Planning', icon: <CalendarClock {...ICON} />, path: '/teacher/my-timetable' },
    ];
  }
  return [
    { label: 'Accueil', icon: <LayoutDashboard {...ICON} />, path: '/dashboard' },
    { label: 'Élèves', icon: <Users {...ICON} />, path: '/people/students' },
    { label: 'Planning', icon: <CalendarClock {...ICON} />, path: '/academic/timetable' },
    { label: 'Inscriptions', icon: <FilePlus {...ICON} />, path: '/academic/inscriptions' },
  ];
}

export const MenuTabIcon = MenuIcon;
