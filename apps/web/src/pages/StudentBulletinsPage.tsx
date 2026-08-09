import { useEffect, useState } from 'react';
import { Select } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { BulletinsBoard } from '../components/school/BulletinsBoard';
import { PrimaryReportBoard } from '../components/school/PrimaryReportBoard';
import { useAcademicYears } from '../lib/hooks/useAcademicYears';
import { useStudentMe } from '../lib/hooks/useStudentSpace';

/**
 * Mes bulletins (§9.5).
 *
 * Comme dans l'espace Parent, le cycle de ma classe décide de la lecture : un
 * bulletin par trimestre au secondaire, une carte par composition au primaire.
 */
export default function StudentBulletinsPage() {
  const { data: me } = useStudentMe();
  const { data: years, currentYear } = useAcademicYears();
  const [yearId, setYearId] = useState('');
  useEffect(() => {
    if (currentYear && !yearId) setYearId(currentYear.id);
  }, [currentYear, yearId]);

  const isPrimary = (me as any)?.class?.cycle === 'PRIMAIRE';

  const { data, isLoading } = useQuery({
    queryKey: ['student-bulletins', yearId],
    queryFn: async () => (await api.get(`/student/bulletins?academicYearId=${yearId}`)).data.data,
    enabled: !!yearId && !isPrimary,
  });

  const { data: primary, isLoading: primaryLoading } = useQuery({
    queryKey: ['student-primary', yearId],
    queryFn: async () => (await api.get(`/student/primary?academicYearId=${yearId}`)).data.data,
    enabled: !!yearId && isPrimary,
  });

  const className = data?.class?.name ?? me?.class?.name;

  return (
    <div className="animate-fade-in mx-auto max-w-5xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[1.5rem] font-bold tracking-tight text-ds-text">
            Mes bulletins
          </h1>
          <p className="mt-1 text-sm text-ds-text-secondary">
            Mes résultats, {isPrimary ? 'composition par composition' : 'trimestre par trimestre'}
            {className ? ` — classe de ${className}` : ''}.
          </p>
        </div>
        <label className="ds-field w-48">
          <span>Année scolaire</span>
          <Select
            placeholder="Sélectionner…"
            value={yearId || undefined}
            onChange={setYearId}
            options={(years || []).map((y: any) => ({
              value: y.id,
              label: `${y.name}${y.isCurrent ? ' (En cours)' : ''}`,
            }))}
            style={{ width: '100%' }}
          />
        </label>
      </div>

      {isPrimary ? (
        <PrimaryReportBoard
          reports={primary?.evaluations || []}
          yearAverage={primary?.yearAverage ?? null}
          loading={primaryLoading}
        />
      ) : (
        <BulletinsBoard bulletins={data?.bulletins || []} loading={isLoading} />
      )}
    </div>
  );
}
