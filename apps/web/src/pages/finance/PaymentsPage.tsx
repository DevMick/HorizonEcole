import { useState, useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { Select } from 'antd';
import { Banknote, Users } from 'lucide-react';
import { academicYearsApi, inscriptionsApi, studentPaymentsApi, api } from '../../lib/api';
import { Card } from '../../components/ds';
import { StudentPaymentModal } from '../../components/finance/StudentPaymentModal';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' CFA';

const STATUS_CONFIG = {
  paid:    { label: 'À jour',       cls: 'ds-badge-success' },
  partial: { label: 'Partiel',      cls: 'ds-badge-warning' },
  overdue: { label: 'En retard',    cls: 'ds-badge-danger'  },
  pending: { label: 'En attente',   cls: 'ds-badge-neutral' },
  none:    { label: 'Sans plan',    cls: 'ds-badge-neutral' },
} as const;

function getStatus(s: any): keyof typeof STATUS_CONFIG {
  if (!s) return 'none';
  const { totalExpected, totalPaid, totalRemaining } = s.summary;
  if (totalExpected === 0) return 'none';
  if (totalPaid >= totalExpected) return 'paid';

  // Check if any installment is overdue
  const now = new Date();
  const hasOverdue = (s.expectedPayments ?? []).some((ep: any) => {
    if (ep.status === 'PAID') return false;
    if (!ep.dueDate) return false;
    return new Date(ep.dueDate) < now && ep.remaining > 0;
  });
  if (hasOverdue) return 'overdue';
  if (totalPaid > 0) return 'partial';
  return 'pending';
}

// ─── Student Card ─────────────────────────────────────────────────────────────

function StudentCard({
  inscription,
  status,
  loading,
  onManage,
}: {
  inscription: any;
  status: any;
  loading: boolean;
  onManage: () => void;
}) {
  const student = inscription.student;
  const name = `${student.firstName} ${student.lastName}`;
  const initials = `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase();
  const statusKey = getStatus(status);
  const cfg = STATUS_CONFIG[statusKey];
  const completionPct = status ? Math.round(status.summary.completionRate) : 0;

  const COLORS = ['#34478F', '#217A54', '#CC8722', '#B92C3C', '#2C689F', '#4A5FA8'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const avatarColor = COLORS[h % COLORS.length];

  return (
    <Card className="flex flex-col gap-3 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-none"
          style={{ backgroundColor: avatarColor }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ds-text truncate">{name}</p>
          {student.studentNumber && (
            <p className="text-xs text-ds-text-tertiary">{student.studentNumber}</p>
          )}
        </div>
        <span className={`ds-badge ${cfg.cls} flex-none`}>{cfg.label}</span>
      </div>

      {/* Progress */}
      {loading ? (
        <div className="h-3 bg-[var(--ds-border)] rounded-full animate-pulse" />
      ) : status ? (
        <>
          <div className="w-full bg-[var(--ds-border)] rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                statusKey === 'paid' ? 'bg-[var(--ds-success)]'
                : statusKey === 'overdue' ? 'bg-[var(--ds-danger)]'
                : statusKey === 'partial' ? 'bg-[var(--ds-warning)]'
                : 'bg-[var(--ds-border)]'
              }`}
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-ds-text-secondary">
            <span>{fmt(status.summary.totalPaid)} payé</span>
            <span>{completionPct}%</span>
          </div>
        </>
      ) : (
        <p className="text-xs text-ds-text-tertiary">Aucun plan de paiement.</p>
      )}

      {/* Action */}
      <button
        onClick={onManage}
        className="w-full text-center text-sm font-medium py-1.5 rounded-lg border border-[var(--ds-border)] text-[var(--ds-primary)] hover:bg-[var(--ds-surface-hover)] transition-colors"
      >
        Gérer
      </button>
    </Card>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [modalStudent, setModalStudent] = useState<{
    studentId: string; studentName: string; studentNumber?: string; className?: string;
  } | null>(null);

  // Academic years
  const { data: years = [] } = useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => {
      const res = await academicYearsApi.getAll();
      const list: any[] = res.data.data || res.data || [];
      return list;
    },
    select: (data: any[]) => {
      // Pre-select current year
      if (!selectedYearId) {
        const current = data.find((y: any) => y.isCurrent);
        if (current) setTimeout(() => setSelectedYearId(current.id), 0);
      }
      return data;
    },
  });

  // Classes
  const { data: classes = [] } = useQuery({
    queryKey: ['school-classes-payments'],
    queryFn: async () => {
      const res = await api.get('/school-classes', { params: { limit: 200 } });
      return res.data.data || res.data || [];
    },
  });

  // Inscriptions for selected year+class
  const { data: inscriptions = [], isLoading: loadingInscriptions } = useQuery({
    queryKey: ['inscriptions', selectedYearId, selectedClassId],
    queryFn: async () => {
      if (!selectedYearId || !selectedClassId) return [];
      const res = await inscriptionsApi.getAll({
        academicYearId: selectedYearId,
        classId: selectedClassId,
      });
      return res.data.data || [];
    },
    enabled: !!(selectedYearId && selectedClassId),
  });

  // Parallel payment status for each student
  const statusQueries = useQueries({
    queries: (inscriptions as any[]).map((insc: any) => ({
      queryKey: ['payment-status', insc.studentId, selectedYearId],
      queryFn: async () => {
        try {
          const res = await studentPaymentsApi.getStatus(insc.studentId, selectedYearId!);
          return res.data.data;
        } catch {
          return null;
        }
      },
      enabled: !!(selectedYearId && selectedClassId),
    })),
  });

  const yearOptions = useMemo(() =>
    (years as any[]).map((y: any) => ({
      value: y.id,
      label: y.name || `${y.startYear}–${y.endYear}`,
    })), [years]);

  const CLASS_ORDER = ['CP1','CP2','CE1','CE2','CM1','CM2'];
  const classOptions = useMemo(() =>
    [...(classes as any[])]
      .sort((a, b) => {
        const ai = CLASS_ORDER.indexOf(a.level || a.name);
        const bi = CLASS_ORDER.indexOf(b.level || b.name);
        if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      })
      .map((c: any) => ({ value: c.id, label: c.name })),
  [classes]);

  const selectedClass = (classes as any[]).find((c: any) => c.id === selectedClassId);

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      {/* ── En-tête ── */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[1.5rem] font-bold tracking-tight text-ds-text">
            Paiements
          </h1>
          <p className="mt-1 text-sm text-ds-text-secondary">
            Suivez et enregistrez les paiements des élèves par classe et année scolaire.
          </p>
        </div>
      </div>

      {/* ── Filtres ── */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <label className="ds-field flex-1 min-w-[200px]">
            <span>Année scolaire</span>
            <Select
              style={{ width: '100%' }}
              placeholder="Sélectionner une année…"
              options={yearOptions}
              value={selectedYearId ?? undefined}
              onChange={(v) => {
                setSelectedYearId(v);
                setSelectedClassId(null);
              }}
            />
          </label>
          <label className="ds-field flex-1 min-w-[200px]">
            <span>Classe</span>
            <Select
              style={{ width: '100%' }}
              placeholder="Sélectionner une classe…"
              options={classOptions}
              value={selectedClassId ?? undefined}
              onChange={(v) => setSelectedClassId(v)}
              disabled={!selectedYearId}
              allowClear
              onClear={() => setSelectedClassId(null)}
            />
          </label>
        </div>
      </Card>

      {/* ── Contenu ── */}
      {!selectedClassId ? (
        <Card className="text-center py-12" accent="info">
          <Users className="mx-auto mb-3 text-ds-text-tertiary" size={40} />
          <p className="font-display font-bold text-ds-text">Sélectionnez une classe</p>
          <p className="mt-1 text-sm text-ds-text-secondary">
            Choisissez une année scolaire et une classe pour voir la liste des élèves.
          </p>
        </Card>
      ) : loadingInscriptions ? (
        <div
          className="ds-entity-grid"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))' }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-[var(--ds-surface-hover)] animate-pulse" />
          ))}
        </div>
      ) : (inscriptions as any[]).length === 0 ? (
        <Card className="text-center py-12" accent="info">
          <Banknote className="mx-auto mb-3 text-ds-text-tertiary" size={40} />
          <p className="font-display font-bold text-ds-text">Aucun élève inscrit</p>
          <p className="mt-1 text-sm text-ds-text-secondary">
            Aucune inscription trouvée pour cette classe et cette année scolaire.
          </p>
        </Card>
      ) : (
        <>
          <p className="text-sm text-ds-text-secondary mb-3">
            <strong className="text-ds-text">{(inscriptions as any[]).length}</strong> élève{(inscriptions as any[]).length > 1 ? 's' : ''} —{' '}
            {selectedClass?.name}
          </p>
          <div
            className="ds-entity-grid"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))' }}
          >
            {(inscriptions as any[]).map((insc: any, idx: number) => {
              const sq = statusQueries[idx];
              return (
                <StudentCard
                  key={insc.id}
                  inscription={insc}
                  status={sq?.data ?? null}
                  loading={sq?.isLoading ?? false}
                  onManage={() =>
                    setModalStudent({
                      studentId: insc.studentId,
                      studentName: `${insc.student.firstName} ${insc.student.lastName}`,
                      studentNumber: insc.student.studentNumber,
                      className: insc.class?.name,
                    })
                  }
                />
              );
            })}
          </div>
        </>
      )}

      {/* ── Modal paiement ── */}
      {modalStudent && selectedYearId && (
        <StudentPaymentModal
          studentId={modalStudent.studentId}
          academicYearId={selectedYearId}
          studentName={modalStudent.studentName}
          studentNumber={modalStudent.studentNumber}
          className={modalStudent.className}
          onClose={() => setModalStudent(null)}
        />
      )}
    </div>
  );
}
