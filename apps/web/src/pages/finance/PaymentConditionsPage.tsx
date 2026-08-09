import { useState, useMemo } from 'react';
import { CreditCard, Users, Eye } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentConditionsApi } from '../../lib/api';
import { Button, Modal, toast } from '../../components/ds';
import { EntityBoard } from '../../components/shared/EntityBoard';
import { PaymentConditionFormPage, type FormValues } from '../../components/finance/PaymentConditionFormPage';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Condition {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  lines: Array<{
    id: string;
    line_number: number;
    label: string;
    amount: string | null;
    due_date: string | null;
  }>;
  classes: Array<{ id: string; name: string; level?: string }>;
}

const formatAmount = (n: string | null | undefined) => {
  if (n == null) return '—';
  const num = parseFloat(n);
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('fr-FR').format(num) + ' CFA';
};

const formatDate = (d: string | null | undefined) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('fr-FR'); } catch { return d; }
};

// ─── Page principale ──────────────────────────────────────────────────────────

export default function PaymentConditionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Condition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Condition | null>(null);
  const [assignTarget, setAssignTarget] = useState<Condition | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<Condition | null>(null);
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());

  // ── Données ───────────────────────────────────────────────────────────────

  const { data: conditions = [], isLoading } = useQuery<Condition[]>({
    queryKey: ['payment-conditions'],
    queryFn: async () => {
      const res = await paymentConditionsApi.getAll();
      return res.data.data || [];
    },
  });

  const { data: allClasses = [] } = useQuery<Array<{
    id: string; name: string; level?: string;
    paymentConditionId?: string | null;
    paymentCondition?: { id: string; name: string } | null;
  }>>({
    queryKey: ['school-classes-for-conditions'],
    queryFn: async () => {
      const { api } = await import('../../lib/api');
      const res = await api.get('/school-classes', { params: { limit: 200 } });
      return res.data.data || res.data || [];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['payment-conditions'] });
  };

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof paymentConditionsApi.create>[0]) =>
      paymentConditionsApi.create(data),
    onSuccess: () => { toast.success('Condition créée'); closeForm(); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Erreur lors de la création'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof paymentConditionsApi.update>[1] }) =>
      paymentConditionsApi.update(id, data),
    onSuccess: () => { toast.success('Condition mise à jour'); closeForm(); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Erreur lors de la mise à jour'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => paymentConditionsApi.delete(id),
    onSuccess: () => { toast.success('Condition supprimée'); setDeleteTarget(null); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Erreur lors de la suppression'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, classIds }: { id: string; classIds: string[] }) =>
      paymentConditionsApi.assignClasses(id, classIds),
    onSuccess: () => {
      toast.success('Affectation enregistrée');
      setAssignTarget(null);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['school-classes-for-conditions'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || "Erreur lors de l'affectation"),
  });

  // ── Helpers formulaire ────────────────────────────────────────────────────

  const openCreate = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const openEdit = (c: Condition) => {
    setEditTarget(c);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditTarget(null);
  };

  const handleFormSubmit = (values: FormValues) => {
    const payload = {
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      lines: values.lines.map((l, i) => ({
        lineNumber: i + 1,
        label: l.label.trim(),
        amount: Number(l.amount),
        dueDate: l.dueDate.format('YYYY-MM-DD'),
      })),
    };
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // ── Assign helpers ────────────────────────────────────────────────────────

  const openAssign = (c: Condition) => {
    setAssignTarget(c);
    setSelectedClassIds(new Set((c.classes || []).map(cl => cl.id)));
  };

  const toggleClass = (id: string) =>
    setSelectedClassIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const handleAssign = () => {
    if (!assignTarget) return;
    assignMutation.mutate({ id: assignTarget.id, classIds: [...selectedClassIds] });
  };

  // ── Computed ──────────────────────────────────────────────────────────────

  const filtered = useMemo(
    () => conditions.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase())),
    [conditions, search]
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in">
      {formOpen ? (
        <PaymentConditionFormPage
          key={editTarget?.id || 'new'}
          editing={editTarget}
          onCancel={closeForm}
          onSubmit={handleFormSubmit}
          submitting={isSaving}
        />
      ) : (
        <EntityBoard
          title="Conditions de Paiement"
          subtitle="Définissez des gabarits de versements réutilisables et affectez-les aux classes."
          icon={CreditCard}
          primaryLabel="Nouvelle condition"
          onPrimary={openCreate}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Rechercher une condition…"
          items={filtered}
          loading={isLoading}
          columns={2}
          cardOf={(c: Condition) => ({
            key: c.id,
            title: c.name,
            subtitle: c.description || undefined,
            badges: [
              ...(c.is_active ? [] : [{ label: 'Inactive', kind: 'neutral' as const }]),
              { label: `${c.lines.length} versement${c.lines.length > 1 ? 's' : ''}`, kind: 'info' as const },
              ...(c.classes.length > 0
                ? [{ label: `${c.classes.length} classe${c.classes.length > 1 ? 's' : ''}`, kind: 'success' as const }]
                : [{ label: 'Aucune classe', kind: 'warning' as const }]),
            ],
          })}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
          cardActions={(c: Condition) => (
            <>
              <button
                onClick={() => setDetailsTarget(c)}
                title="Voir les versements"
                className="p-1 rounded text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-hover)] transition-colors"
              >
                <Eye size={14} />
              </button>
              <button
                onClick={() => openAssign(c)}
                title="Affecter aux classes"
                className="p-1 rounded text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-hover)] transition-colors"
              >
                <Users size={14} />
              </button>
            </>
          )}
          emptyTitle="Aucune condition de paiement"
          emptyText="Créez votre première condition pour définir comment les frais sont échelonnés."
        />
      )}

      {/* ── Modale suppression ── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer la condition"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Supprimer
            </Button>
          </div>
        }
      >
        <p>
          Supprimer <strong>{deleteTarget?.name}</strong> ?
          Les classes qui l'utilisent passeront à l'échéancier modèle par niveau.
        </p>
      </Modal>

      {/* ── Modale détail versements ── */}
      <Modal
        open={!!detailsTarget}
        onClose={() => setDetailsTarget(null)}
        title={`Détails — ${detailsTarget?.name || ''}`}
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setDetailsTarget(null)}>Fermer</Button>
            <Button onClick={() => { setDetailsTarget(null); openEdit(detailsTarget!); }}>
              Modifier
            </Button>
          </div>
        }
      >
        {detailsTarget && (
          <>
            {/* Versements */}
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-text-secondary)] mb-2">
              Versements
            </p>
            {detailsTarget.lines.length === 0 ? (
              <p className="py-2 text-sm text-[var(--ds-text-secondary)]">Aucun versement défini.</p>
            ) : (
              <ul className="ds-detail-list mb-4">
                {detailsTarget.lines.map((l, idx) => (
                  <li key={l.id} className="ds-parent-row">
                    <span className="min-w-0 flex-1">
                      <strong className="block text-[.86rem] text-ds-text">
                        {idx + 1}# {l.label}
                      </strong>
                      <span className="text-[.74rem] text-ds-text-tertiary">
                        {formatAmount(l.amount)}
                        {l.due_date ? ` — dû le ${formatDate(l.due_date)}` : ''}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* Total */}
            {detailsTarget.lines.length > 0 && (
              <p className="text-sm text-right text-[var(--ds-text-secondary)] mb-4">
                Total :{' '}
                <strong className="text-ds-text">
                  {formatAmount(
                    String(detailsTarget.lines.reduce((s, l) => s + (parseFloat(l.amount ?? '0') || 0), 0))
                  )}
                </strong>
              </p>
            )}

            {/* Classes affectées */}
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-text-secondary)] mb-2 border-t border-[var(--ds-border)] pt-3">
              Classes affectées
            </p>
            {detailsTarget.classes.length === 0 ? (
              <p className="text-sm text-[var(--ds-text-secondary)]">Aucune classe affectée.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {detailsTarget.classes.map(cl => (
                  <span key={cl.id} className="ds-badge ds-badge-success">{cl.name}</span>
                ))}
              </div>
            )}

            {/* Description */}
            {detailsTarget.description && (
              <p className="mt-3 text-xs text-[var(--ds-text-secondary)] border-t border-[var(--ds-border)] pt-3">
                {detailsTarget.description}
              </p>
            )}
          </>
        )}
      </Modal>

      {/* ── Modale affectation aux classes ── */}
      <Modal
        open={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        title={`Affecter « ${assignTarget?.name} » aux classes`}
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setAssignTarget(null)}>Annuler</Button>
            <Button loading={assignMutation.isPending} onClick={handleAssign}>Enregistrer</Button>
          </div>
        }
      >
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {allClasses.length === 0 && (
            <p className="text-sm text-[var(--ds-text-secondary)]">Aucune classe disponible.</p>
          )}
          {allClasses.map((cls: any) => {
            const isSelected = selectedClassIds.has(cls.id);
            const otherCondition = !isSelected && cls.paymentConditionId && cls.paymentConditionId !== assignTarget?.id
              ? cls.paymentCondition?.name : null;
            return (
              <label
                key={cls.id}
                className="flex items-center gap-3 p-2 rounded-lg border border-[var(--ds-border)] cursor-pointer hover:bg-[var(--ds-surface-hover)] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleClass(cls.id)}
                  className="accent-[var(--ds-primary)]"
                />
                <div>
                  <p className="text-sm font-medium">{cls.name}</p>
                  {otherCondition && (
                    <p className="text-xs text-[var(--ds-warning)]">Condition actuelle : {otherCondition}</p>
                  )}
                  {cls.level && <p className="text-xs text-[var(--ds-text-secondary)]">Niveau : {cls.level}</p>}
                </div>
              </label>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
