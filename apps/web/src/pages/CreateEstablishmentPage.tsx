import { useState } from 'react';
import { Alert, App, Button, Card, Form, Input, Steps, Typography, Upload } from 'antd';
import { ArrowLeft, Building2, Check, Copy, GraduationCap, Image as ImageIcon, School, ShieldCheck, Upload as UploadIcon, X } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import type { SchoolType } from '../lib/hooks/useEstablishment';

/**
 * Création d'un établissement.
 *
 * Page publique : c'est par elle qu'une école entre dans l'application, avant
 * qu'aucun compte n'existe. Le choix du type d'école n'est pas cosmétique — il
 * fixe les niveaux de classes ouverts et les modules disponibles, et il n'est
 * pas modifiable ensuite (les classes déjà créées y seraient orphelines). Le
 * formulaire le dit explicitement plutôt que de laisser la surprise à l'usage.
 */

interface SchoolTypeOption {
  value: SchoolType;
  label: string;
  levels: string;
  description: string;
  icon: typeof School;
}

const SCHOOL_TYPES: SchoolTypeOption[] = [
  {
    value: 'PRIMAIRE',
    label: 'École primaire',
    levels: 'CP1 → CM2',
    description:
      'Compositions et moyenne obtenue en divisant le total des notes par le diviseur du niveau.',
    icon: School,
  },
  {
    value: 'COLLEGE',
    label: 'Collège',
    levels: '6ème → 3ème',
    description: 'Moyennes trimestrielles pondérées par coefficient, conduite et bulletins.',
    icon: Building2,
  },
  {
    value: 'LYCEE',
    label: 'Lycée',
    levels: '6ème → Terminale',
    description:
      'Comme le collège, dont il reprend les classes : un lycée scolarise aussi la 6ème à la 3ème.',
    icon: GraduationCap,
  },
];

interface CreatedResult {
  establishment: { id: string; name: string; code: string; schoolType: SchoolType };
  admin: { email: string; firstName: string; lastName: string; password: string };
}

export default function CreateEstablishmentPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [schoolType, setSchoolType] = useState<SchoolType | null>(null);
  const [created, setCreated] = useState<CreatedResult | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  /**
   * Sélection du logo, via le composant Upload d'Ant Design.
   *
   * `beforeUpload` retourne toujours `false` : le fichier n'est pas envoyé au
   * fil de l'eau, il est conservé en mémoire et joint au multipart de création
   * de l'établissement (§ handleSubmit). Une école n'existe pas encore au
   * moment où l'on choisit son logo — il n'y a donc nulle part où le déposer.
   */
  const onPickLogo = (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('Le logo doit être une image (JPG, PNG, WEBP).');
      return false;
    }
    if (file.size > 2 * 1024 * 1024) {
      message.error('Le logo ne doit pas dépasser 2 Mo.');
      return false;
    }
    setLogoFile(file);
    setLogoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    return false;
  };

  const clearLogo = () => {
    setLogoFile(null);
    setLogoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const createM = useMutation({
    mutationFn: async (values: any) => {
      // Le logo est facultatif : on n'envoie du multipart que pour transporter
      // le fichier ; les champs restent identiques côté serveur.
      const fd = new FormData();
      Object.entries({ ...values, schoolType }).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') fd.append(key, String(val));
      });
      if (logoFile) fd.append('logo', logoFile);
      return (await api.post('/establishments', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })).data.data as CreatedResult;
    },
    onSuccess: (data) => setCreated(data),
    onError: (error: any) =>
      message.error(
        error?.response?.data?.error ||
          error?.response?.data?.details?.[0]?.message ||
          "Impossible de créer l'établissement.",
      ),
  });

  const copyCredentials = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(
      `Établissement : ${created.establishment.name}\nIdentifiant : ${created.admin.email}\nMot de passe : ${created.admin.password}`,
    );
    message.success('Identifiants copiés.');
  };

  if (created) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-10">
        <Card className="rounded-[20px]">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-7 w-7 text-emerald-600" aria-hidden="true" />
            </div>
            <Typography.Title level={3} style={{ marginBottom: 4 }}>
              {created.establishment.name} est créé
            </Typography.Title>
            <Typography.Text type="secondary">
              Type : {SCHOOL_TYPES.find((t) => t.value === created.establishment.schoolType)?.label}
              {' · '}Identifiant : {created.establishment.code}
            </Typography.Text>
          </div>

          <Alert
            type="warning"
            showIcon
            className="mb-5"
            message="Notez ces identifiants maintenant"
            description="Le mot de passe n'est pas conservé en clair : il ne sera plus jamais affiché. Changez-le après la première connexion."
          />

          <div className="space-y-3 rounded-xl bg-muted p-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Compte administrateur
              </div>
              <div className="font-medium">
                {created.admin.firstName} {created.admin.lastName}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Identifiant</div>
              <div className="font-mono">{created.admin.email}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Mot de passe provisoire
              </div>
              <div className="font-mono text-lg tracking-wider">{created.admin.password}</div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button
              icon={<Copy className="h-4 w-4" aria-hidden="true" />}
              onClick={copyCredentials}
              size="large"
              block
            >
              Copier les identifiants
            </Button>
            <Button type="primary" size="large" block onClick={() => navigate('/login')}>
              Aller à la connexion
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-10">
      <div className="mb-6">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour à la connexion
        </Link>
      </div>

      <Card className="rounded-[20px]">
        <Typography.Title level={3} style={{ marginBottom: 4 }}>
          Configurer votre établissement
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          Une seule configuration : le type d'école détermine les classes que vous pourrez créer et
          les modules disponibles. Un compte administrateur est créé automatiquement.
        </Typography.Paragraph>

        <Steps
          size="small"
          className="my-6"
          current={schoolType ? 1 : 0}
          items={[
            { title: "Type d'école", icon: <School className="h-4 w-4" aria-hidden="true" /> },
            { title: 'Établissement', icon: <Building2 className="h-4 w-4" aria-hidden="true" /> },
            { title: 'Administrateur', icon: <ShieldCheck className="h-4 w-4" aria-hidden="true" /> },
          ]}
        />

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {SCHOOL_TYPES.map((option) => {
            const Icon = option.icon;
            const selected = schoolType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSchoolType(option.value)}
                aria-pressed={selected}
                className={cn(
                  'rounded-xl border p-4 text-left transition-all',
                  selected
                    ? 'border-role-primary bg-[rgb(var(--role-primary)/0.06)] ring-1 ring-role-primary'
                    : 'border-ds-border hover:border-role-primary/50',
                )}
              >
                <Icon className="mb-2 h-5 w-5 text-role-primary" aria-hidden="true" />
                <div className="font-medium">{option.label}</div>
                <div className="text-xs font-mono text-muted-foreground">{option.levels}</div>
                <p className="mt-2 text-xs text-muted-foreground">{option.description}</p>
              </button>
            );
          })}
        </div>

        {schoolType === 'LYCEE' && (
          <Alert
            type="info"
            showIcon
            className="mb-5"
            message="Le lycée inclut le collège"
            description="Vous pourrez créer les classes de la 6ème à la Terminale."
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            if (!schoolType) {
              message.warning("Choisissez d'abord le type d'école.");
              return;
            }
            createM.mutate(values);
          }}
        >
          <Form.Item
            name="name"
            label="Nom de l'établissement"
            rules={[{ required: true, min: 3, message: 'Le nom est obligatoire (3 caractères min.)' }]}
          >
            <Input placeholder="Ex : Groupe Scolaire Les Palmiers" size="large" />
          </Form.Item>

          <div className="grid gap-4 sm:grid-cols-2">
            <Form.Item
              name="email"
              label="Email de l'établissement"
              rules={[{ required: true, type: 'email', message: 'Email invalide' }]}
            >
              <Input placeholder="contact@ecole.ci" size="large" />
            </Form.Item>
            <Form.Item name="phone" label="Téléphone">
              <Input placeholder="01 02 03 04 05" size="large" />
            </Form.Item>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Form.Item name="city" label="Ville">
              <Input placeholder="Abidjan" size="large" />
            </Form.Item>
            <Form.Item name="address" label="Adresse">
              <Input placeholder="Cocody, Riviera 3" size="large" />
            </Form.Item>
          </div>

          {/* Rattachement administratif — propre à l'enseignement primaire :
              l'en-tête des fiches de classement officielles porte la direction
              régionale et le secteur pédagogique. Un collège ou un lycée n'a pas
              cette hiérarchie, le bloc ne s'affiche donc pas pour eux. */}
          {schoolType === 'PRIMAIRE' && (
            <div className="mb-4 rounded-xl border border-ds-border bg-black/[0.02] p-4">
              <p className="mb-1 text-sm font-semibold text-ds-text">Rattachement administratif</p>
              <p className="mb-4 text-xs text-ds-text-secondary">
                Ces mentions figurent en en-tête des fiches de classement et des bulletins
                officiels. Vous pourrez les compléter plus tard depuis la fiche de
                l'établissement.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Form.Item
                  name="directionRegionale"
                  label="Direction Régionale"
                  className="mb-0"
                >
                  <Input placeholder="Ex : Abidjan 3" size="large" />
                </Form.Item>
                <Form.Item
                  name="secteurPedagogique"
                  label="Secteur Pédagogique"
                  className="mb-0"
                >
                  <Input placeholder="Ex : Cocody 2" size="large" />
                </Form.Item>
              </div>
            </div>
          )}

          {/* Logo — facultatif : une école peut être créée sans logo. */}
          <Form.Item label="Logo de l'établissement (facultatif)">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ds-border bg-black/[0.03]">
                {logoPreview ? (
                  <img src={logoPreview} alt="Aperçu du logo" className="h-full w-full object-contain" />
                ) : (
                  <ImageIcon className="text-muted-foreground" aria-hidden="true" />
                )}
              </span>
              {/* Upload d'Ant Design plutôt qu'un <input type="file"> masqué :
                  Ant applique `.ant-form input[type="file"] { display: block }`,
                  dont la spécificité (0,2,1) l'emporte sur la classe utilitaire
                  `hidden` (0,1,0). Le champ natif restait donc visible à côté du
                  bouton, et l'écran offrait deux commandes pour une seule
                  action. Upload masque le sien par style en ligne, hors de
                  portée de cette règle. */}
              <Upload
                accept="image/jpeg,image/png,image/webp"
                beforeUpload={onPickLogo}
                showUploadList={false}
                maxCount={1}
              >
                <Button icon={<UploadIcon className="h-4 w-4" aria-hidden="true" />}>
                  {logoFile ? 'Changer le logo' : 'Charger un logo'}
                </Button>
              </Upload>
              {logoFile && (
                <Button
                  type="text"
                  icon={<X className="h-4 w-4" aria-hidden="true" />}
                  onClick={clearLogo}
                >
                  Retirer
                </Button>
              )}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Image JPG, PNG ou WEBP, 2 Mo max. Vous pourrez l'ajouter ou le modifier plus tard.
            </div>
          </Form.Item>

          <div className="mb-2 mt-4 text-sm font-medium">Compte administrateur</div>
          <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
            Ce compte permettra de configurer l'école : classes, matières, enseignants, élèves. Son
            mot de passe est généré et affiché une seule fois.
          </Typography.Paragraph>

          <div className="grid gap-4 sm:grid-cols-2">
            <Form.Item
              name="adminFirstName"
              label="Prénom"
              rules={[{ required: true, min: 2, message: 'Le prénom est obligatoire' }]}
            >
              <Input placeholder="Aya" size="large" />
            </Form.Item>
            <Form.Item
              name="adminLastName"
              label="Nom"
              rules={[{ required: true, min: 2, message: 'Le nom est obligatoire' }]}
            >
              <Input placeholder="Kouassi" size="large" />
            </Form.Item>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Form.Item
              name="adminEmail"
              label="Email de connexion"
              rules={[{ required: true, type: 'email', message: 'Email invalide' }]}
              extra="Cet email servira d'identifiant. Il doit être unique."
            >
              <Input placeholder="directeur@ecole.ci" size="large" />
            </Form.Item>
            <Form.Item name="adminPhone" label="Téléphone">
              <Input placeholder="07 08 09 10 11" size="large" />
            </Form.Item>
          </div>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={createM.isPending}
            disabled={!schoolType}
            className="mt-2"
          >
            Créer l'établissement
          </Button>
        </Form>
      </Card>
    </div>
  );
}
