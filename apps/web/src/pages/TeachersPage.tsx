import { useEffect, useMemo, useState } from 'react';
import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Select } from 'antd';
import { api } from '../lib/api';
import { toast } from '../components/ds';
import { EntityBoard } from '../components/shared/EntityBoard';
import { TeacherFormPage } from '../components/teachers/TeacherFormPage';
import { useEstablishment } from '../lib/hooks/useEstablishment';
import { usePrimaryClasses } from '../lib/hooks/usePrimary';
import { useAcademicYears } from '../lib/hooks/useAcademicYears';

/** Enseignants (§10) — re-skin via scaffold. CRUD sur `/teachers`. Les listes
 *  dynamiques spécialités/qualifications sont simplifiées en champs « séparés par
 *  des virgules » (même donnée stockée, UI plus légère). Pour les écoles
 *  primaires, la sélection de matières est remplacée par l'affectation à une
 *  classe (titulaire). */

const CONTRACTS = [{ value: 'CDI', label: 'CDI' }, { value: 'CDD', label: 'CDD' }, { value: 'VACATAIRE', label: 'Vacataire' }];

export default function TeachersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [contract, setContract] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);
  const [attachmentsToRemove, setAttachmentsToRemove] = useState<string[]>([]);

  // Détection du type d'établissement
  const { data: establishment } = useEstablishment();
  const isPrimary = establishment?.schoolType === 'PRIMAIRE';

  // Année scolaire en cours — nécessaire pour l'affectation de classe
  const { currentYear } = useAcademicYears();

  const { data, isLoading } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => { const b = (await api.get('/teachers?limit=1000')).data; return b.data || b.teachers || []; },
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects-all'],
    queryFn: async () => (await api.get('/subjects')).data.data || [],
    enabled: !isPrimary,
  });

  // Classes du primaire avec titulaires — uniquement pour les écoles primaires
  const { data: primaryClasses } = usePrimaryClasses(
    currentYear?.id,
    isPrimary && !!currentYear?.id,
  );

  const items = useMemo(() => (data || []).filter((t: any) => {
    if (contract && t.contract_type !== contract) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return `${t.first_name ?? ''} ${t.last_name ?? ''}`.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q) || t.specialties?.toLowerCase().includes(q);
  }), [data, search, contract]);

  // Tableau de correspondance teacherId → nom de classe (pour les badges)
  const teacherClassMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const cls of (primaryClasses || [])) {
      if (cls.mainTeacher) {
        map[cls.mainTeacher.id] = cls.name;
      }
    }
    return map;
  }, [primaryClasses]);

  // Classes disponibles pour l'affectation :
  //   • sans titulaire pour l'année en cours, OU
  //   • déjà affectée à l'enseignant qu'on est en train de modifier
  const availableClasses = useMemo(
    () => (primaryClasses || []).filter(
      (c) => !c.mainTeacher || c.mainTeacher.id === editing?.id,
    ),
    [primaryClasses, editing],
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['teachers'] });

  // Mutations sans onSuccess — le succès est géré dans handleFormSubmit
  // pour pouvoir enchaîner l'affectation de classe (primaire).
  const createM = useMutation({
    mutationFn: async (fd: FormData) =>
      (await api.post('/teachers', fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data,
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Erreur lors de la création.'),
  });
  const updateM = useMutation({
    mutationFn: async ({ id, fd }: { id: string; fd: FormData }) =>
      (await api.patch(`/teachers/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data,
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Erreur lors de la modification.'),
  });
  const deleteM = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/teachers/${id}`)).data,
    onSuccess: () => { toast.success('Enseignant supprimé.'); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Impossible de supprimer.'),
  });

  const handleFormSubmit = () => {
    form.validateFields().then(async (values) => {
      const fd = new FormData();
      fd.append('lastName', values.lastName.trim());
      fd.append('firstName', values.firstName.trim());
      fd.append('email', values.email.trim());
      if (values.phone) fd.append('phone', values.phone);
      fd.append('contractType', values.contractType);
      // Pour le primaire, on n'envoie pas subjectIds (champ non utilisé)
      if (!isPrimary) {
        fd.append('subjectIds', JSON.stringify(values.subjectIds || []));
      }
      fileList.forEach((f) => { if (f.originFileObj) fd.append('attachments', f.originFileObj); });
      if (editing && attachmentsToRemove.length > 0) fd.append('attachmentsToRemove', JSON.stringify(attachmentsToRemove));

      // Création / mise à jour de la fiche enseignant
      let teacherResult: any;
      try {
        if (editing) {
          teacherResult = await updateM.mutateAsync({ id: editing.id, fd });
        } else {
          teacherResult = await createM.mutateAsync(fd);
        }
      } catch {
        // L'erreur est déjà affichée via onError — on interrompt ici
        return;
      }

      const teacherId: string = editing ? editing.id : teacherResult?.data?.id;

      // Pour le primaire : affectation du titulaire de classe
      if (isPrimary && currentYear && teacherId) {
        const newClassId: string | null = values.classId || null;
        // Classe actuellement affectée à cet enseignant (dans l'année en cours)
        const currentClass = (primaryClasses || []).find(
          (c) => c.mainTeacher?.id === (editing?.id ?? teacherId),
        );

        try {
          // Désaffecter l'ancienne classe si elle change
          if (currentClass && currentClass.id !== newClassId) {
            await api.put(`/primary/classes/${currentClass.id}/main-teacher`, {
              academicYearId: currentYear.id,
              teacherId: null,
            });
          }
          // Affecter la nouvelle classe
          if (newClassId && newClassId !== currentClass?.id) {
            await api.put(`/primary/classes/${newClassId}/main-teacher`, {
              academicYearId: currentYear.id,
              teacherId,
            });
          }
          queryClient.invalidateQueries({ queryKey: ['primary', 'classes'] });
        } catch (e: any) {
          toast.error(e?.response?.data?.error || "Erreur lors de l'affectation de classe.");
          // On ferme quand même le formulaire et on rafraîchit la liste
        }
      }

      toast.success(editing ? 'Enseignant modifié.' : 'Enseignant créé.');
      setFormOpen(false);
      invalidate();
    });
  };

  const handleFormCancel = () => {
    form.resetFields();
    setEditing(null);
    setFileList([]);
    setAttachmentsToRemove([]);
    setFormOpen(false);
  };

  // Reset form when opening for create
  const handleOpenCreate = () => {
    setEditing(null);
    form.resetFields();
    setFileList([]);
    setAttachmentsToRemove([]);
    setFormOpen(true);
  };

  // Set form values when opening for edit
  const handleOpenEdit = (teacher: any) => {
    setEditing(teacher);
    setFileList([]);
    setAttachmentsToRemove([]);
    setFormOpen(true);
  };

  // Le formulaire ne monte qu'après le re-render déclenché par setFormOpen(true) ;
  // appeler setFieldsValue avant que <Form> existe n'a aucun effet (champs pas
  // encore enregistrés). On attend donc le montage via useEffect + micro-délai.
  useEffect(() => {
    if (formOpen && editing) {
      const currentClass = (primaryClasses || []).find((c) => c.mainTeacher?.id === editing.id);
      const t = setTimeout(() => form.setFieldsValue({
        lastName: editing.last_name,
        firstName: editing.first_name,
        email: editing.email,
        phone: editing.phone || '+225',
        contractType: editing.contract_type,
        ...(isPrimary
          ? { classId: currentClass?.id ?? null }
          : { subjectIds: (editing.subjects || []).map((s: any) => s.id) }
        ),
      }), 50);
      return () => clearTimeout(t);
    }
  }, [formOpen, editing, form, isPrimary, primaryClasses]);

  const handleRemoveAttachment = (attachment: string) => {
    setAttachmentsToRemove((prev) => [...prev, attachment]);
  };

  // Navigate to detail page
  const handleViewDetail = (teacher: any) => {
    navigate(`/people/teachers/${teacher.id}`);
  };

  return (
    <div className="animate-fade-in">
      {!formOpen ? (
        <EntityBoard
          title="Enseignants"
          subtitle="Gestion du personnel enseignant."
          icon={User}
          primaryLabel="Nouvel enseignant"
          onPrimary={handleOpenCreate}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Rechercher par nom, email, spécialité…"
          filters={
            <label className="ds-field w-44"><span>Contrat</span>
              <Select
                value={contract || undefined}
                placeholder="Tous"
                allowClear
                onChange={(v) => setContract(v || '')}
                onClear={() => setContract('')}
                options={CONTRACTS}
                style={{ width: '100%' }}
              />
            </label>
          }
          items={items}
          loading={isLoading}
          cardOf={(t) => ({
            key: t.id,
            title: `${t.last_name ?? ''} ${t.first_name ?? ''}`.trim() || '—',
            subtitle: t.email || t.specialties || '—',
            badges: [
              ...(t.contract_type ? [{ label: t.contract_type, kind: 'role' as const }] : []),
              // Primaire : badge classe affectée — autres : badges matières
              ...(isPrimary
                ? (teacherClassMap[t.id] ? [{ label: teacherClassMap[t.id], kind: 'info' as const }] : [])
                : ((t.subjects || []).map((s: any) => ({ label: s.code || s.name, kind: 'info' as const })))
              ),
            ],
            onClick: () => handleViewDetail(t),
          })}
          onEdit={handleOpenEdit}
          onDelete={(t) => deleteM.mutate(t.id)}
          emptyTitle="Aucun enseignant"
          emptyText="Ajoutez un enseignant pour commencer."
        />
      ) : (
        <TeacherFormPage
          form={form}
          editing={editing}
          subjects={subjects || []}
          isPrimary={isPrimary}
          availableClasses={availableClasses}
          fileList={fileList}
          onFileListChange={setFileList}
          attachmentsToRemove={attachmentsToRemove}
          onRemoveAttachment={handleRemoveAttachment}
          onCancel={handleFormCancel}
          onSubmit={handleFormSubmit}
          submitting={createM.isPending || updateM.isPending}
        />
      )}
    </div>
  );
}
