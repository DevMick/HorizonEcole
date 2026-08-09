import { useEffect, useState } from 'react';
import { Select } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ChildSwitcher } from '../components/parent/ChildSwitcher';
import { BulletinsBoard } from '../components/school/BulletinsBoard';
import { PrimaryReportBoard } from '../components/school/PrimaryReportBoard';
import { useAcademicYears, useActiveChild, fullName } from '../lib/hooks/useParentSpace';

/**
 * Bulletins & résultats de l'enfant (§9.5).
 *
 * Le cycle de la classe décide de ce qui s'affiche : au secondaire un bulletin
 * par trimestre, au primaire une carte par composition — la moyenne n'y est pas
 * une pondération par coefficients mais une somme divisée, et le rang fait
 * partie du résultat. Les deux lectures ne se ressemblent donc pas assez pour
 * partager un même tableau.
 */
export default function ParentBulletinsPage() {
  const { children, child, childId, setChildId } = useActiveChild();
  const { data: years, currentYear } = useAcademicYears();
  const [yearId, setYearId] = useState('');
  useEffect(() => {
    if (currentYear && !yearId) setYearId(currentYear.id);
  }, [currentYear, yearId]);

  const isPrimary = child?.class?.cycle === 'PRIMAIRE';

  const { data, isLoading } = useQuery({
    queryKey: ['parent-bulletins', childId, yearId],
    queryFn: async () =>
      (await api.get(`/parent/children/${childId}/bulletins?academicYearId=${yearId}`)).data.data,
    enabled: !!childId && !!yearId && !isPrimary,
  });

  const { data: primary, isLoading: primaryLoading } = useQuery({
    queryKey: ['parent-primary', childId, yearId],
    queryFn: async () =>
      (await api.get(`/parent/children/${childId}/primary?academicYearId=${yearId}`)).data.data,
    enabled: !!childId && !!yearId && isPrimary,
  });

  return (
    <div className="animate-fade-in mx-auto max-w-5xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[1.5rem] font-bold tracking-tight text-ds-text">
            Bulletins &amp; résultats
          </h1>
          <p className="mt-1 text-sm text-ds-text-secondary">
            Les résultats de {child ? fullName(child) : 'votre enfant'},{' '}
            {isPrimary ? 'composition par composition' : 'trimestre par trimestre'}
            {child?.class?.name ? ` — classe de ${child.class.name}` : ''}.
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

      <ChildSwitcher items={children} value={childId} onChange={setChildId} />

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
