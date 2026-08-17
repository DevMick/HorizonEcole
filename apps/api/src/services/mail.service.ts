import nodemailer, { type Transporter } from 'nodemailer';
import config from '@school/config';

/** Rôle du titulaire du compte, tel qu'utilisé pour personnaliser l'email. */
export type AccountRole = 'STUDENT' | 'PARENT' | 'TEACHER';

interface RoleCopy {
  /** Libellé affiché dans l'email (ex. « espace élève »). */
  spaceLabel: string;
  /** Intro spécifique au rôle. */
  intro: string;
  /** Couleur d'accent (doit rester une valeur hexa fixe : pas de variables CSS en email). */
  accent: string;
  accentSoft: string;
}

const ROLE_COPY: Record<AccountRole, RoleCopy> = {
  STUDENT: {
    spaceLabel: 'espace élève',
    intro: "Un compte d'accès à votre espace élève HorizonEcole vient d'être créé.",
    accent: '#293770',
    accentSoft: '#EEF1FA',
  },
  PARENT: {
    spaceLabel: 'espace parent',
    intro: "Un compte d'accès à votre espace parent HorizonEcole vient d'être créé afin de suivre la scolarité de votre enfant.",
    accent: '#217A54',
    accentSoft: '#EAF5F0',
  },
  TEACHER: {
    spaceLabel: 'espace enseignant',
    intro: "Un compte d'accès à votre espace enseignant HorizonEcole vient d'être créé.",
    accent: '#A66C1B',
    accentSoft: '#FDF3E4',
  },
};

let transporter: Transporter | null = null;
let transporterConfigured = false;

/**
 * Construit (une seule fois) le transporteur SMTP à partir de la config
 * `@school/config`. Retourne `null` si l'hôte/identifiants ne sont pas
 * renseignés (ex. environnement de dev/test sans SMTP) : dans ce cas l'appelant
 * doit se contenter de logger et poursuivre (envoi best-effort, jamais bloquant).
 */
function getTransporter(): Transporter | null {
  if (transporterConfigured) return transporter;
  transporterConfigured = true;

  const { host, port, secure, user, password } = config.email;
  if (!host || host === 'localhost' || !user || !password) {
    console.warn('[mail] SMTP non configuré (EMAIL_HOST/EMAIL_USER/EMAIL_PASSWORD manquants) — envoi des emails désactivé.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure, // true = TLS implicite (port 465), false = STARTTLS (port 587)
    // Nodemailer nomme ce champ `pass` : passer `password` ne l'aurait pas
    // seulement fait refuser par le typage, la connexion serait partie sans
    // mot de passe et le serveur SMTP aurait rejeté l'authentification.
    auth: { user, pass: password },
  });

  return transporter;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderCredentialsEmailHtml(params: {
  firstName: string;
  lastName: string;
  role: AccountRole;
  login: string;
  password: string;
  loginUrl: string;
}): string {
  const { firstName, lastName, role, login, password, loginUrl } = params;
  const copy = ROLE_COPY[role];
  const fullName = escapeHtml(`${firstName} ${lastName}`.trim());
  const schoolName = escapeHtml(config.school.name);

  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#F3F4F8;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F8;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(23,31,63,0.08);">
            <tr>
              <td style="background:${copy.accent};padding:28px 32px;">
                <span style="color:#FFFFFF;font-size:20px;font-weight:700;letter-spacing:.2px;">HorizonEcole</span>
                <div style="color:rgba(255,255,255,.85);font-size:13px;margin-top:2px;">${schoolName}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;font-size:15px;color:#171F3F;">Bonjour ${fullName},</p>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#3C4257;">${copy.intro}</p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${copy.accentSoft};border-radius:10px;margin:0 0 24px;">
                  <tr>
                    <td style="padding:20px 24px;">
                      <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6B7280;">Identifiant de connexion</p>
                      <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#171F3F;font-family:'Consolas',monospace;">${escapeHtml(login)}</p>
                      <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6B7280;">Mot de passe provisoire</p>
                      <p style="margin:0;font-size:15px;font-weight:600;color:#171F3F;font-family:'Consolas',monospace;">${escapeHtml(password)}</p>
                    </td>
                  </tr>
                </table>

                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="border-radius:8px;background:${copy.accent};">
                      <a href="${loginUrl}" style="display:inline-block;padding:12px 28px;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">Se connecter</a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#6B7280;">
                  Pour votre sécurité, changez ce mot de passe dès votre première connexion (menu du compte → « Changer le mot de passe »).
                </p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#6B7280;">
                  Conservez ces informations confidentielles et ne les partagez avec personne.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #EEF0F4;">
                <p style="margin:0;font-size:12px;color:#9AA1B2;">${schoolName}${config.school.address ? ` · ${escapeHtml(config.school.address)}` : ''}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Envoie l'email de bienvenue avec les identifiants de connexion.
 * Best-effort : n'importe quelle erreur (SMTP injoignable, config absente,
 * timeout…) est loggée et absorbée — l'envoi d'email ne doit jamais faire
 * échouer la création du compte qui l'a déclenché.
 *
 * @returns `true` si l'email a été envoyé, `false` sinon (SMTP non configuré,
 * pas de vraie adresse email, ou échec d'envoi).
 */
export async function sendAccountCredentialsEmail(params: {
  to: string;
  firstName: string;
  lastName: string;
  role: AccountRole;
  login: string;
  password: string;
}): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) return false;

  // L'application est servie sous /app/ depuis la mise en place du site vitrine
  // (cf. apps/web/vite.config.ts et nginx/horizonecole.conf). Sans ce préfixe,
  // le lien tomberait sur la page d'accueil marketing.
  const loginUrl = `${config.app.frontendUrl.replace(/\/$/, '')}/app/login`;

  try {
    await transport.sendMail({
      from: `"${config.email.fromName}" <${config.email.user}>`,
      to: params.to,
      subject: 'Vos identifiants de connexion HorizonEcole',
      html: renderCredentialsEmailHtml({ ...params, loginUrl }),
    });
    return true;
  } catch (err) {
    console.warn(`[mail] Échec de l'envoi des identifiants à ${params.to} :`, (err as Error).message);
    return false;
  }
}

/* ───────────────────── Demandes issues du site vitrine ────────────────────── */

export type TypeDemande = 'demonstration' | 'devis' | 'contact';

export interface DemandeCommerciale {
  variante: TypeDemande;
  nom: string;
  fonction?: string;
  etablissement?: string;
  ville?: string;
  telephone: string;
  email: string;
  cycles?: string[];
  effectif?: string;
  creneau?: string;
  message?: string;
  /** Récapitulatif de simulation transmis par la page /tarifs. */
  simulation?: { libelle: string; valeur: string }[];
}

const INTITULE_DEMANDE: Record<TypeDemande, string> = {
  demonstration: 'Demande de démonstration',
  devis: 'Demande de devis',
  contact: 'Message depuis le site',
};

function ligne(libelle: string, valeur?: string | null): string {
  if (!valeur) return '';
  return `<tr>
    <td style="padding:6px 12px 6px 0;font-size:13px;color:#6B7280;white-space:nowrap;vertical-align:top;">${escapeHtml(libelle)}</td>
    <td style="padding:6px 0;font-size:14px;color:#171F3F;font-weight:600;">${escapeHtml(valeur)}</td>
  </tr>`;
}

function renderDemandeHtml(d: DemandeCommerciale): string {
  const recap = (d.simulation ?? [])
    .map((l) => ligne(l.libelle, l.valeur))
    .join('');

  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#F3F4F8;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F8;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#171F3F;padding:24px 32px;border-bottom:3px solid #CC8722;">
              <span style="color:#FFFFFF;font-size:18px;font-weight:700;">${INTITULE_DEMANDE[d.variante]}</span>
              <div style="color:#A9B4DC;font-size:13px;margin-top:2px;">Site horizonecole.com</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                ${ligne('Nom', d.nom)}
                ${ligne('Fonction', d.fonction)}
                ${ligne('Établissement', d.etablissement)}
                ${ligne('Ville', d.ville)}
                ${ligne('Téléphone', d.telephone)}
                ${ligne('E-mail', d.email)}
                ${ligne('Cycles', d.cycles?.join(', '))}
                ${ligne('Effectif', d.effectif)}
                ${ligne('Créneau souhaité', d.creneau)}
              </table>

              ${
                recap
                  ? `<div style="margin-top:24px;padding:16px 20px;background:#EEF1FA;border-radius:10px;">
                       <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#34478F;font-weight:700;">Simulation du visiteur</p>
                       <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${recap}</table>
                     </div>`
                  : ''
              }

              ${
                d.message
                  ? `<div style="margin-top:24px;">
                       <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6B7280;font-weight:700;">Message</p>
                       <p style="margin:0;font-size:14px;line-height:1.6;color:#3C4257;white-space:pre-wrap;">${escapeHtml(d.message)}</p>
                     </div>`
                  : ''
              }

              <p style="margin:24px 0 0;font-size:13px;color:#6B7280;">
                Répondre directement à cet email écrit à ${escapeHtml(d.email)}.
              </p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

/**
 * Transmet une demande du site vitrine à l'équipe commerciale.
 *
 * Contrairement à l'envoi d'identifiants, l'échec n'est PAS absorbé
 * silencieusement : si le message ne part pas, le visiteur doit en être informé
 * et pouvoir se rabattre sur le téléphone. Une demande commerciale perdue sans
 * que personne ne le sache est pire qu'une erreur affichée.
 */
export async function sendLeadEmail(demande: DemandeCommerciale): Promise<void> {
  const transport = getTransporter();
  if (!transport) throw new Error('SMTP non configuré');

  const destinataire = config.email.leadsTo;
  if (!destinataire) throw new Error('Aucun destinataire configuré (LEADS_EMAIL_TO)');

  await transport.sendMail({
    from: `"${config.email.fromName}" <${config.email.user}>`,
    to: destinataire,
    // Permet de répondre au prospect d'un simple « Répondre ».
    replyTo: `"${demande.nom}" <${demande.email}>`,
    subject: `${INTITULE_DEMANDE[demande.variante]} — ${demande.etablissement || demande.nom}`,
    html: renderDemandeHtml(demande),
  });
}

/** Accusé de réception au prospect. Best-effort : son échec ne doit rien casser. */
export async function sendLeadAcknowledgement(demande: DemandeCommerciale): Promise<void> {
  const transport = getTransporter();
  if (!transport) return;

  try {
    await transport.sendMail({
      from: `"${config.email.fromName}" <${config.email.user}>`,
      to: demande.email,
      subject: 'Nous avons bien reçu votre demande — HorizonEcole',
      html: `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#F3F4F8;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F8;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;">
          <tr><td style="background:#171F3F;padding:24px 32px;border-bottom:3px solid #CC8722;">
            <span style="color:#FFFFFF;font-size:18px;font-weight:700;">HorizonEcole</span>
          </td></tr>
          <tr><td style="padding:32px;">
            <p style="margin:0 0 16px;font-size:15px;color:#171F3F;">Bonjour ${escapeHtml(demande.nom)},</p>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#3C4257;">
              Nous avons bien reçu votre demande et nous vous répondons sous 48 heures ouvrées.
            </p>
            <p style="margin:0;font-size:14px;line-height:1.6;color:#3C4257;">
              Si votre demande est urgente, vous pouvez nous joindre directement par téléphone
              ou sur WhatsApp, du lundi au vendredi de 8 h à 18 h.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
    });
  } catch (err) {
    console.warn(`[mail] Accusé de réception non envoyé à ${demande.email} :`, (err as Error).message);
  }
}
