import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileText,
  GraduationCap,
  PenSquare,
  Trophy,
  Users,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { useAuthStore } from '../../lib/store';
import { useAcademicYears } from '../../lib/hooks/useAcademicYears';
import {
  useMyPrimaryClasses,
  usePrimaryClassGrid,
  usePrimaryEvaluations,
} from '../../lib/hooks/usePrimary';
import { Button, Card, Skeleton, StatusBadge } from '../ds';
import {
  EmptyCard,
  ListHead,
  StatGrid,
  StatTile,
} from '../primary/PrimaryTeacherShell';

dayjs.locale('fr');

/**
 * Tableau de bord du titulaire du primaire.
 *
 * Il répond aux trois questions du matin : quelle est ma classe, où en sont mes
 * compositions, et où saisir. Rien d'un emploi du temps par matière — au
 * primaire, le maître fait toute la journée avec les mêmes élèves.
 *
 * Même grammaire que l'accueil de l'espace Famille : salutation datée, bandeau
 * de contexte, compteurs à médaillon, listes d'activité, raccourcis en fin de
 * page.
 */

const SHORTCUTS = [
  { label: 'Résultats & Bulletins', path: '/primary/grades', icon: Trophy },
  { label: 'Mes élèves', path: '/primary/my-students', icon: Users },
  { label: 'Ma classe', path: '/primary/my-class', icon: GraduationCap },
  { label: 'Bilan annuel', path: '/primary/annual-report', icon: FileText },
];

export function PrimaryTeacherDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentYear } = useAcademicYears();

  const { data: mine, isLoading } = useMyPrimaryClasses(currentYear?.id);
  const schoolClass = mine?.classes?.[0] ?? null;

  const { data: grid } = usePrimaryClassGrid(schoolClass?.id);
  const { data: evaluations } = usePrimaryEvaluations(currentYear?.id, schoolClass?.id);

  const list = evaluations || [];
  const openEvaluations = list.filter((item) => !item.isLocked);
  // La prochaine à saisir : la plus proche parmi celles encore ouvertes.
  const nextEvaluation = [...openEvaluations].sort(
    (a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf(),
  )[0];

  const firstName = mine?.teacher?.firstName ?? user?.firstName ?? '';

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton height={70} className="rounded-lg" />
        <Skeleton height={92} className="rounded-lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5">
        <h1 className="font-display text-[1.5rem] font-bold tracking-tight text-ds-text">
          Bonjour
          {firstName ? (
            <>
              , <span style={{ color: 'var(--role-accent)' }}>{firstName}</span>
            </>
          ) : null}
        </h1>
        <p className="mt-1 text-sm capitalize text-ds-text-secondary">
          {dayjs().format('dddd D MMMM YYYY')}
          {currentYear ? ` · Année ${currentYear.name}` : ''}
        </p>
      </div>

      {!schoolClass ? (
        <EmptyCard
          icon={GraduationCap}
          title="Aucune classe ne vous est attribuée"
          text="L'administration doit vous désigner titulaire d'une classe du primaire pour cette année scolaire."
        />
      ) : (
        <>
          {/* Bandeau de classe — le pendant du sélecteur d'enfant côté Famille. */}
          <Card accent hover className="mb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="ds-stat-medallion" aria-hidden>
                  <GraduationCap width={20} height={20} />
                </span>
                <span className="min-w-0">
                  <strong className="block font-display text-[1.05rem] text-ds-text">
                    Ma classe — {schoolClass.name}
                  </strong>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[.78rem] text-ds-text-tertiary">
                    {schoolClass.level && (
                      <span className="ds-badge ds-badge-role">{schoolClass.level}</span>
                    )}
                    <span>{schoolClass.studentsCount} élève(s)</span>
                    <span>· {grid?.subjects.length ?? 0} matière(s)</span>
                  </span>
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/primary/my-class')}
                className="w-full sm:w-auto"
              >
                Voir ma classe
              </Button>
            </div>
          </Card>

          <StatGrid>
            <StatTile label="Élèves" value={schoolClass.studentsCount} icon={Users} />
            <StatTile
              label="Matières notées"
              value={grid?.subjects.length ?? 0}
              icon={BookOpen}
              accent="info"
            />
            <StatTile label="Compositions" value={list.length} icon={ClipboardList} />
            <StatTile
              label="Saisies ouvertes"
              value={openEvaluations.length}
              icon={PenSquare}
              accent={openEvaluations.length > 0 ? 'success' : 'info'}
            />
          </StatGrid>

          {/* Ce qui appelle une action aujourd'hui, avant tout le reste. */}
          {nextEvaluation && (
            <Card accent="warning" className="mb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="ds-stat-medallion" aria-hidden>
                    <CalendarDays width={20} height={20} />
                  </span>
                  <span>
                    <span className="text-[.74rem] text-ds-text-tertiary">
                      Prochaine composition à saisir
                    </span>
                    <strong className="block font-display text-ds-text">
                      {nextEvaluation.name}
                    </strong>
                    <span className="text-[.78rem] text-ds-text-secondary">
                      {dayjs(nextEvaluation.date).format('dddd D MMMM YYYY')} ·{' '}
                      {nextEvaluation.gradesCount ?? 0} note(s) déjà saisie(s)
                    </span>
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate('/primary/grades')}
                  className="w-full sm:w-auto"
                >
                  Saisir les notes
                </Button>
              </div>
            </Card>
          )}

          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <ListHead
                icon={ClipboardList}
                title="Mes compositions"
                right={
                  // Le calendrier complet vit désormais dans « Ma classe » :
                  // l'écran Évaluations dédié a été retiré.
                  <Button variant="ghost" size="sm" onClick={() => navigate('/primary/my-class')}>
                    Tout voir
                  </Button>
                }
              />
              {list.length === 0 ? (
                <p className="py-6 text-center text-sm text-ds-text-tertiary">
                  Aucune composition ouverte pour cette année.
                </p>
              ) : (
                <ul className="ds-course-list">
                  {list.slice(0, 5).map((item) => (
                    <li key={item.id} className="ds-course-item">
                      <span className="ds-course-time">
                        {dayjs(item.date).format('DD/MM')}
                        <span>{dayjs(item.date).format('YYYY')}</span>
                      </span>
                      <span className="ds-course-main">
                        <strong>{item.name}</strong>
                        <span>{item.gradesCount ?? 0} note(s) saisie(s)</span>
                      </span>
                      <StatusBadge status={item.isLocked ? 'danger' : 'success'} icon={false}>
                        {item.isLocked ? 'Verrouillée' : 'Ouverte'}
                      </StatusBadge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <ListHead
                icon={BookOpen}
                title="Les matières que je note"
                right={<span className="ds-badge ds-badge-neutral">{grid?.subjects.length ?? 0}</span>}
              />
              {!grid ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} height={40} className="rounded-lg" />
                  ))}
                </div>
              ) : grid.subjects.length === 0 ? (
                <p className="py-6 text-center text-sm text-ds-text-tertiary">
                  La grille de votre classe n'est pas encore installée.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {grid.subjects.map((subject) => (
                      <span key={subject.subjectId} className="ds-seance-badge">
                        {subject.name}
                        <span className="opacity-70">/{subject.maxScore}</span>
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 border-t border-ds-border pt-3 text-[.78rem] text-ds-text-tertiary">
                    Moyenne = total des notes ÷ {grid.settings?.divisor ?? 1} → sur{' '}
                    {grid.settings?.averageScale ?? 20}. Barèmes fixés par l'administration.
                  </p>
                </>
              )}
            </Card>
          </div>

          <Card>
            <p className="mb-3 text-[.78rem] font-bold uppercase tracking-wide text-ds-text-tertiary">
              Raccourcis
            </p>
            <div className="ds-dash-actions">
              {SHORTCUTS.map((shortcut) => {
                const Icon = shortcut.icon;
                return (
                  <button
                    key={shortcut.path}
                    type="button"
                    className="ds-dash-action"
                    onClick={() => navigate(shortcut.path)}
                  >
                    <span className="ds-dash-action-ic" aria-hidden>
                      <Icon width={18} height={18} />
                    </span>
                    {shortcut.label}
                  </button>
                );
              })}
            </div>
          </Card>

          <p className="mt-4 text-center text-xs text-ds-text-tertiary">
            Données affichées pour {schoolClass.name}
            {currentYear ? ` — année ${currentYear.name}` : ''}.
          </p>
        </>
      )}
    </div>
  );
}
