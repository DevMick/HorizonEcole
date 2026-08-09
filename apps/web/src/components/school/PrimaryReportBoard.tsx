import { useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { ChevronDown, Trophy } from 'lucide-react';
import { Card, Skeleton, StatusBadge } from '../ds';
import { cn } from '../../lib/utils';

dayjs.locale('fr');

/**
 * Résultats du primaire, partagés par les espaces Parent et Élève.
 *
 * Au primaire il n'y a pas d'un côté des notes courantes et de l'autre un
 * bulletin trimestriel : chaque **composition** produit d'un coup les notes, la
 * moyenne, le rang et la décision. Une carte par composition suffit donc à
 * couvrir ce que le secondaire répartit sur deux écrans.
 *
 * Comme dans le secondaire, rien n'apparaît tant que l'administration n'a pas
 * publié la composition : la saisie des notes par le maître ne rend rien
 * visible aux familles.
 */

export interface PrimaryReportSubject {
  subjectId: string;
  name: string;
  code: string;
  maxScore: number;
  sortOrder: number;
}

export interface PrimaryReport {
  evaluation: {
    id: string;
    name: string;
    date: string;
    isExam: boolean;
    divisor: number;
    averageScale: number;
    publishedAt: string | null;
  };
  subjects: PrimaryReportSubject[];
  thresholds: { admission: number; redoublement: number };
  classAverage: number | null;
  composed: number;
  result: {
    notes: Record<string, number | null>;
    total: number;
    average: number | null;
    rank: number | null;
    isExAequo: boolean;
    mention: string | null;
    status: 'ADMIS' | 'EXAMEN' | 'REDOUBLE' | 'NON_CLASSE';
    isAbsent: boolean;
  };
}

const STATUS: Record<
  PrimaryReport['result']['status'],
  { label: string; kind: 'success' | 'warning' | 'danger' | 'info' }
> = {
  ADMIS: { label: 'Admis(e)', kind: 'success' },
  EXAMEN: { label: 'À examiner', kind: 'warning' },
  REDOUBLE: { label: 'Redouble', kind: 'danger' },
  NON_CLASSE: { label: 'Non classé(e)', kind: 'info' },
};

const fmt = (value: number | null | undefined) =>
  value === null || value === undefined ? '—' : Number(value).toFixed(2).replace('.', ',');

const rankLabel = (rank: number | null, isExAequo: boolean) =>
  rank === null ? '—' : `${rank}${rank === 1 ? 'er' : 'e'}${isExAequo ? ' ex æquo' : ''}`;

function ReportCard({ report }: { report: PrimaryReport }) {
  const [open, setOpen] = useState(false);
  const { evaluation, subjects, result, classAverage, composed } = report;
  const status = STATUS[result.status];
  const totalMaxScore = subjects.reduce((sum, subject) => sum + subject.maxScore, 0);

  return (
    <Card accent={result.status === 'ADMIS' ? 'role' : 'warning'} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <strong className="block font-display text-[1.05rem] text-ds-text">
            {evaluation.name}
          </strong>
          <span className="mt-0.5 block text-[.8rem] text-ds-text-tertiary">
            Composition du {dayjs(evaluation.date).format('D MMMM YYYY')}
          </span>
          {evaluation.publishedAt && (
            <span className="mt-0.5 block text-[.8rem] text-ds-text-tertiary">
              Résultats publiés le {dayjs(evaluation.publishedAt).format('D MMMM YYYY')}
            </span>
          )}
        </div>
        <StatusBadge status={status.kind}>{status.label}</StatusBadge>
      </div>

      {result.isAbsent ? (
        <p className="text-sm text-ds-text-secondary">
          Absent(e) à cette composition : aucune moyenne ni rang ne sont attribués.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4 rounded-[var(--radius-md)] bg-ds-subtle px-4 py-3">
            <div className="flex flex-col">
              <span className="text-[.72rem] font-bold uppercase tracking-wide text-ds-text-tertiary">
                Moyenne
              </span>
              <span
                className="font-mono text-[1.7rem] font-semibold leading-none"
                style={{ color: 'var(--role-accent)' }}
              >
                {fmt(result.average)}
                <span className="ml-1 text-[.85rem] text-ds-text-tertiary">
                  /{evaluation.averageScale}
                </span>
              </span>
            </div>
            {result.mention && <StatusBadge status={status.kind}>{result.mention}</StatusBadge>}
            <span className="ml-auto text-right text-[.8rem] text-ds-text-tertiary">
              <span className="font-mono">{rankLabel(result.rank, result.isExAequo)}</span> sur{' '}
              <span className="font-mono">{composed}</span>
              <br />
              Moyenne de la classe : <span className="font-mono">{fmt(classAverage)}</span>
            </span>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              className="flex min-h-[36px] items-center gap-1.5 text-[.82rem] font-bold text-ds-text-secondary hover:text-ds-text"
            >
              <ChevronDown
                width={15}
                height={15}
                aria-hidden
                className={cn('transition-transform duration-[var(--dur-fast)]', open && 'rotate-180')}
              />
              {open ? 'Masquer' : 'Voir'} le détail par matière
            </button>

            {open && (
              <ul className="mt-2 flex flex-col divide-y divide-ds-border rounded-[var(--radius-md)] border border-ds-border">
                {subjects.map((subject) => {
                  const note = result.notes[subject.subjectId];
                  // Le barème varie d'une matière à l'autre : la réussite se
                  // juge sur la moitié du barème, pas sur un 10 absolu.
                  const passed = note !== null && note !== undefined && note >= subject.maxScore / 2;

                  return (
                    <li key={subject.subjectId} className="flex items-center gap-3 px-3 py-2">
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-[.86rem] font-semibold text-ds-text">
                          {subject.name}
                        </strong>
                        <span className="text-[.75rem] text-ds-text-tertiary">
                          Barème : sur <span className="font-mono">{subject.maxScore}</span>
                        </span>
                      </span>
                      <span className={cn('ds-grade-avg', passed ? 'ds-avg-pass' : 'ds-avg-fail')}>
                        {note === null || note === undefined ? '—' : fmt(note)}
                      </span>
                    </li>
                  );
                })}
                <li className="flex items-center gap-3 bg-ds-subtle px-3 py-2">
                  <span className="min-w-0 flex-1">
                    <strong className="block text-[.86rem] font-semibold text-ds-text">Total</strong>
                    <span className="text-[.75rem] text-ds-text-tertiary">
                      sur <span className="font-mono">{totalMaxScore}</span>, divisé par{' '}
                      <span className="font-mono">
                        {String(evaluation.divisor).replace('.', ',')}
                      </span>
                    </span>
                  </span>
                  <span className="ds-grade-avg">{fmt(result.total)}</span>
                </li>
              </ul>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

export interface PrimaryReportBoardProps {
  reports: PrimaryReport[];
  yearAverage?: number | null;
  loading?: boolean;
}

export function PrimaryReportBoard({ reports, yearAverage, loading }: PrimaryReportBoardProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} height={220} className="rounded-lg" />
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <Card className="text-center" accent="info">
        <Trophy className="mx-auto mb-2 text-ds-text-tertiary" aria-hidden />
        <p className="font-display font-bold text-ds-text">Aucun résultat publié</p>
        <p className="mt-1 text-sm text-ds-text-secondary">
          Les résultats des compositions apparaîtront ici dès que l'école les aura publiés.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {yearAverage !== null && yearAverage !== undefined && (
        <Card accent="role" className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[.72rem] font-bold uppercase tracking-wide text-ds-text-tertiary">
              Moyenne annuelle
            </span>
            <span
              className="font-mono text-[1.7rem] font-semibold leading-none"
              style={{ color: 'var(--role-accent)' }}
            >
              {fmt(yearAverage)}
              <span className="ml-1 text-[.85rem] text-ds-text-tertiary">
                /{reports[0]?.evaluation.averageScale ?? 20}
              </span>
            </span>
          </div>
          <span className="ml-auto text-[.8rem] text-ds-text-tertiary">
            Moyenne des <span className="font-mono">{reports.length}</span> composition
            {reports.length > 1 ? 's' : ''} publiée{reports.length > 1 ? 's' : ''}
          </span>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => (
          <ReportCard key={report.evaluation.id} report={report} />
        ))}
      </div>
    </div>
  );
}
