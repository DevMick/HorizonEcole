import fs from 'node:fs';
import path from 'node:path';

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

import { sendLeadAcknowledgement, sendLeadEmail, type DemandeCommerciale } from '../services/mail.service';

/**
 * Filet de sécurité : toute demande dont l'email n'a pas pu partir est écrite
 * ici, une ligne JSON par demande.
 *
 * Sans cela, une panne SMTP — identifiants expirés, boîte pleine, fournisseur
 * injoignable — fait disparaître le prospect sans laisser de trace : ni lui ni
 * nous ne savons qu'il a écrit. Le fichier n'est pas une file d'attente, rien
 * ne le rejoue automatiquement ; c'est une trace à relire à la main le jour où
 * l'on s'aperçoit du problème.
 */
const FICHIER_SECOURS = path.join(process.cwd(), 'logs', 'leads-non-transmis.jsonl');

function consignerDemandePerdue(demande: DemandeCommerciale, motif: string) {
  try {
    fs.mkdirSync(path.dirname(FICHIER_SECOURS), { recursive: true });
    fs.appendFileSync(
      FICHIER_SECOURS,
      JSON.stringify({ recuLe: new Date().toISOString(), motif, demande }) + '\n',
      'utf8',
    );
    console.error(`[leads] Demande consignée dans ${FICHIER_SECOURS} — à traiter à la main.`);
  } catch (err) {
    // Dernier recours : au moins la demande complète reste dans les journaux.
    console.error('[leads] Écriture du fichier de secours impossible :', (err as Error).message);
    console.error('[leads] Demande perdue :', JSON.stringify(demande));
  }
}

/**
 * Réception des demandes du site vitrine (démonstration, devis, contact).
 *
 * Route PUBLIQUE par nécessité : elle est appelée par des visiteurs anonymes,
 * comme /auth/login. Trois garde-fous en tiennent lieu de protection :
 *   1. limitation de débit par IP ;
 *   2. validation stricte des champs, avec longueurs bornées ;
 *   3. pièges à robots (champ leurre + horodatage d'ouverture du formulaire).
 *
 * Elle n'écrit RIEN en base et ne touche à aucune donnée scolaire : elle se
 * contente de composer un email et de l'envoyer. C'est délibéré — une route
 * publique ne doit pas pouvoir modifier l'état de l'application.
 */
const router = Router();

/** Cinq envois par heure et par IP : large pour un humain, étroit pour un script. */
const limiteur = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Trop de demandes envoyées depuis cette connexion. Réessayez dans une heure, ou appelez-nous directement.',
  },
});

const texte = (max: number) => z.string().trim().min(1).max(max);

const schema = z.object({
  variante: z.enum(['demonstration', 'devis', 'contact']),
  nom: texte(120),
  fonction: texte(80).optional(),
  etablissement: texte(160).optional(),
  ville: texte(80).optional(),
  telephone: texte(40),
  email: z.string().trim().email().max(160),
  cycles: z.array(texte(20)).max(3).optional(),
  effectif: texte(60).optional(),
  creneau: texte(40).optional(),
  message: z.string().trim().max(4000).optional(),
  simulation: z
    .array(z.object({ libelle: texte(80), valeur: texte(80) }))
    .max(12)
    .optional(),
  consentement: z.literal(true, {
    errorMap: () => ({ message: 'Le consentement est requis.' }),
  }),
  // Pièges à robots. Le leurre accepte n'importe quelle valeur : le rejeter ici
  // renverrait une erreur de validation nommant le champ, ce qui apprendrait au
  // robot lequel éviter. Il est accepté, puis neutralisé silencieusement.
  site_web: z.string().max(200).optional(),
  ouvert_a: z.coerce.number().optional(),
});

/** Un formulaire rempli en moins de trois secondes n'a pas été rempli par un humain. */
const DELAI_MINIMAL_MS = 3000;

router.post('/leads', limiteur, async (req, res) => {
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Certains champs sont invalides ou manquants.',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const { site_web, ouvert_a, consentement: _consentement, ...demande } = parsed.data;

  // Les robots sont écartés en silence, avec une réponse de succès : leur
  // signaler la détection les inviterait simplement à contourner le piège.
  const remplitLeLeurre = Boolean(site_web);
  const tropRapide = typeof ouvert_a === 'number' && Date.now() - ouvert_a < DELAI_MINIMAL_MS;
  if (remplitLeLeurre || tropRapide) {
    console.warn('[leads] Soumission écartée (robot présumé)', { remplitLeLeurre, tropRapide });
    return res.json({ success: true });
  }

  try {
    await sendLeadEmail(demande as DemandeCommerciale);
  } catch (err) {
    // Contrairement aux emails d'identifiants, on ne masque pas l'échec : une
    // demande commerciale perdue en silence coûte un client. On la consigne
    // d'abord — pour pouvoir la rattraper — puis on le dit au visiteur, qui
    // doit savoir que personne n'a encore été prévenu.
    const motif = (err as Error).message;
    console.error('[leads] Échec de transmission :', motif);
    consignerDemandePerdue(demande as DemandeCommerciale, motif);

    return res.status(502).json({
      success: false,
      message:
        "Votre demande n'a pas pu être transmise. Merci de nous appeler ou de nous écrire directement.",
    });
  }

  // L'accusé de réception ne conditionne pas la réponse : la demande est déjà
  // arrivée chez nous, c'est le seul point qui compte pour le visiteur.
  void sendLeadAcknowledgement(demande as DemandeCommerciale);

  return res.json({ success: true });
});

export default router;
