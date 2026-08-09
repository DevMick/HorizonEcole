import { useMemo } from 'react';
import { Checkbox, Form, Input } from 'antd';
import { ArrowLeft, Save } from 'lucide-react';
import { Button, Card } from '../ds';
import { menuCatalogForModules } from '../../lib/navigation/menu-catalog';
import { useEstablishment } from '../../lib/hooks/useEstablishment';

const { TextArea } = Input;

export interface RoleFormPageProps {
  editing: any;
  name: string;
  onNameChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  selectedKeys: string[];
  onToggleKey: (key: string) => void;
  onSelectGroup: (groupKeys: string[]) => void;
  onClearGroup: (groupKeys: string[]) => void;
  nameError?: string;
  onCancel: () => void;
  onSubmit: () => void;
  submitting?: boolean;
}

/**
 * Formulaire création/édition de rôle personnalisé : nom + description +
 * cases à cocher des menus (reprend le motif ds-check-grid de
 * SubjectAssignmentPage), groupées par section du sidebar.
 */
export function RoleFormPage(props: RoleFormPageProps) {
  const {
    editing, name, onNameChange, description, onDescriptionChange,
    selectedKeys, onToggleKey, onSelectGroup, onClearGroup, nameError,
    onCancel, onSubmit, submitting,
  } = props;

  // Seuls les menus du type d'établissement sont proposés : dans une école
  // primaire, la pédagogie du secondaire n'a pas d'objet, et inversement.
  const { data: establishment } = useEstablishment();
  const catalog = useMemo(
    () => menuCatalogForModules(establishment?.modules),
    [establishment?.modules],
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center gap-3">
        <Button variant="ghost" size="sm" iconOnly icon={<ArrowLeft aria-hidden />} aria-label="Retour à la liste" onClick={onCancel} />
        <div>
          <h1 className="font-display text-[1.5rem] font-bold tracking-tight text-ds-text">
            {editing ? 'Modifier le rôle' : 'Nouveau rôle'}
          </h1>
          <p className="mt-1 text-sm text-ds-text-secondary">
            Choisissez les menus visibles dans le sidebar pour les comptes ayant ce rôle.
          </p>
        </div>
      </div>

      <Card className="mb-4">
        <Form layout="vertical" component="div">
          <Form.Item
            label="Nom du rôle"
            required
            validateStatus={nameError ? 'error' : undefined}
            help={nameError || undefined}
          >
            <Input
              placeholder="Ex. Secrétariat"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
            />
          </Form.Item>
          <Form.Item label="Description (optionnel)" className="!mb-0">
            <TextArea
              rows={2}
              placeholder="Rôle destiné à…"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Card>

      {catalog.map((group) => {
        const groupKeys = group.items.map((i) => i.key);
        const selectedInGroup = groupKeys.filter((k) => selectedKeys.includes(k)).length;
        return (
          <Card key={group.key} className="mb-4">
            <div className="mb-3 flex items-center justify-between">
              <strong className="font-display text-ds-text">{group.label}</strong>
              <span className="flex items-center gap-2">
                <span className="ds-badge ds-badge-role">{selectedInGroup} / {group.items.length}</span>
                <Button variant="ghost" size="sm" onClick={() => onSelectGroup(groupKeys)}>Tout</Button>
                <Button variant="ghost" size="sm" onClick={() => onClearGroup(groupKeys)}>Aucune</Button>
              </span>
            </div>
            <div className="ds-check-grid">
              {group.items.map((item) => (
                <Checkbox
                  key={item.key}
                  checked={selectedKeys.includes(item.key)}
                  onChange={() => onToggleKey(item.key)}
                >
                  <span className="min-w-0 truncate">{item.label}</span>
                </Checkbox>
              ))}
            </div>
          </Card>
        );
      })}

      <div className="ds-sticky-save">
        <span className="ds-save-count flex-1">{selectedKeys.length} menu(s) sélectionné(s)</span>
        <Button variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button icon={<Save aria-hidden />} loading={submitting} onClick={onSubmit}>{editing ? 'Mettre à jour' : 'Enregistrer'}</Button>
      </div>
    </div>
  );
}
