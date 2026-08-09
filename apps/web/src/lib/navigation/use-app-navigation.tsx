import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { MenuProps } from 'antd';
import {
  BookOpen,
  Building,
  Calendar,
  CalendarPlus,
  ClipboardCheck,
  ClipboardList,
  Clock,
  CreditCard,
  FilePlus,
  FileText,
  Gauge,
  GraduationCap,
  Hash,
  Home,
  LayoutDashboard,
  Link,
  PenSquare,
  School,
  Settings,
  Shield,
  ShieldAlert,
  Trophy,
  User,
  UserCog,
  Users,
  UsersRound,
  Wallet,
  Banknote,
} from 'lucide-react';
import { useAuthStore } from '../store';
import { useEstablishment } from '../hooks/useEstablishment';

const iconClass = 'h-4 w-4';

function LucideIcon({ icon: Icon, className }: { icon: typeof LayoutDashboard, className?: string }) {
  return <Icon className={`${iconClass} ${className || ''}`} aria-hidden="true" />;
}

/**
 * Filtre récursivement un arbre de menu Ant Design pour ne garder que les
 * items dont la clé figure dans `allowedKeys` (un groupe parent est gardé
 * s'il lui reste au moins un enfant visible). Utilisé pour les rôles
 * personnalisés (page Rôles) qui restreignent le sidebar par compte.
 */
function filterMenuByKeys(items: MenuProps['items'], allowedKeys: Set<string>): MenuProps['items'] {
  if (!items) return items;
  return items.reduce<NonNullable<MenuProps['items']>>((acc, item: any) => {
    if (!item) return acc;
    if (item.children) {
      const children = filterMenuByKeys(item.children, allowedKeys);
      if (children && children.length > 0) acc.push({ ...item, children });
      return acc;
    }
    if (allowedKeys.has(String(item.key))) acc.push(item);
    return acc;
  }, []);
}

export function useAppNavigation(onAfterNavigate?: () => void) {
  const { user } = useAuthStore();
  const { data: establishment } = useEstablishment();
  const navigate = useNavigate();
  const location = useLocation();
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  // Le type d'école décide des modules proposés : une école primaire n'a pas de
  // coefficients ni de conduite trimestrielle, un collège n'a pas de
  // compositions CP1 → CM2. Tant que l'établissement n'est pas chargé, on
  // affiche les deux plutôt qu'un menu vide qui clignoterait.
  const showPrimary = establishment?.modules.primary ?? true;
  const showSecondary = establishment?.modules.secondary ?? true;

  const go = useCallback(
    (path: string) => {
      navigate(path);
      onAfterNavigate?.();
    },
    [navigate, onAfterNavigate],
  );

  const menuItems: MenuProps['items'] = useMemo(() => {
    const role = String(user?.role || '').toUpperCase();

    // Espace Famille — lecture seule sur ses propres enfants. Aucune entrée
    // d'administration n'y apparaît : le menu est construit à part, il ne
    // « filtre » pas le menu admin.
    if (role === 'PARENT') {
      const isPrimaryOnlySchool = showPrimary && !showSecondary;
      return [
        {
          key: '/parent',
          icon: <LucideIcon icon={Home} />,
          label: 'Espace Famille',
          onClick: () => go('/parent'),
        },
        {
          key: 'family',
          icon: <LucideIcon icon={UsersRound} />,
          label: 'Ma famille',
          children: [
            {
              key: '/parent/children',
              icon: <LucideIcon icon={Users} />,
              label: 'Mes enfants',
              onClick: () => go('/parent/children'),
            },
          ],
        },
        {
          key: 'schooling',
          icon: <LucideIcon icon={BookOpen} />,
          label: 'Suivi scolaire',
          children: [
            {
              key: '/parent/timetable',
              icon: <LucideIcon icon={Clock} />,
              label: 'Emploi du Temps',
              onClick: () => go('/parent/timetable'),
            },
            ...(!isPrimaryOnlySchool ? [{
              key: '/parent/attendance',
              icon: <LucideIcon icon={ClipboardCheck} />,
              label: 'Présences',
              onClick: () => go('/parent/attendance'),
            }] : []),
            {
              key: '/parent/grades',
              icon: <LucideIcon icon={PenSquare} />,
              label: 'Résultats & Bulletins',
              onClick: () => go('/parent/grades'),
            },
          ],
        },
      ];
    }

    // Espace Élève — lecture seule de sa propre scolarité, à la première personne.
    if (role === 'STUDENT') {
      return [
        {
          key: '/student',
          icon: <LucideIcon icon={Home} />,
          label: 'Ma Scolarité',
          onClick: () => go('/student'),
        },
        {
          key: 'schooling',
          icon: <LucideIcon icon={BookOpen} />,
          label: 'Mon suivi',
          children: [
            {
              key: '/student/timetable',
              icon: <LucideIcon icon={Clock} />,
              label: 'Mon Emploi du Temps',
              onClick: () => go('/student/timetable'),
            },
            {
              key: '/student/attendance',
              icon: <LucideIcon icon={ClipboardCheck} />,
              label: 'Mes Présences',
              onClick: () => go('/student/attendance'),
            },
            {
              key: '/student/grades',
              icon: <LucideIcon icon={PenSquare} />,
              label: 'Mes Notes',
              onClick: () => go('/student/grades'),
            },
            {
              key: '/student/bulletins',
              icon: <LucideIcon icon={FileText} />,
              label: 'Mes Bulletins',
              onClick: () => go('/student/bulletins'),
            },
          ],
        },
      ];
    }

    if (user?.role === 'TEACHER') {
      // École primaire — l'enseignant y est titulaire d'une seule classe et y
      // enseigne toutes les matières. Son parcours n'a donc rien à voir avec
      // celui du secondaire (plusieurs classes, une matière) : pas d'emploi du
      // temps par matière, pas d'affectations, pas de types d'évaluation. Le
      // menu est à plat — neuf destinations, aucune arborescence à déplier —
      // parce que c'est ainsi qu'on l'utilise sur un téléphone.
      if (showPrimary && !showSecondary) {
        return [
          {
            key: '/dashboard',
            icon: <LucideIcon icon={LayoutDashboard} />,
            label: 'Tableau de bord',
            onClick: () => go('/dashboard'),
          },
          {
            key: '/primary/my-class',
            icon: <LucideIcon icon={Home} />,
            label: 'Ma Classe',
            onClick: () => go('/primary/my-class'),
          },
          {
            key: '/primary/my-students',
            icon: <LucideIcon icon={Users} />,
            label: 'Élèves',
            onClick: () => go('/primary/my-students'),
          },
          {
            key: '/primary/saisie',
            icon: <LucideIcon icon={PenSquare} />,
            label: 'Saisie de Notes',
            onClick: () => go('/primary/saisie'),
          },
          {
            key: '/primary/grades',
            icon: <LucideIcon icon={Trophy} />,
            label: 'Résultats & Bulletins',
            onClick: () => go('/primary/grades'),
          },
          {
            key: '/primary/annual-report',
            icon: <LucideIcon icon={FileText} />,
            label: 'Bilan Annuel',
            onClick: () => go('/primary/annual-report'),
          },
          {
            key: '/primary/profile',
            icon: <LucideIcon icon={User} />,
            label: 'Profil',
            onClick: () => go('/primary/profile'),
          },
        ];
      }

      return [
        {
          key: '/dashboard',
          icon: <LucideIcon icon={LayoutDashboard} />,
          label: 'Tableau de bord',
          onClick: () => go('/dashboard'),
        },
        {
          key: 'academic',
          icon: <LucideIcon icon={Calendar} />,
          label: 'Mon Planning',
          children: [
            {
              key: '/teacher/my-classes',
              icon: <LucideIcon icon={Users} />,
              label: 'Mes Classes',
              onClick: () => go('/teacher/my-classes'),
            },
            {
              key: '/teacher/my-timetable',
              icon: <LucideIcon icon={Clock} />,
              label: 'Mon Emploi du Temps',
              onClick: () => go('/teacher/my-timetable'),
            },
            {
              key: '/teacher/attendance',
              icon: <LucideIcon icon={Users} />,
              label: 'Liste de Présence',
              onClick: () => go('/teacher/attendance'),
            },
            {
              key: '/teacher/makeup',
              icon: <LucideIcon icon={CalendarPlus} />,
              label: 'Rattrapage',
              onClick: () => go('/teacher/makeup'),
            },
          ],
        },
        ...(showPrimary ? [{
          // École primaire : le titulaire y trouve sa classe, la saisie des
          // notes et ses classements. Aucune configuration — elle relève de
          // l'administration.
          key: 'primary',
          icon: <LucideIcon icon={School} />,
          label: 'École Primaire',
          children: [
            {
              key: '/primary/my-class',
              icon: <LucideIcon icon={Home} />,
              label: 'Ma Classe',
              onClick: () => go('/primary/my-class'),
            },
            {
              key: '/primary/grades',
              icon: <LucideIcon icon={Trophy} />,
              label: 'Résultats & Bulletins',
              onClick: () => go('/primary/grades'),
            },
          ],
        }] : []),
        ...(showSecondary ? [{
          key: 'evaluations',
          icon: <LucideIcon icon={BookOpen} />,
          label: 'Évaluations',
          children: [
            {
              key: '/evaluations/types',
              icon: <LucideIcon icon={BookOpen} />,
              label: "Types d'Évaluation",
              onClick: () => go('/evaluations/types'),
            },
            {
              key: '/evaluations/grades',
              icon: <LucideIcon icon={BookOpen} />,
              label: 'Notes & Classements',
              onClick: () => go('/evaluations/grades'),
            },
            {
              key: '/evaluations/averages',
              icon: <LucideIcon icon={Trophy} />,
              label: 'Moyennes par Trimestre',
              onClick: () => go('/evaluations/averages'),
            },
          ],
        }] : []),
      ];
    }

    const defaultItems: MenuProps['items'] = [
      {
        key: '/dashboard',
        icon: <LucideIcon icon={LayoutDashboard} />,
        label: 'Tableau de bord',
        onClick: () => go('/dashboard'),
      },
      {
        key: 'people',
        icon: <LucideIcon icon={Users} />,
        label: 'Gestion des Personnes',
        children: [
          { key: '/people/students', icon: <LucideIcon icon={Users} />, label: 'Élèves', onClick: () => go('/people/students') },
          { key: '/people/parents', icon: <LucideIcon icon={UsersRound} />, label: 'Parents', onClick: () => go('/people/parents') },
          { key: '/people/teachers', icon: <LucideIcon icon={User} />, label: 'Enseignants', onClick: () => go('/people/teachers') },
        ],
      },
      {
        key: 'academic',
        icon: <LucideIcon icon={Calendar} />,
        label: 'Année Académique',
        children: [
          { key: '/academic/years', icon: <LucideIcon icon={Calendar} />, label: 'Années Scolaires', onClick: () => go('/academic/years') },
          { key: '/academic/inscriptions', icon: <LucideIcon icon={FilePlus} />, label: 'Inscriptions', onClick: () => go('/academic/inscriptions') },
          ...(showSecondary ? [
            { key: '/people/classrooms', icon: <LucideIcon icon={Users} />, label: 'Salles de Classes', onClick: () => go('/people/classrooms') },
          ] : []),
          { key: '/academic/timetable', icon: <LucideIcon icon={Clock} />, label: 'Emploi du Temps', onClick: () => go('/academic/timetable') },
          ...(showSecondary ? [
            { key: '/academic/attendance', icon: <LucideIcon icon={ClipboardCheck} />, label: 'Liste de Présence', onClick: () => go('/academic/attendance') },
            { key: '/academic/uncalled-sessions', icon: <LucideIcon icon={ShieldAlert} />, label: 'Séances non tenues', onClick: () => go('/academic/uncalled-sessions') },
          ] : []),
        ],
      },
      ...(showSecondary ? [{
        key: 'pedagogy',
        icon: <LucideIcon icon={BookOpen} />,
        label: 'Pédagogie',
        children: [
          { key: '/academic/classes', icon: <LucideIcon icon={Users} />, label: 'Classes', onClick: () => go('/academic/classes') },
          { key: '/academic/subjects', icon: <LucideIcon icon={BookOpen} />, label: 'Matières', onClick: () => go('/academic/subjects') },
          { key: '/academic/assignments', icon: <LucideIcon icon={Link} />, label: 'Affectations', onClick: () => go('/academic/assignments') },
          { key: '/academic/coefficients', icon: <LucideIcon icon={Hash} />, label: 'Coefficients', onClick: () => go('/academic/coefficients') },
          { key: '/academic/class-grades', icon: <LucideIcon icon={BookOpen} />, label: 'Notes par Matière', onClick: () => go('/academic/class-grades') },
          { key: '/academic/conduct', icon: <LucideIcon icon={Gauge} />, label: 'Conduite', onClick: () => go('/academic/conduct') },
          { key: '/academic/complete-averages', icon: <LucideIcon icon={Trophy} />, label: 'Moyennes Complètes', onClick: () => go('/academic/complete-averages') },
        ],
      }] : []),
      ...(showPrimary ? [{
        // École primaire — module séparé du secondaire : la moyenne s'y calcule
        // « somme des notes ÷ diviseur du niveau », pas par coefficients.
        key: 'primary',
        icon: <LucideIcon icon={School} />,
        label: 'École Primaire',
        children: [
          { key: '/primary/classes', icon: <LucideIcon icon={GraduationCap} />, label: 'Classes', onClick: () => go('/primary/classes') },
          { key: '/primary/evaluations', icon: <LucideIcon icon={ClipboardList} />, label: 'Compositions', onClick: () => go('/primary/evaluations') },
          { key: '/primary/grades', icon: <LucideIcon icon={Trophy} />, label: 'Résultats & Bulletins', onClick: () => go('/primary/grades') },
        ],
      }] : []),
      {
        key: 'finance',
        icon: <LucideIcon icon={Wallet} />,
        label: 'Finance',
        children: [
          { key: '/finance/payment-conditions', icon: <LucideIcon icon={CreditCard} />, label: 'Échéanciers', onClick: () => go('/finance/payment-conditions') },
          { key: '/finance/payments', icon: <LucideIcon icon={Banknote} />, label: 'Paiements', onClick: () => go('/finance/payments') },
        ],
      },
      {
        key: 'administration',
        icon: <LucideIcon icon={Settings} />,
        label: 'Administration',
        children: [
          { key: '/people/roles', icon: <LucideIcon icon={Shield} />, label: 'Rôles', onClick: () => go('/people/roles') },
          { key: '/people/users', icon: <LucideIcon icon={UserCog} />, label: 'Utilisateurs', onClick: () => go('/people/users') },
          { key: '/etablissement', icon: <LucideIcon icon={Building} />, label: 'Établissement', onClick: () => go('/etablissement') },
        ],
      },
    ];

    if (String(user?.role || '').toUpperCase() === 'ADMIN') return defaultItems;

    const allowedMenuKeys: string[] | undefined = user?.customRole?.menuKeys;
    if (allowedMenuKeys && allowedMenuKeys.length > 0) {
      return filterMenuByKeys(defaultItems, new Set(allowedMenuKeys)) || [];
    }
    return defaultItems;
  }, [user?.role, user?.roleId, user?.customRole, go, showPrimary, showSecondary]);

  const selectedKey = location.pathname.startsWith('/academic/')
    ? location.pathname
    : location.pathname;

  useEffect(() => {
    const path = location.pathname;
    const keys: string[] = [];

    if (
      path.startsWith('/academic/years') ||
      path.startsWith('/academic/inscriptions') ||
      path.startsWith('/academic/timetable') ||
      path.startsWith('/academic/attendance') ||
      path.startsWith('/academic/uncalled-sessions') ||
      path.startsWith('/people/classrooms')
    ) {
      keys.push('academic');
    }
    if (
      path.startsWith('/academic/classes') ||
      path.startsWith('/academic/subjects') ||
      path.startsWith('/academic/assignments') ||
      path.startsWith('/academic/coefficients') ||
      path.startsWith('/academic/complete-averages') ||
      path.startsWith('/academic/class-grades') ||
      path.startsWith('/academic/conduct')
    ) {
      keys.push('pedagogy');
    }
    if (
      path.startsWith('/people/') &&
      !path.startsWith('/people/roles') &&
      !path.startsWith('/people/users')
    ) keys.push('people');
    if (
      path.startsWith('/people/roles') ||
      path.startsWith('/people/users') ||
      path.startsWith('/etablissement')
    ) keys.push('administration');
    if (path.startsWith('/primary/')) keys.push('primary');
    if (path.startsWith('/finance/')) keys.push('finance');
    if (path.startsWith('/teacher/')) keys.push('academic');
    if (path.startsWith('/evaluations/')) keys.push('evaluations');
    if (path.startsWith('/parent/children')) keys.push('family');
    if (
      path.startsWith('/parent/timetable') ||
      path.startsWith('/parent/attendance') ||
      path.startsWith('/parent/grades') ||
      path.startsWith('/parent/bulletins') ||
      path.startsWith('/student/timetable') ||
      path.startsWith('/student/attendance') ||
      path.startsWith('/student/grades') ||
      path.startsWith('/student/bulletins')
    ) {
      keys.push('schooling');
    }

    setOpenKeys(keys);
  }, [location.pathname]);

  return {
    menuItems,
    openKeys,
    selectedKey,
    setOpenKeys,
  };
}
