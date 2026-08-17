/**
 * Fabrique une session de travail **sans mot de passe**, en environnement local.
 *
 * Pourquoi ce script existe : la chaîne de captures a besoin d'être connectée
 * sous trois profils (administrateur, enseignant, parent). Plutôt que de saisir
 * des mots de passe — ce que ces scripts ne font jamais — on signe un jeton
 * d'accès avec le secret JWT du fichier .env, exactement comme le fait l'API
 * après une connexion réussie (voir api/src/services/token.service.ts). Le
 * compte visé est lu en base : aucun identifiant n'est inventé.
 *
 * À n'utiliser que sur l'environnement de développement local, dont on possède
 * déjà la base et le secret. Sur un serveur distant, revenez au script
 * interactif 1-session.js, où c'est l'utilisateur qui se connecte.
 *
 *   node scripts/1-session-locale.js admin
 *   node scripts/1-session-locale.js enseignant --email amani.kouassi@palmiers.edu.ci
 *   node scripts/1-session-locale.js parent
 */
const fs = require('fs');
const path = require('path');

const RACINE_DEPOT = path.resolve(__dirname, '..', '..', '..');
const jwt = require(path.join(RACINE_DEPOT, 'apps/api/node_modules/jsonwebtoken'));
const { PrismaClient } = require(
  path.join(RACINE_DEPOT, 'packages/database/node_modules/@prisma/client'),
);
const { BASE, DOSSIERS, assurerDossiers, fichierSession } = require('./config');

/** Lit le .env de la racine sans dépendance : deux valeurs suffisent. */
function lireEnv() {
  const brut = fs.readFileSync(path.join(RACINE_DEPOT, '.env'), 'utf8');
  const env = {};
  for (const ligne of brut.split(/\r?\n/)) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

/** Rôle système attendu pour chaque profil de guide. */
const ROLE_PAR_PROFIL = {
  admin: 'ADMIN',
  enseignant: 'TEACHER',
  parent: 'PARENT',
  eleve: 'STUDENT',
  proprietaire: 'OWNER',
};

async function main() {
  const profil = (process.argv[2] || '').toLowerCase();
  const role = ROLE_PAR_PROFIL[profil];
  if (!role) {
    console.error(`Profil attendu : ${Object.keys(ROLE_PAR_PROFIL).join(' | ')}`);
    process.exit(1);
  }
  const option = (nom) => {
    const i = process.argv.indexOf(nom);
    return i > -1 ? process.argv[i + 1] : null;
  };
  const emailVoulu = option('--email');
  // Plusieurs écoles cohabitent en base : sans ce filtre, le script prendrait le
  // premier compte du rôle demandé, qui peut appartenir à un autre
  // établissement — et la session ouvrirait la mauvaise école.
  const codeEcole = option('--ecole');
  // Nom du fichier de session, pour ne pas écraser celui d'une autre école.
  const nomSession = option('--nom') || profil;

  assurerDossiers();
  const env = lireEnv();
  if (!env.DATABASE_URL) {
    throw new Error(
      `.env incomplet : DATABASE_URL est requis. ` +
        `Clés lues dans .env : ${Object.keys(env).join(', ') || '(aucune)'}`,
    );
  }
  // Même repli que packages/config : sans JWT_SECRET dans l'environnement,
  // l'API signe avec cette valeur par défaut. On la reprend telle quelle, sinon
  // le jeton fabriqué ici serait rejeté. (En production, JWT_SECRET **doit**
  // être défini : le repli rendrait les jetons forgeables par quiconque connaît
  // le code source.)
  const secret = env.JWT_SECRET || 'secret-ultra-securise';
  if (!env.JWT_SECRET) {
    console.warn('  (JWT_SECRET absent du .env — repli sur la valeur par défaut de packages/config)');
  }

  const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });

  const utilisateur = await prisma.user.findFirst({
    where: {
      role,
      isActive: true,
      ...(emailVoulu ? { email: emailVoulu } : {}),
      ...(codeEcole ? { establishment: { code: codeEcole } } : {}),
    },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      establishment_id: true,
      establishment: { select: { name: true, schoolType: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  await prisma.$disconnect();

  if (!utilisateur) {
    throw new Error(
      `Aucun compte actif de rôle ${role}${emailVoulu ? ` avec l'adresse ${emailVoulu}` : ''}.`,
    );
  }

  // Même charge utile que l'API après une connexion réussie. Durée allongée à
  // 12 h : une campagne de captures dépasse largement l'heure du jeton normal,
  // et un jeton expiré en plein passage produirait des écrans de connexion.
  const jeton = jwt.sign(
    {
      userId: utilisateur.id,
      email: utilisateur.email,
      role: utilisateur.role,
      establishmentId: utilisateur.establishment_id,
    },
    secret,
    { expiresIn: '12h' },
  );

  // On demande son profil à l'API plutôt que de recomposer l'objet à la main :
  // le menu latéral dépend du rôle personnalisé, que seule l'API connaît.
  const reponse = await fetch('http://localhost:4001/api/auth/me', {
    headers: { Authorization: `Bearer ${jeton}` },
  });
  if (!reponse.ok) {
    throw new Error(`L'API refuse le jeton (${reponse.status}). L'API tourne-t-elle sur le port 4001 ?`);
  }
  const dto = await reponse.json();
  const profilUtilisateur = dto.data?.user || dto.data || dto;

  const origine = new URL(BASE).origin;
  const etat = {
    cookies: [],
    origins: [
      {
        origin: origine,
        localStorage: [
          { name: 'token', value: jeton },
          {
            name: 'auth-storage',
            value: JSON.stringify({
              state: { user: profilUtilisateur, token: jeton, isAuthenticated: true },
              version: 0,
            }),
          },
        ],
      },
    ],
  };

  fs.writeFileSync(fichierSession(nomSession), JSON.stringify(etat, null, 2), 'utf8');
  fs.writeFileSync(
    path.join(DOSSIERS.sessions, `${nomSession}.info.json`),
    JSON.stringify(
      {
        profil,
        compte: `${utilisateur.firstName} ${utilisateur.lastName}`,
        email: utilisateur.email,
        role: utilisateur.role,
        etablissement: utilisateur.establishment?.name,
        type: utilisateur.establishment?.schoolType,
        genereLe: new Date().toISOString(),
      },
      null,
      2,
    ),
    'utf8',
  );

  console.log(`  Session ${nomSession} : ${utilisateur.firstName} ${utilisateur.lastName} <${utilisateur.email}>`);
  console.log(`  Établissement : ${utilisateur.establishment?.name} (${utilisateur.establishment?.schoolType})`);
  console.log(`  Écrite dans sessions/${nomSession}.json — valable 12 h.`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
