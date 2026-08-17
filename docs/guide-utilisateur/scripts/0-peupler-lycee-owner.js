/**
 * Crée le compte Propriétaire du lycée de démonstration.
 *
 * L'ouverture d'un établissement crée le rôle « Propriétaire » mais aucun
 * compte pour le porter : c'est à l'administrateur de l'attribuer depuis
 * l'écran Utilisateurs. Ce script fait la même chose, pour disposer d'un compte
 * de démonstration sans passer par l'interface.
 *
 *   node scripts/0-peupler-lycee-owner.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RACINE_DEPOT = path.resolve(__dirname, '..', '..', '..');
const bcrypt = require(path.join(RACINE_DEPOT, 'apps/api/node_modules/bcryptjs'));
const { DOSSIERS } = require('./config');

const env = fs.readFileSync(path.join(RACINE_DEPOT, '.env'), 'utf8');
for (const ligne of env.split(/\r?\n/)) {
  const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const {
  prisma,
  unscopedPrisma,
  runWithEstablishment,
} = require(path.join(RACINE_DEPOT, 'packages/database/dist/index.js'));

const CODE_ECOLE = 'lycee-moderne-de-cocody';
const EMAIL = 'proprietaire@lyceecocody.edu.ci';

function motDePasse() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  return Array.from({ length: 14 }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
}

async function main() {
  const ecole = await unscopedPrisma.establishment.findFirst({
    where: { code: CODE_ECOLE },
    select: { id: true, name: true },
  });
  if (!ecole) throw new Error(`Établissement « ${CODE_ECOLE} » introuvable.`);

  await runWithEstablishment(ecole.id, async () => {
    const existant = await prisma.user.findFirst({ where: { email: EMAIL } });
    if (existant) {
      console.log(`  Le compte ${EMAIL} existe déjà.`);
      return;
    }

    // Le rôle « Propriétaire » est créé à l'ouverture de l'établissement : on le
    // réutilise plutôt que d'en fabriquer un second, qui n'aurait pas ses menus.
    const role = await prisma.role.findFirst({ where: { name: 'Propriétaire' } });
    if (!role) throw new Error('Rôle « Propriétaire » introuvable pour cet établissement.');

    const mdp = motDePasse();
    await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: EMAIL,
        passwordHash: await bcrypt.hash(mdp, 12),
        role: 'OWNER',
        roleId: role.id,
        firstName: 'Séraphin',
        lastName: 'Kouassi',
        phone: '07 11 22 33 44',
        isActive: true,
        updatedAt: new Date(),
      },
    });

    const fichier = path.join(DOSSIERS.sessions, 'lycee-comptes.json');
    const comptes = fs.existsSync(fichier) ? JSON.parse(fs.readFileSync(fichier, 'utf8')) : {};
    comptes.proprietaire = { nom: 'Séraphin Kouassi', email: EMAIL, motDePasse: mdp };
    fs.writeFileSync(fichier, JSON.stringify(comptes, null, 2), 'utf8');

    console.log(`  Compte Propriétaire créé : Séraphin Kouassi <${EMAIL}>`);
    console.log(`  Mot de passe consigné dans sessions/lycee-comptes.json`);
  });
}

main()
  .catch((e) => {
    console.error('  ÉCHEC :', e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await unscopedPrisma.$disconnect().catch(() => {});
  });
