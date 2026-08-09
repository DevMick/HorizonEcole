/**
 * Vérification de l'étanchéité multi-établissements
 * (`pnpm --filter api verify:tenant`).
 *
 * Crée deux écoles de types différents, y place des données homonymes, puis
 * contrôle depuis le contexte de chacune qu'elle ne voit ni ne modifie celles
 * de l'autre — y compris en visant directement un identifiant connu, qui est le
 * cas que la simple injection de `where` sur les listes ne couvre pas.
 *
 * Le script échoue au premier écart et nettoie systématiquement derrière lui.
 */
import '../load-env';
import { randomUUID } from 'crypto';
import { prisma, runWithEstablishment, unscopedPrisma } from '@school/database';
import { createEstablishment } from '../services/establishment.service';

const SUFFIX = String(Date.now()).slice(-6);
let failures = 0;

function check(label: string, condition: boolean, detail = '') {
  if (condition) {
    console.log(`  OK   ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function main() {
  const created: string[] = [];

  try {
    // ---- Deux établissements de types différents ----
    const alpha = await createEstablishment({
      name: `ZZ Ecole Alpha ${SUFFIX}`,
      schoolType: 'PRIMAIRE',
      email: `alpha${SUFFIX}@test.local`,
      adminFirstName: 'Ada',
      adminLastName: 'Alpha',
      adminEmail: `admin.alpha${SUFFIX}@test.local`,
    });
    const beta = await createEstablishment({
      name: `ZZ Ecole Beta ${SUFFIX}`,
      schoolType: 'LYCEE',
      email: `beta${SUFFIX}@test.local`,
      adminFirstName: 'Bob',
      adminLastName: 'Beta',
      adminEmail: `admin.beta${SUFFIX}@test.local`,
    });
    created.push(alpha.establishment.id, beta.establishment.id);

    console.log(`\nAlpha : ${alpha.establishment.code} (${alpha.establishment.schoolType})`);
    console.log(`Beta  : ${beta.establishment.code} (${beta.establishment.schoolType})`);
    console.log(`Mot de passe admin genere : ${alpha.admin.password.length} caracteres\n`);

    check(
      'chaque etablissement recoit un code distinct',
      alpha.establishment.code !== beta.establishment.code,
    );
    check(
      'un compte ADMIN est cree pour chaque ecole',
      Boolean(alpha.admin.email && beta.admin.email),
    );

    // ---- Données homonymes de part et d'autre ----
    // Le même nom de classe dans les deux écoles : c'est le cas que l'ancienne
    // contrainte d'unicité globale rendait impossible.
    const alphaClassId = randomUUID();
    const betaClassId = randomUUID();

    await runWithEstablishment(alpha.establishment.id, async () => {
      await prisma.schoolClass.create({
        data: { id: alphaClassId, name: 'CM2 1', level: 'CM2', cycle: 'PRIMAIRE' },
      });
    });
    await runWithEstablishment(beta.establishment.id, async () => {
      await prisma.schoolClass.create({
        data: { id: betaClassId, name: 'CM2 1', level: '6ème', cycle: 'SECONDAIRE' },
      });
    });
    check('deux ecoles peuvent avoir une classe du meme nom', true);

    // ---- Lectures ----
    await runWithEstablishment(alpha.establishment.id, async () => {
      const classes = await prisma.schoolClass.findMany();
      check(
        'la liste des classes ne montre que celles de son ecole',
        classes.length === 1 && classes[0].id === alphaClassId,
        `${classes.length} classe(s) vue(s)`,
      );

      // Le cas décisif : viser directement l'identifiant de l'autre école.
      const foreign = await prisma.schoolClass.findUnique({ where: { id: betaClassId } });
      check('findUnique sur un identifiant etranger ne renvoie rien', foreign === null);

      const count = await prisma.schoolClass.count();
      check('le comptage est restreint a son ecole', count === 1, `compte = ${count}`);

      const users = await prisma.user.findMany();
      check(
        'la liste des comptes ne montre que les siens',
        users.length === 1 && users[0].email === alpha.admin.email,
        `${users.length} compte(s)`,
      );
    });

    // ---- Écritures ----
    await runWithEstablishment(alpha.establishment.id, async () => {
      let refused = false;
      try {
        await prisma.schoolClass.update({
          where: { id: betaClassId },
          data: { name: 'PIRATE' },
        });
      } catch {
        refused = true;
      }
      check('modifier une classe etrangere est refuse', refused);

      let deleteRefused = false;
      try {
        await prisma.schoolClass.delete({ where: { id: betaClassId } });
      } catch {
        deleteRefused = true;
      }
      check('supprimer une classe etrangere est refuse', deleteRefused);

      const untouched = await unscopedPrisma.schoolClass.findUnique({
        where: { id: betaClassId },
      });
      check(
        "la classe de l'autre ecole est restee intacte",
        untouched?.name === 'CM2 1',
        `nom actuel = ${untouched?.name}`,
      );
    });

    // ---- L'établissement est renseigné sans que l'appelant le fournisse ----
    await runWithEstablishment(beta.establishment.id, async () => {
      const created = await prisma.classrooms.create({
        data: { name: `Salle ${SUFFIX}` },
      });
      const raw = await unscopedPrisma.classrooms.findUnique({ where: { id: created.id } });
      check(
        "l'etablissement est injecte automatiquement a la creation",
        raw?.establishment_id === beta.establishment.id,
      );
    });

    // ---- Hors contexte : aucune restriction, mais aucun usage metier ----
    const allClasses = await unscopedPrisma.schoolClass.findMany({
      where: { id: { in: [alphaClassId, betaClassId] } },
    });
    check(
      'le client non cloisonne voit bien les deux (usage reserve a auth/scripts)',
      allClasses.length === 2,
    );

    console.log(
      failures === 0
        ? '\nOK — cloisonnement verifie.'
        : `\nECHEC — ${failures} controle(s) en defaut.`,
    );
  } finally {
    // La suppression de l'établissement cascade sur toutes ses données.
    for (const id of created) {
      await unscopedPrisma.establishment.delete({ where: { id } }).catch(() => {});
    }
    await unscopedPrisma.$disconnect();
    console.log('Donnees de test supprimees.');
  }

  if (failures > 0) process.exit(1);
}

main().catch(async (error) => {
  console.error('\nErreur :', error);
  process.exit(1);
});
