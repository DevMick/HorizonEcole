import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, Image as ImageIcon, Pencil, Trash2, Upload, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Button, Card, Field, Input, Skeleton, toast } from '../components/ds';
import { useEstablishment, SCHOOL_TYPE_LABELS } from '../lib/hooks/useEstablishment';
import { useAuthStore } from '../lib/store';

/** Origine de l'API (sans le suffixe `/api`) pour composer l'URL du logo. */
const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:4001/api').replace(/\/api\/?$/, '');
const logoSrc = (url?: string | null) => (url ? `${API_ORIGIN}${url}` : null);

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="ds-detail-row">
      <span className="ds-detail-label">{label}</span>
      <span className="ds-detail-value">{value ?? '—'}</span>
    </div>
  );
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  motto: string;
  /** Rattachement administratif — saisi et affiché pour le primaire seulement. */
  directionRegionale: string;
  secteurPedagogique: string;
}

/**
 * Profil de l'établissement connecté (§ configuration).
 *
 * Reprend les données saisies à la création de l'école (hors type d'école, qui
 * n'est pas modifiable, et hors compte administrateur). Réservé à
 * l'administrateur pour l'édition ; les autres rôles la consultent seulement.
 */
export default function EstablishmentProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const { data: establishment, isLoading } = useEstablishment();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: '', email: '', phone: '', city: '', address: '', motto: '',
    directionRegionale: '', secteurPedagogique: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recharge le formulaire dès qu'on entre en édition (à partir des données à jour).
  useEffect(() => {
    if (editing && establishment) {
      setForm({
        name: establishment.name ?? '',
        email: establishment.email ?? '',
        phone: establishment.phone ?? '',
        city: establishment.city ?? '',
        address: establishment.address ?? '',
        motto: establishment.motto ?? '',
        directionRegionale: establishment.directionRegionale ?? '',
        secteurPedagogique: establishment.secteurPedagogique ?? '',
      });
    }
  }, [editing, establishment]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['establishment-me'] });

  const saveM = useMutation({
    mutationFn: async (values: FormState) => (await api.patch('/establishments/me', values)).data,
    onSuccess: () => { toast.success('Établissement mis à jour.'); setEditing(false); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Impossible de mettre à jour.'),
  });

  const logoM = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('logo', file);
      return (await api.post('/establishments/me/logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })).data;
    },
    onSuccess: () => { toast.success('Logo mis à jour.'); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Impossible de charger le logo.'),
  });

  const removeLogoM = useMutation({
    mutationFn: async () => (await api.delete('/establishments/me/logo')).data,
    onSuccess: () => { toast.success('Logo retiré.'); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Impossible de retirer le logo.'),
  });

  const onPickLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) logoM.mutate(file);
    e.target.value = ''; // permet de re-sélectionner le même fichier
  };

  const currentLogo = logoSrc(establishment?.logoUrl);

  return (
    <div className="animate-fade-in mx-auto max-w-3xl">
      <div className="mb-5 flex items-center gap-3">
        <Button
          variant="ghost" size="sm" iconOnly icon={<ArrowLeft aria-hidden />}
          aria-label="Retour" onClick={() => navigate(-1)}
        />
        <div>
          <h1 className="font-display text-[1.5rem] font-bold tracking-tight text-ds-text">
            Profil de l'établissement
          </h1>
          <p className="mt-1 text-sm text-ds-text-tertiary">Coordonnées et logo de votre école</p>
        </div>
      </div>

      {isLoading ? (
        <Card><Skeleton height={280} className="rounded-lg" /></Card>
      ) : !establishment ? (
        <Card className="text-center" accent="danger">
          <p className="text-ds-text-secondary">Établissement introuvable.</p>
        </Card>
      ) : (
        <Card>
          {/* En-tête : logo + nom + actions */}
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ds-border bg-black/[0.03]">
                {currentLogo ? (
                  <img src={currentLogo} alt="Logo de l'établissement" className="h-full w-full object-contain" />
                ) : (
                  <Building2 className="text-ds-text-tertiary" aria-hidden />
                )}
              </span>
              <div>
                <h2 className="font-display text-lg font-bold text-ds-text">{establishment.name}</h2>
                <p className="mt-0.5 font-mono text-sm text-ds-text-tertiary">
                  {establishment.code} · {SCHOOL_TYPE_LABELS[establishment.schoolType]}
                </p>
              </div>
            </div>
            {isAdmin && !editing && (
              <Button size="sm" variant="outline" icon={<Pencil aria-hidden />} onClick={() => setEditing(true)}>
                Modifier
              </Button>
            )}
          </div>

          {/* Gestion du logo (admin uniquement) */}
          {isAdmin && (
            <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg bg-black/[0.02] p-3">
              <ImageIcon width={16} height={16} className="text-ds-text-tertiary" aria-hidden />
              <span className="mr-auto text-sm text-ds-text-secondary">
                Logo — image (JPG, PNG, WEBP), 2 Mo max.
              </span>
              <input
                ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickLogo}
              />
              <Button
                size="sm" variant="secondary" icon={<Upload aria-hidden />}
                loading={logoM.isPending} onClick={() => fileInputRef.current?.click()}
              >
                {currentLogo ? 'Remplacer' : 'Charger un logo'}
              </Button>
              {currentLogo && (
                <Button
                  size="sm" variant="ghost" icon={<Trash2 aria-hidden />}
                  loading={removeLogoM.isPending} onClick={() => removeLogoM.mutate()}
                >
                  Retirer
                </Button>
              )}
            </div>
          )}

          {editing ? (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => { e.preventDefault(); saveM.mutate(form); }}
            >
              <Field label="Nom de l'établissement">
                <Input
                  value={form.name} required minLength={3}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Email">
                  <Input
                    type="email" value={form.email} required
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </Field>
                <Field label="Téléphone">
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Ville">
                  <Input
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  />
                </Field>
                <Field label="Adresse">
                  <Input
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  />
                </Field>
              </div>

              {/* Rattachement administratif : hiérarchie propre à
                  l'enseignement primaire, sans équivalent au collège ou au lycée. */}
              {establishment.schoolType === 'PRIMAIRE' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Direction Régionale">
                    <Input
                      value={form.directionRegionale}
                      placeholder="Ex : Abidjan 3"
                      onChange={(e) =>
                        setForm((f) => ({ ...f, directionRegionale: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Secteur Pédagogique">
                    <Input
                      value={form.secteurPedagogique}
                      placeholder="Ex : Cocody 2"
                      onChange={(e) =>
                        setForm((f) => ({ ...f, secteurPedagogique: e.target.value }))
                      }
                    />
                  </Field>
                </div>
              )}

              <div className="mt-1 flex justify-end gap-2">
                <Button
                  type="button" variant="ghost" icon={<X aria-hidden />}
                  onClick={() => setEditing(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" loading={saveM.isPending}>Enregistrer</Button>
              </div>
            </form>
          ) : (
            <div className="ds-detail-list">
              <Row label="Nom" value={establishment.name} />
              <Row label="Identifiant" value={<span className="font-mono">{establishment.code}</span>} />
              <Row label="Type d'école" value={SCHOOL_TYPE_LABELS[establishment.schoolType]} />
              <Row label="Email" value={establishment.email} />
              <Row label="Téléphone" value={establishment.phone} />
              <Row label="Ville" value={establishment.city} />
              <Row label="Adresse" value={establishment.address} />
              {establishment.schoolType === 'PRIMAIRE' && (
                <>
                  <Row label="Direction Régionale" value={establishment.directionRegionale} />
                  <Row label="Secteur Pédagogique" value={establishment.secteurPedagogique} />
                </>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
