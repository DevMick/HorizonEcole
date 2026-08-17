import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Checkbox, ConfigProvider, Form, Input, Select } from 'antd';
import frFR from 'antd/locale/fr_FR';
import {
  BankOutlined,
  EnvironmentOutlined,
  MailOutlined,
  PhoneOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons';

import { CONTACT } from '@/lib/navigation';

/**
 * Formulaire de demande commerciale, en composants Ant Design.
 *
 * Même bibliothèque que l'application (apps/web) : un prospect qui remplit ce
 * formulaire manipule déjà les champs qu'il retrouvera une fois connecté.
 * Le thème ci-dessous rebranche Ant Design sur « Encre & Craie » — les valeurs
 * proviennent de tailwind.config.mjs, pas d'un choix local.
 *
 * Îlot React : la logique d'envoi (JSON, pièges à robots, confirmation) est
 * identique à celle de la version précédente en HTML nu.
 */

export type Variante = 'demonstration' | 'devis' | 'contact';

export interface LigneRecap {
  libelle: string;
  valeur: string;
}

interface Props {
  variante: Variante;
  /** Récapitulatif de simulation, transmis par /tarifs. */
  recap?: LigneRecap[];
  /** Calculé côté Astro : chemin relatif en production, absolu en développement. */
  endpoint: string;
}

interface Valeurs {
  nom: string;
  etablissement?: string;
  ville?: string;
  telephone: string;
  email: string;
  cycles?: string[];
  effectif?: string;
  creneau?: string;
  message?: string;
  site_web?: string;
}

const INTITULES: Record<Variante, string> = {
  demonstration: 'Demander une démonstration',
  devis: 'Recevoir mon devis',
  contact: 'Envoyer le message',
};

const TRANCHES = [
  'Moins de 150 élèves',
  '150 à 400 élèves',
  '400 à 800 élèves',
  '800 à 1 500 élèves',
  'Plus de 1 500 élèves',
];

const CRENEAUX = ['Indifférent', 'Matin', 'Après-midi'];

/**
 * L'indicatif est affiché en préfixe du champ, hors de la valeur saisie : il ne
 * peut donc être ni effacé ni modifié. Il est rajouté au moment de l'envoi.
 */
const INDICATIF = '+225';

/** Longueur d'un numéro ivoirien depuis le passage à dix chiffres (2021). */
const CHIFFRES_ATTENDUS = 10;

/**
 * Ne retient que les chiffres, en limite le nombre, et les groupe par deux —
 * la façon dont un numéro ivoirien s'écrit et se dicte.
 */
function formaterTelephone(brut: string) {
  return brut
    .replace(/\D/g, '')
    .slice(0, CHIFFRES_ATTENDUS)
    .replace(/(\d{2})(?=\d)/g, '$1 ');
}

const CYCLES = ['Primaire', 'Collège', 'Lycée'];

/** Jetons du design system du site, traduits en jetons Ant Design. */
const THEME = {
  token: {
    colorPrimary: '#34478F', // ink-600
    colorError: '#D93B4C', // danger-500
    colorSuccess: '#217A54', // craie-600
    colorText: '#171F3F', // ink-900
    colorTextPlaceholder: '#8A8FA3', // ardoise-500
    colorBorder: '#C8CCD8', // ardoise-300
    borderRadius: 8, // rounded-bouton
    fontFamily: "'Inter', system-ui, sans-serif",
    // 14 comme dans l'application : les champs en taille « large » tombent
    // alors à 16 px, la taille des champs de /app/login.
    fontSize: 14,
    // 44 px : la cible tactile retenue pour tous les boutons du site
    // (voir .btn dans global.css). Le trafic est majoritairement mobile.
    controlHeightLG: 44,
  },
  components: {
    Form: { labelColor: '#171F3F', labelFontSize: 14, verticalLabelPadding: '0 0 6px' },
    Select: { optionSelectedBg: '#EEF1FA' },
    Checkbox: { borderRadiusSM: 4 },
  },
};

/** Contexte Ant Design du formulaire : langue et thème. */
function Habillage({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider locale={frFR} theme={THEME}>
      {children}
    </ConfigProvider>
  );
}

function Coordonnees() {
  return (
    <>
      {CONTACT.telephones.map((tel, i) => (
        <span key={tel.lien}>
          {i > 0 && ' · '}
          <a href={tel.lien} className="lien">
            {tel.affichage}
          </a>
        </span>
      ))}
    </>
  );
}

export default function LeadForm({ variante, recap = [], endpoint }: Props) {
  const [form] = Form.useForm<Valeurs>();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [envoye, setEnvoye] = useState(false);
  const confirmation = useRef<HTMLDivElement>(null);

  // Horodatage d'ouverture : une soumission en moins de trois secondes n'a pas
  // été remplie par un humain. Le serveur applique le même seuil. Posé après le
  // montage — au rendu serveur, la page est générée une fois pour toutes et
  // l'horodatage serait celui du build.
  const ouvertA = useRef(0);
  useEffect(() => {
    ouvertA.current = Date.now();
  }, []);

  // Le formulaire cède la place à la confirmation : le visiteur doit voir sans
  // ambiguïté que sa demande est partie.
  useEffect(() => {
    if (envoye) confirmation.current?.focus();
  }, [envoye]);

  const envoyer = async (valeurs: Valeurs) => {
    setErreur('');
    setEnvoi(true);

    const charge: Record<string, unknown> = {
      variante,
      // Le formulaire ne demande plus de case à cocher : l'envoi vaut accord.
      // Le champ reste obligatoire côté API (schéma de /public/leads), d'où
      // cette valeur constante — à revoir si la case revient un jour.
      consentement: true,
      ouvert_a: ouvertA.current,
    };
    if (valeurs.cycles?.length) charge.cycles = valeurs.cycles;
    if (recap.length) charge.simulation = recap;
    for (const [cle, valeur] of Object.entries(valeurs)) {
      if (cle === 'cycles') continue;
      const texte = String(valeur ?? '').trim();
      // L'indicatif ne fait pas partie de la saisie : on le recolle ici, pour
      // que le destinataire reçoive un numéro composable tel quel.
      if (texte) charge[cle] = cle === 'telephone' ? `${INDICATIF} ${texte}` : texte;
    }

    try {
      const reponse = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(charge),
      });
      const corps = await reponse.json().catch(() => ({}));

      if (!reponse.ok || !corps?.success) {
        setErreur(
          corps?.message ??
            "Votre demande n'a pas pu être transmise. Merci de nous appeler directement.",
        );
        return;
      }
      setEnvoye(true);
    } catch {
      setErreur('La connexion a échoué. Vérifiez votre réseau, ou appelez-nous directement.');
    } finally {
      setEnvoi(false);
    }
  };

  if (envoye) {
    return (
      <div className="carte carte-craie" ref={confirmation} tabIndex={-1} role="status">
        <h2 className="text-display-md">Votre demande est bien partie</h2>
        <p className="mt-3 text-ardoise-600">
          Nous vous répondons sous 48 heures ouvrées. Un accusé de réception vient de vous être
          envoyé par e-mail — pensez à vérifier vos indésirables s’il n’apparaît pas.
        </p>
        <p className="mt-4 text-legende text-ardoise-500">
          Besoin d’une réponse plus rapide ? <Coordonnees />
        </p>
        <a href="/" className="btn-secondaire mt-6">
          Retour à l’accueil
        </a>
      </div>
    );
  }

  return (
    <Habillage>
      <div className="carte carte-nue">
        {recap.length > 0 && (
          <div className="mb-6 rounded-carte border border-ink-200 bg-ink-50 p-4">
            <p className="text-[0.72rem] font-bold uppercase tracking-wide text-ink-700">
              Votre simulation
            </p>
            <dl className="mt-3 space-y-1 text-legende">
              {recap.map((ligne) => (
                <div key={ligne.libelle} className="flex justify-between gap-3">
                  <dt className="text-ardoise-600">{ligne.libelle}</dt>
                  <dd className="font-mono tabular-nums text-ink-900">{ligne.valeur}</dd>
                </div>
              ))}
            </dl>
            <a href="/tarifs" className="lien mt-3 inline-block text-legende">
              Modifier ma simulation
            </a>
          </div>
        )}

        {erreur && (
          <Alert
            message={erreur}
            type="error"
            showIcon
            closable
            onClose={() => setErreur('')}
            className="mb-5"
          />
        )}

        {/* `scrollToFirstError` en `block: 'center'` : l'en-tête du site est
            collant, et un champ amené en haut de fenêtre finirait caché
            dessous. */}
        <Form
          form={form}
          layout="vertical"
          size="large"
          requiredMark
          onFinish={envoyer}
          scrollToFirstError={{ block: 'center', behavior: 'smooth' }}
          initialValues={{ creneau: 'Indifférent' }}
          className="grid gap-x-5 sm:grid-cols-2"
        >
          {/* Anti-spam sans friction : champ leurre, doublé de l'horodatage
              d'ouverture. Pas de CAPTCHA, qui dégrade la conversion et pénalise
              les connexions lentes.

              Sorti de l'écran plutôt que masqué par `display: none` : un robot
              un peu sérieux ignore ce qui n'est pas affiché, et le piège ne
              prendrait plus rien. */}
          <div className="absolute left-[-9999px]" aria-hidden="true">
            <Form.Item name="site_web" label="Ne pas remplir">
              <Input tabIndex={-1} autoComplete="off" />
            </Form.Item>
          </div>

          <Form.Item
            className="sm:col-span-2"
            name="nom"
            label="Nom et prénoms"
            rules={[{ required: true, message: 'Merci d’indiquer votre nom.' }]}
          >
            <Input prefix={<UserOutlined />} autoComplete="name" placeholder="Nom et prénoms" />
          </Form.Item>

          <Form.Item
            name="etablissement"
            label="Établissement"
            rules={[{ required: true, message: 'Merci d’indiquer votre établissement.' }]}
          >
            <Input prefix={<BankOutlined />} placeholder="Nom de l’établissement" />
          </Form.Item>

          <Form.Item
            name="ville"
            label="Ville"
            rules={[{ required: true, message: 'Merci d’indiquer votre ville.' }]}
          >
            <Input
              prefix={<EnvironmentOutlined />}
              autoComplete="address-level2"
              placeholder="Abidjan"
            />
          </Form.Item>

          {/* La saisie est normalisée à la frappe : `getValueFromEvent` filtre
              tout ce qui n'est pas un chiffre et regroupe par paires, si bien
              que la valeur du formulaire est toujours propre — coller un numéro
              copié ailleurs, avec points ou tirets, fonctionne aussi. */}
          <Form.Item
            name="telephone"
            label="Téléphone"
            getValueFromEvent={(e) => formaterTelephone(e.target.value)}
            rules={[
              { required: true, message: 'Merci d’indiquer un numéro joignable.' },
              {
                validator: (_, valeur: string) =>
                  (valeur ?? '').replace(/\D/g, '').length === CHIFFRES_ATTENDUS
                    ? Promise.resolve()
                    : Promise.reject(new Error('Un numéro ivoirien compte dix chiffres.')),
              },
            ]}
          >
            <Input
              prefix={
                <span className="flex items-center gap-2 text-ardoise-600">
                  <PhoneOutlined />
                  {INDICATIF}
                </span>
              }
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="05 95 03 18 43"
            />
          </Form.Item>

          {/* Téléphone et e-mail se partagent une ligne : sans le champ
              « Fonction », une demi-largeur isolée laisserait un trou. */}
          <Form.Item
            name="email"
            label="E-mail"
            rules={[
              { required: true, message: 'Merci d’indiquer votre e-mail.' },
              { type: 'email', message: 'Cette adresse e-mail semble incomplète.' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              autoComplete="email"
              placeholder="direction@votre-ecole.ci"
            />
          </Form.Item>

          {variante !== 'contact' && (
            <>
              <Form.Item
                className="sm:col-span-2"
                name="cycles"
                label="Cycles concernés"
                rules={[{ required: true, message: 'Merci de choisir au moins un cycle.' }]}
              >
                <Checkbox.Group options={CYCLES} />
              </Form.Item>

              <Form.Item
                name="effectif"
                label="Effectif approximatif"
                rules={[{ required: true, message: 'Merci d’indiquer un ordre de grandeur.' }]}
              >
                <Select
                  placeholder="Choisir…"
                  options={TRANCHES.map((t) => ({ value: t, label: t }))}
                />
              </Form.Item>
            </>
          )}

          {variante === 'demonstration' && (
            <Form.Item name="creneau" label="Créneau souhaité">
              <Select options={CRENEAUX.map((c) => ({ value: c, label: c }))} />
            </Form.Item>
          )}

          <Form.Item
            className="sm:col-span-2"
            name="message"
            label="Message"
            rules={
              variante === 'contact'
                ? [{ required: true, message: 'Merci d’écrire votre message.' }]
                : undefined
            }
          >
            <Input.TextArea
              rows={4}
              maxLength={4000}
              placeholder="Ce que vous souhaitez voir en priorité, vos contraintes, vos questions…"
            />
          </Form.Item>

          <Form.Item className="mb-0 sm:col-span-2">
            <div className="flex flex-wrap items-center gap-4">
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={envoi}
                icon={<SendOutlined />}
              >
                {envoi ? 'Envoi en cours…' : INTITULES[variante]}
              </Button>
              <p className="text-legende text-ardoise-500">Réponse sous 48 h ouvrées.</p>
            </div>
          </Form.Item>
        </Form>
      </div>
    </Habillage>
  );
}
