import { useEffect, useState } from 'react';
import {
  BookOpen,
  ClipboardList,
  FileText,
  GraduationCap,
  PenSquare,
  Printer,
  Trophy,
  Users,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAcademicYears } from '../../lib/hooks/useAcademicYears';
import {
  fmtShort,
  openPrimaryPdf,
  useMyPrimaryClasses,
  usePrimaryClassGrid,
  usePrimaryEvaluations,
} from '../../lib/hooks/usePrimary';
import { Button, Card, Skeleton, StatusBadge, toast } from '../../components/ds';
import {
  ClassBanner,
  EmptyCard,
  ListHead,
  NoClassState,
  PrimaryPageHead,
  StatGrid,
  StatTile,
  YearFilterCard,
} from '../../components/primary/PrimaryTeacherShell';

dayjs.locale('fr');

/**
 * « Ma classe » — page d'accueil de l'enseignant du primaire.
 *
 * Elle répond à ce qu'il vient chercher : quelles matières je note, où en sont
 * mes compositions, et qui sont mes élèves. L'enseignant ne configure rien ici :
 * la grille, les barèmes et le calendrier viennent de l'administration, et sont
 * affichés en lecture pour qu'il sache sur quelle base ses moyennes tombent.
 *
 * Habillage « Encre & Craie » de l'espace Famille : les tableaux Ant Design ont
 * laissé place à des cartes et des listes, lisibles du téléphone au grand écran.
 */
export default function PrimaryMyClassPage() {
  const navigate = useNavigate();
  const { data: academicYears, currentYear } = useAcademicYears();
  const [academicYearId, setAcademicYearId] = useState<string>('');
  const [printing, setPrinting] = useState<string | null>(null);

  useEffect(() => {
    if (!academicYearId && currentYear?.id) setAcademicYearId(currentYear.id);
  }, [currentYear?.id, academicYearId]);

  const { data: mine, isLoading } = useMyPrimaryClasses(academicYearId || undefined);
  const schoolClass = mine?.classes?.[0] ?? null;

  const { data: grid } = usePrimaryClassGrid(schoolClass?.id);
  const { data: evaluations } = usePrimaryEvaluations(academicYearId || undefined, schoolClass?.id);

  const { data: students } = useQuery({
    queryKey: ['primary', 'students', schoolClass?.id],
    enabled: Boolean(schoolClass?.id),
    queryFn: async () =>
      (await api.get(`/primary/classes/${schoolClass!.id}/students`)).data.data || [],
  });

  const print = async (evaluationId: string, kind: 'ranking' | 'bulletins') => {
    setPrinting(`${evaluationId}:${kind}`);
    try {
      await openPrimaryPdf(
        kind === 'ranking'
          ? `/primary/results/${evaluationId}/ranking.pdf`
          : `/primary/results/${evaluationId}/bulletins.pdf`,
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Génération du document impossible.');
    } finally {
      setPrinting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in mx-auto max-w-5xl space-y-4">
        <Skeleton height={70} className="rounded-lg" />
        <Skeleton height={92} className="rounded-lg" />
      </div>
    );
  }

  if (!schoolClass) {
    return <NoClassState title="Ma classe" subtitle="Espace du maître de classe du primaire." />;
  }

  const list = evaluations || [];

  return (
    <div className="animate-fade-in mx-auto max-w-5xl">
      <PrimaryPageHead
        title="Ma classe"
        subtitle="Vos compositions, votre grille de matières et vos élèves."
      />

      <ClassBanner
        className={schoolClass.name}
        level={schoolClass.level}
        studentsCount={schoolClass.studentsCount}
        yearName={academicYears?.find((year: any) => year.id === academicYearId)?.name}
        right={
          <Button
            size="sm"
            icon={<PenSquare aria-hidden />}
            onClick={() => navigate('/primary/grades')}
            className="w-full sm:w-auto"
          >
            Saisir les notes
          </Button>
        }
      />

      <YearFilterCard
        years={academicYears || []}
        yearId={academicYearId}
        onYearChange={setAcademicYearId}
      />

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
          label="Niveau"
          value={schoolClass.level ?? '—'}
          icon={GraduationCap}
          accent="success"
        />
      </StatGrid>

      {/* Barèmes — la règle de calcul sur laquelle tombent toutes les moyennes. */}
      <Card className="mb-4">
        <ListHead
          icon={BookOpen}
          title="Barèmes de la classe"
          right={<span className="ds-badge ds-badge-neutral">{grid?.subjects.length ?? 0}</span>}
        />
        {!grid ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton key={index} height={40} className="rounded-lg" />
            ))}
          </div>
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

            {/* Les quatre paramètres du calcul, en grille plutôt qu'en tableau :
                sur téléphone, un `Descriptions` bordé débordait la fenêtre. */}
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ds-border pt-4 lg:grid-cols-4">
              {[
                { label: 'Total des barèmes', value: grid.totalMaxScore },
                {
                  label: 'Calcul de la moyenne',
                  value: `÷ ${fmtShort(grid.settings?.divisor ?? 1)} → /${grid.settings?.averageScale ?? 20}`,
                },
                {
                  label: "Moyenne d'admission",
                  value: fmtShort(grid.settings?.moyenneAdmission ?? null),
                },
                {
                  label: 'Seuil de redoublement',
                  value: fmtShort(grid.settings?.moyenneRedoublement ?? null),
                },
              ].map((item) => (
                <div key={item.label} className="rounded-md bg-ds-subtle px-3 py-2">
                  <span className="block text-[.7rem] text-ds-text-tertiary">{item.label}</span>
                  <strong className="mt-0.5 block font-mono text-[.9rem] text-ds-text">
                    {item.value}
                  </strong>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Compositions de l'année */}
        <Card padded={false}>
          <div className="px-4 pt-4">
            {/* Cette carte porte le calendrier complet : c'est ici que le
                titulaire consulte ses compositions, il n'y a pas d'écran dédié. */}
            <ListHead
              icon={ClipboardList}
              title="Compositions de l'année"
              right={<span className="ds-badge ds-badge-neutral">{list.length}</span>}
            />
          </div>
          {list.length === 0 ? (
            <p className="px-4 pb-6 text-center text-sm text-ds-text-tertiary">
              L'administration n'a pas encore ouvert de composition pour cette année.
            </p>
          ) : (
            <ul className="ds-course-list px-4 pb-2">
              {list.map((item) => (
                <li key={item.id} className="ds-course-item flex-wrap">
                  <span className="ds-course-time">
                    {dayjs(item.date).format('DD/MM')}
                    <span>{dayjs(item.date).format('YYYY')}</span>
                  </span>
                  <span className="ds-course-main">
                    <strong>{item.name}</strong>
                    <span>
                      {item.gradesCount ?? 0} note(s)
                      {item.publishedAt ? ' · publiée' : ''}
                    </span>
                  </span>
                  <StatusBadge status={item.isLocked ? 'danger' : 'success'} icon={false}>
                    {item.isLocked ? 'Verrouillée' : 'Ouverte'}
                  </StatusBadge>
                  <span className="ds-course-actions">
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      icon={<PenSquare aria-hidden />}
                      aria-label={`Saisir les notes de ${item.name}`}
                      title="Saisir les notes"
                      disabled={item.isLocked}
                      onClick={() => navigate('/primary/grades')}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      icon={<Printer aria-hidden />}
                      aria-label={`Fiche de classement de ${item.name}`}
                      title="Fiche de classement"
                      loading={printing === `${item.id}:ranking`}
                      onClick={() => print(item.id, 'ranking')}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      icon={<FileText aria-hidden />}
                      aria-label={`Bulletins de ${item.name}`}
                      title="Bulletins de la classe"
                      loading={printing === `${item.id}:bulletins`}
                      onClick={() => print(item.id, 'bulletins')}
                    />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Mes élèves — aperçu, la liste complète est sur sa propre page. */}
        <Card padded={false}>
          <div className="px-4 pt-4">
            <ListHead
              icon={Users}
              title="Mes élèves"
              right={
                <Button variant="ghost" size="sm" onClick={() => navigate('/primary/my-students')}>
                  Tout voir
                </Button>
              }
            />
          </div>
          {!students ? (
            <div className="space-y-2 px-4 pb-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} height={52} className="rounded-lg" />
              ))}
            </div>
          ) : students.length === 0 ? (
            <p className="px-4 pb-6 text-center text-sm text-ds-text-tertiary">
              Aucun élève n'est encore inscrit dans cette classe.
            </p>
          ) : (
            <ul className="ds-course-list px-4 pb-2">
              {students.slice(0, 6).map((student: any) => (
                <li key={student.id} className="ds-course-item">
                  <span
                    className="ds-stat-medallion"
                    aria-hidden
                    style={{ width: 34, height: 34, fontSize: '.72rem', fontWeight: 700 }}
                  >
                    {`${student.lastName?.[0] ?? ''}${student.firstName?.[0] ?? ''}`.toUpperCase()}
                  </span>
                  <span className="ds-course-main">
                    <strong>
                      {student.lastName} {student.firstName}
                    </strong>
                    <span className="font-mono">{student.studentNumber || '—'}</span>
                  </span>
                  <StatusBadge status={student.gender === 'F' ? 'role' : 'info'} icon={false}>
                    {student.gender === 'F' ? 'F' : 'M'}
                  </StatusBadge>
                </li>
              ))}
              {students.length > 6 && (
                <li className="pt-2 text-center text-[.78rem] text-ds-text-tertiary">
                  et {students.length - 6} autre(s) élève(s)…
                </li>
              )}
            </ul>
          )}
        </Card>
      </div>

      {list.length === 0 && (
        <div className="mt-4">
          <EmptyCard
            icon={Trophy}
            title="Rien à saisir pour l'instant"
            text="Dès que l'administration ouvrira une composition, elle apparaîtra ici et vous pourrez saisir vos notes."
          />
        </div>
      )}
    </div>
  );
}
