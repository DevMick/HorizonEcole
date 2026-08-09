import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, InputNumber, Select, DatePicker, Input } from 'antd';
import dayjs from 'dayjs';
import { FileText, CreditCard, History, ChevronDown, ChevronUp } from 'lucide-react';
import { studentPaymentsApi, receiptPdfBlob } from '../../lib/api';
import { Button, Modal, toast } from '../ds';

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentMethod = 'CASH' | 'CHEQUE' | 'VIREMENT' | 'MOBILE_MONEY' | 'CARTE';

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Espèces',
  CHEQUE: 'Chèque',
  VIREMENT: 'Virement bancaire',
  MOBILE_MONEY: 'Mobile Money',
  CARTE: 'Carte bancaire',
};

const STATUS_CONFIG = {
  PAID:    { label: 'Payé',       cls: 'ds-badge-success' },
  PARTIAL: { label: 'Partiel',    cls: 'ds-badge-warning' },
  PENDING: { label: 'En attente', cls: 'ds-badge-neutral' },
  OVERDUE: { label: 'En retard',  cls: 'ds-badge-danger'  },
} as const;

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' CFA';
const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('fr-FR'); } catch { return d; }
};

// ─── Sous-composant : formulaire de paiement ─────────────────────────────────

function PaymentForm({
  installmentId, studentId, academicYearId, remaining, onSuccess, onCancel,
}: {
  installmentId: string; studentId: string; academicYearId: string;
  remaining: number; onSuccess: () => void; onCancel: () => void;
}) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: any) =>
      studentPaymentsApi.create({
        studentId,
        academicYearId,
        customPaymentPlanInstallmentId: installmentId,
        amount: values.amount,
        paymentDate: (values.paymentDate as dayjs.Dayjs).format('YYYY-MM-DD'),
        paymentMethod: values.paymentMethod,
        reference: values.reference || undefined,
        notes: values.notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Paiement enregistré');
      queryClient.invalidateQueries({ queryKey: ['payment-status', studentId, academicYearId] });
      queryClient.invalidateQueries({ queryKey: ['payment-history', studentId, academicYearId] });
      onSuccess();
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Erreur lors du paiement'),
  });

  return (
    <div className="mt-3 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-hover)] p-4">
      <p className="text-sm font-semibold text-ds-text mb-3">Enregistrer un paiement</p>
      <Form form={form} layout="vertical" size="small"
        initialValues={{ paymentDate: dayjs(), paymentMethod: 'CASH', amount: remaining }}>
        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="amount" label="Montant (CFA)"
            rules={[{ required: true, message: 'Montant requis' }]} style={{ margin: 0 }}>
            <InputNumber style={{ width: '100%' }} min={1} max={remaining}
              formatter={v => v ? String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''}
              parser={v => v ? parseFloat(v.replace(/\s/g, '')) : ('' as any)} />
          </Form.Item>
          <Form.Item name="paymentMethod" label="Mode de paiement"
            rules={[{ required: true }]} style={{ margin: 0 }}>
            <Select options={Object.entries(METHOD_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
          </Form.Item>
          <Form.Item name="paymentDate" label="Date du paiement"
            rules={[{ required: true, message: 'Date requise' }]} style={{ margin: 0 }}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="reference" label="Référence (optionnel)" style={{ margin: 0 }}>
            <Input placeholder="N° chèque, reçu…" />
          </Form.Item>
        </div>
        <Form.Item name="notes" label="Notes (optionnel)" style={{ margin: '8px 0 0' }}>
          <Input.TextArea rows={2} placeholder="Observations…" />
        </Form.Item>
        <div className="flex justify-end gap-2 mt-3">
          <Button variant="secondary" size="sm" onClick={onCancel}>Annuler</Button>
          <Button size="sm" loading={mutation.isPending}
            onClick={() => form.validateFields().then(v => mutation.mutate(v))}>
            Confirmer
          </Button>
        </div>
      </Form>
    </div>
  );
}

// ─── Sous-composant : ligne de versement ─────────────────────────────────────

function InstallmentRow({
  ep, idx, studentId, academicYearId,
}: {
  ep: any; idx: number; studentId: string; academicYearId: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const cfg = STATUS_CONFIG[ep.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PENDING;

  return (
    <div className="border-t border-[var(--ds-border)] py-3 first:border-t-0">
      <div className="flex items-start gap-3">
        <span className="w-6 h-6 rounded-full bg-[var(--ds-surface-hover)] flex items-center justify-center text-xs font-bold text-ds-text-secondary flex-none">
          {idx + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-ds-text">{ep.notes || ep.label}</p>
              <p className="text-xs text-ds-text-tertiary">
                Dû le {fmtDate(ep.dueDate)} — {fmt(ep.expectedAmount)}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-none">
              <span className={`ds-badge ${cfg.cls}`}>{cfg.label}</span>
              {ep.status !== 'PAID' && (
                <button
                  onClick={() => setShowForm(v => !v)}
                  className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded border border-[var(--ds-border)] text-[var(--ds-primary)] hover:bg-[var(--ds-surface-hover)] transition-colors"
                >
                  <CreditCard size={12} />
                  Payer
                  {showForm ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              )}
            </div>
          </div>

          {ep.totalPaid > 0 && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 bg-[var(--ds-border)] rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--ds-success)]"
                  style={{ width: `${Math.min(100, (ep.totalPaid / ep.expectedAmount) * 100)}%` }}
                />
              </div>
              <span className="text-xs text-ds-text-secondary whitespace-nowrap">
                {fmt(ep.totalPaid)} / {fmt(ep.expectedAmount)}
              </span>
            </div>
          )}

          {showForm && (
            <PaymentForm
              installmentId={ep.installmentId}
              studentId={studentId}
              academicYearId={academicYearId}
              remaining={ep.remaining}
              onSuccess={() => setShowForm(false)}
              onCancel={() => setShowForm(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface Props {
  studentId: string;
  academicYearId: string;
  studentName: string;
  studentNumber?: string;
  className?: string;
  onClose: () => void;
}

export function StudentPaymentModal({ studentId, academicYearId, studentName, studentNumber, className, onClose }: Props) {
  const [tab, setTab] = useState<'versements' | 'historique'>('versements');

  // Payment status (plan + installments)
  const { data: status, isLoading: loadingStatus, error: statusError } = useQuery({
    queryKey: ['payment-status', studentId, academicYearId],
    queryFn: async () => {
      const res = await studentPaymentsApi.getStatus(studentId, academicYearId);
      return res.data.data;
    },
    retry: false,
  });

  // Payment history
  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ['payment-history', studentId, academicYearId],
    queryFn: async () => {
      const res = await studentPaymentsApi.getByStudent(studentId, academicYearId);
      return res.data.data ?? [];
    },
  });

  const history: any[] = historyData ?? [];

  const handleViewReceipt = async (paymentId: string) => {
    try {
      const res = await receiptPdfBlob(paymentId);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      toast.error('Impossible de charger le reçu');
    }
  };

  const completionPct = status ? Math.round(status.summary.completionRate) : 0;

  return (
    <Modal
      open
      onClose={onClose}
      title=""
      width={680}
      footer={
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>Fermer</Button>
        </div>
      }
    >
      {/* ── En-tête élève ── */}
      <div className="flex items-center gap-4 pb-4 mb-4 border-b border-[var(--ds-border)]">
        <div className="w-12 h-12 rounded-full bg-[var(--ds-primary)] flex items-center justify-center text-white font-bold text-lg flex-none">
          {studentName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-ds-text text-base truncate">{studentName}</p>
          <p className="text-xs text-ds-text-secondary">
            {studentNumber && <span className="mr-2">{studentNumber}</span>}
            {className && <span>{className}</span>}
          </p>
        </div>
        {status && (
          <div className="text-right flex-none">
            <p className="text-xs text-ds-text-secondary">Payé</p>
            <p className="font-bold text-ds-text">{fmt(status.summary.totalPaid)}</p>
            <p className="text-xs text-ds-text-tertiary">/ {fmt(status.summary.totalExpected)}</p>
          </div>
        )}
      </div>

      {/* ── Barre de progression ── */}
      {status && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-ds-text-secondary mb-1">
            <span>{status.customPaymentPlan.name}</span>
            <span>{completionPct}% réglé</span>
          </div>
          <div className="w-full bg-[var(--ds-border)] rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${completionPct === 100 ? 'bg-[var(--ds-success)]' : completionPct > 0 ? 'bg-[var(--ds-warning)]' : 'bg-[var(--ds-border)]'}`}
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-ds-text-secondary">Restant : <strong className="text-ds-text">{fmt(status.summary.totalRemaining)}</strong></span>
          </div>
        </div>
      )}

      {/* ── Onglets ── */}
      <div className="flex border-b border-[var(--ds-border)] mb-4 gap-1">
        {[
          { key: 'versements', label: 'Versements', icon: CreditCard },
          { key: 'historique', label: 'Historique', icon: History },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key
                ? 'border-[var(--ds-primary)] text-[var(--ds-primary)]'
                : 'border-transparent text-ds-text-secondary hover:text-ds-text'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Onglet Versements ── */}
      {tab === 'versements' && (
        <div>
          {loadingStatus && (
            <div className="py-8 text-center text-sm text-ds-text-secondary animate-pulse">
              Chargement du plan de paiement…
            </div>
          )}
          {!loadingStatus && statusError && (
            <div className="py-6 text-center">
              <p className="text-sm text-ds-text-secondary">Aucun plan de paiement trouvé pour cet élève.</p>
              <p className="text-xs text-ds-text-tertiary mt-1">Vérifiez que l'élève est bien inscrit et qu'une facture a été générée.</p>
            </div>
          )}
          {status && status.expectedPayments.map((ep: any, idx: number) => (
            <InstallmentRow
              key={ep.installmentId}
              ep={ep}
              idx={idx}
              studentId={studentId}
              academicYearId={academicYearId}
            />
          ))}
        </div>
      )}

      {/* ── Onglet Historique ── */}
      {tab === 'historique' && (
        <div>
          {loadingHistory && (
            <div className="py-8 text-center text-sm text-ds-text-secondary animate-pulse">
              Chargement de l'historique…
            </div>
          )}
          {!loadingHistory && history.length === 0 && (
            <div className="py-6 text-center">
              <FileText className="mx-auto mb-2 text-ds-text-tertiary" size={32} />
              <p className="text-sm text-ds-text-secondary">Aucun paiement enregistré.</p>
            </div>
          )}
          {history.map((p: any) => (
            <div key={p.id} className="border-t border-[var(--ds-border)] py-3 first:border-t-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ds-text">{fmt(Number(p.amount))}</p>
                  <p className="text-xs text-ds-text-secondary">
                    {fmtDate(p.payment_date ?? p.paymentDate)} ·{' '}
                    {METHOD_LABELS[p.payment_method as PaymentMethod] ?? p.payment_method}
                    {p.reference ? ` · Réf. ${p.reference}` : ''}
                  </p>
                  {p.custom_payment_plan_installments?.custom_payment_plans && (
                    <p className="text-xs text-ds-text-tertiary mt-0.5">
                      {p.custom_payment_plan_installments.custom_payment_plans.name}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleViewReceipt(p.id)}
                  title="Voir le reçu PDF"
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-[var(--ds-border)] text-ds-text-secondary hover:text-[var(--ds-primary)] hover:border-[var(--ds-primary)] transition-colors flex-none"
                >
                  <FileText size={12} />
                  Reçu
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
