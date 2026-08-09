import { useEffect, useMemo, useState } from 'react';
import { Select } from 'antd';
import { User, Users, UserRound } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAcademicYears } from '../../lib/hooks/useAcademicYears';
import { useMyPrimaryClasses } from '../../lib/hooks/usePrimary';
import { Card, SearchInput, Skeleton, StatusBadge } from '../../components/ds';
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
 * « Mes élèves » — la classe du titulaire, telle que l'inscription l'a remplie.
 *
 * L'enseignant du primaire n'inscrit pas : les élèves lui arrivent de
 * l'administration (Années scolaires → Inscriptions). L'écran est donc en
 * lecture — il répond à « qui ai-je cette année ? », pas à « qui ajouter ? ».
 *
 * Habillage « Encre & Craie » de l'espace Famille : compteurs à médaillon, puis
 * une liste en cartes (pastille d'initiales, nom, matricule, badge de sexe) qui
 * se lit aussi bien sur téléphone que sur grand écran — donc pas de tableau.
 */
export default function PrimaryMyStudentsPage() {
  const navigate = useNavigate();
  const { data: academicYears, currentYear } = useAcademicYears();
  const [academicYearId, setAcademicYearId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState<string | undefined>();

  useEffect(() => {
    if (!academicYearId && currentYear?.id) setAcademicYearId(currentYear.id);
  }, [currentYear?.id, academicYearId]);

  const { data: mine, isLoading: loadingClass } = useMyPrimaryClasses(academicYearId || undefined);
  const schoolClass = mine?.classes?.[0] ?? null;

  const { data: students, isLoading } = useQuery({
    queryKey: ['primary', 'students', schoolClass?.id],
    enabled: Boolean(schoolClass?.id),
    queryFn: async () =>
      (await api.get(`/primary/classes/${schoolClass!.id}/students`)).data.data || [],
  });

  const items = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (students || []).filter((student: any) => {
      if (gender && student.gender !== gender) return false;
      if (!query) return true;
      return (
        `${student.lastName ?? ''} ${student.firstName ?? ''}`.toLowerCase().includes(query) ||
        String(student.studentNumber ?? '').toLowerCase().includes(query)
      );
    });
  }, [students, search, gender]);

  const counts = useMemo(() => {
    const list = students || [];
    return {
      total: list.length,
      boys: list.filter((student: any) => student.gender === 'M').length,
      girls: list.filter((student: any) => student.gender === 'F').length,
    };
  }, [students]);

  if (loadingClass) {
    return (
      <div className="animate-fade-in mx-auto max-w-5xl space-y-4">
        <Skeleton height={70} className="rounded-lg" />
        <Skeleton height={92} className="rounded-lg" />
      </div>
    );
  }

  if (!schoolClass) {
    return <NoClassState title="Mes élèves" subtitle="Les élèves de votre classe." />;
  }

  const filtered = Boolean(search.trim() || gender);

  return (
    <div className="animate-fade-in mx-auto max-w-5xl">
      <PrimaryPageHead
        title="Mes élèves"
        subtitle="Les élèves inscrits dans votre classe, tels que l'administration les a enregistrés."
      />

      <ClassBanner
        className={schoolClass.name}
        level={schoolClass.level}
        studentsCount={schoolClass.studentsCount}
        yearName={academicYears?.find((year: any) => year.id === academicYearId)?.name}
      />

      <YearFilterCard
        years={academicYears || []}
        yearId={academicYearId}
        onYearChange={setAcademicYearId}
      >
        <label className="ds-field">
          <span>Sexe</span>
          <Select
            allowClear
            placeholder="Tous les élèves"
            value={gender}
            onChange={(value) => setGender(value)}
            options={[
              { value: 'M', label: 'Garçons' },
              { value: 'F', label: 'Filles' },
            ]}
            style={{ width: '100%' }}
          />
        </label>
        <label className="ds-field">
          <span>Rechercher</span>
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nom ou matricule…"
          />
        </label>
      </YearFilterCard>

      <StatGrid loading={isLoading} count={3}>
        <StatTile label="Effectif de la classe" value={counts.total} icon={Users} />
        <StatTile label="Garçons" value={counts.boys} icon={User} accent="info" />
        <StatTile label="Filles" value={counts.girls} icon={UserRound} accent="success" />
      </StatGrid>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} height={64} className="rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyCard
          icon={Users}
          title={filtered ? 'Aucun élève ne correspond' : 'Aucun élève inscrit'}
          text={
            filtered
              ? 'Aucun élève ne correspond à ces filtres.'
              : "L'administration n'a pas encore inscrit d'élève dans cette classe pour cette année."
          }
        />
      ) : (
        <Card padded={false}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ds-border px-4 py-3">
            <strong className="font-display text-ds-text">Liste de la classe</strong>
            <span className="ds-badge ds-badge-neutral">{items.length}</span>
          </div>
          <ul className="ds-course-list p-2">
            {items.map((student: any) => (
              <li key={student.id} className="ds-course-item">
                <span
                  className="ds-stat-medallion"
                  aria-hidden
                  style={{ width: 38, height: 38, fontSize: '.8rem', fontWeight: 700 }}
                >
                  {`${student.lastName?.[0] ?? ''}${student.firstName?.[0] ?? ''}`.toUpperCase()}
                </span>
                <span className="ds-course-main">
                  <strong>
                    {student.lastName} {student.firstName}
                  </strong>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-mono">{student.studentNumber || '—'}</span>
                    {student.dateOfBirth && (
                      <span>· né(e) le {dayjs(student.dateOfBirth).format('DD/MM/YYYY')}</span>
                    )}
                  </span>
                </span>
                <StatusBadge status={student.gender === 'F' ? 'role' : 'info'} icon={false}>
                  {student.gender === 'F' ? 'Fille' : 'Garçon'}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="mt-4 text-center text-xs text-ds-text-tertiary">
        Les inscriptions sont gérées par l'administration. Pour ajouter ou retirer un élève,
        adressez-vous au secrétariat.
      </p>
    </div>
  );
}
