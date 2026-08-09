import dayjs from 'dayjs';
import {
  Form, Input, InputNumber, DatePicker, Row, Col, Button as AntButton,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { ArrowLeft } from 'lucide-react';
import { Button, Card } from '../ds';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditingCondition {
  name: string;
  description?: string;
  lines: Array<{
    id?: string;
    label: string;
    amount: string | null;
    due_date: string | null;
  }>;
}

export interface FormValues {
  name: string;
  description?: string;
  lines: Array<{ label: string; amount: number; dueDate: dayjs.Dayjs }>;
}

export interface PaymentConditionFormPageProps {
  editing: EditingCondition | null;
  onCancel: () => void;
  onSubmit: (values: FormValues) => void;
  submitting?: boolean;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function PaymentConditionFormPage({
  editing, onCancel, onSubmit, submitting,
}: PaymentConditionFormPageProps) {
  const [form] = Form.useForm<FormValues>();

  const initialValues = editing
    ? {
        name: editing.name,
        description: editing.description || '',
        lines: editing.lines.map(l => ({
          label: l.label,
          amount: l.amount != null ? parseFloat(String(l.amount)) : undefined,
          dueDate: l.due_date ? dayjs(l.due_date) : undefined,
        })),
      }
    : { lines: [{}] };

  const lines = Form.useWatch('lines', form) as any[] | undefined;
  const total = (lines || []).reduce((s: number, l: any) => s + (Number(l?.amount) || 0), 0);

  const handleSubmit = () => {
    form.validateFields().then((values) => onSubmit(values));
  };

  return (
    <div className="mx-auto max-w-3xl">
      {/* ── En-tête ── */}
      <div className="mb-5 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          icon={<ArrowLeft aria-hidden />}
          aria-label="Retour à la liste"
          onClick={onCancel}
        />
        <div>
          <h1 className="font-display text-[1.5rem] font-bold tracking-tight text-ds-text">
            {editing ? "Modifier l'échéancier" : 'Nouvel échéancier'}
          </h1>
          <p className="mt-1 text-sm text-ds-text-secondary">
            {editing
              ? "Mettez à jour les versements et leurs dates d'échéance."
              : "Définissez les versements avec leur montant fixe et leur date d'échéance."}
          </p>
        </div>
      </div>

      <Form form={form} layout="vertical" preserve={false} initialValues={initialValues}>
        {/* ── Informations générales ── */}
        <Card className="mb-4">
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="name"
                label="Nom de l'échéancier"
                rules={[{ required: true, message: 'Le nom est requis' }]}
              >
                <Input placeholder="ex : 5 versements trimestriels" />
              </Form.Item>
            </Col>
            <Col span={8} />
          </Row>
        </Card>

        {/* ── Tableau des versements ── */}
        <Card>
          <div className="mb-3">
            <p className="font-medium text-ds-text">
              Versements <span className="text-red-500">*</span>
            </p>
            <p className="text-xs text-ds-text-secondary mt-0.5">
              Saisissez le montant fixe et la date d'échéance de chaque versement.
            </p>
          </div>

          <Form.List
            name="lines"
            rules={[{
              validator: async (_, ls) => {
                if (!ls || ls.length === 0) return Promise.reject(new Error('Ajoutez au moins un versement.'));
              },
            }]}
          >
            {(fields, { add, remove }, { errors }) => (
              <>
                <div className="rounded-lg border border-[var(--ds-border)] overflow-hidden mb-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[var(--ds-surface-hover)] text-[var(--ds-text-secondary)]">
                        <th className="px-3 py-2.5 text-left font-medium w-8">#</th>
                        <th className="px-3 py-2.5 text-left font-medium">Libellé du versement</th>
                        <th className="px-3 py-2.5 text-left font-medium w-44">Montant (CFA)</th>
                        <th className="px-3 py-2.5 text-left font-medium w-40">Date d'échéance</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field, idx) => (
                        <tr key={field.key} className="border-t border-[var(--ds-border)]">
                          <td className="px-3 py-2 text-ds-text-tertiary text-center font-medium">
                            {idx + 1}
                          </td>
                          <td className="px-2 py-1.5">
                            <Form.Item
                              {...field}
                              name={[field.name, 'label']}
                              rules={[{ required: true, message: 'Libellé requis' }]}
                              style={{ margin: 0 }}
                            >
                              <Input placeholder="ex : 1er versement" />
                            </Form.Item>
                          </td>
                          <td className="px-2 py-1.5">
                            <Form.Item
                              {...field}
                              name={[field.name, 'amount']}
                              rules={[{ required: true, message: 'Montant requis' }]}
                              style={{ margin: 0 }}
                            >
                              <InputNumber
                                style={{ width: '100%' }}
                                placeholder="75 000"
                                formatter={(v) =>
                                  v !== undefined && v !== ''
                                    ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
                                    : ''
                                }
                                parser={(v) => (v ? parseFloat(v.replace(/\s/g, '')) : ('' as any))}
                              />
                            </Form.Item>
                          </td>
                          <td className="px-2 py-1.5">
                            <Form.Item
                              {...field}
                              name={[field.name, 'dueDate']}
                              rules={[{ required: true, message: 'Date requise' }]}
                              style={{ margin: 0 }}
                            >
                              <DatePicker
                                style={{ width: '100%' }}
                                format="DD/MM/YYYY"
                                placeholder="JJ/MM/AAAA"
                              />
                            </Form.Item>
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <AntButton
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              disabled={fields.length <= 1}
                              onClick={() => remove(field.name)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Form.ErrorList errors={errors} />

                <div className="flex items-center justify-between">
                  <AntButton type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                    Ajouter un versement
                  </AntButton>

                  {lines && lines.length > 0 && lines.every((l: any) => l?.amount != null) && (
                    <p className="text-sm text-ds-text-secondary">
                      Total :{' '}
                      <strong className="text-ds-text">
                        {new Intl.NumberFormat('fr-FR').format(total)} CFA
                      </strong>
                    </p>
                  )}
                </div>
              </>
            )}
          </Form.List>
        </Card>
      </Form>

      {/* ── Barre d'actions collante ── */}
      <div className="ds-sticky-save">
        <span className="ds-save-count flex-1">
          {editing ? "Modification de l'échéancier…" : 'Nouvel échéancier'}
        </span>
        <Button variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button loading={submitting} onClick={handleSubmit}>
          {editing ? 'Mettre à jour' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );
}
