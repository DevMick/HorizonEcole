/**
 * Configuration ESLint de l'API.
 *
 * Elle porte surtout les garde-fous du cloisonnement multi-établissements de
 * l'espace Propriétaire : sous `routes/owner/**` et `services/owner/**`, le
 * seul client Prisma autorisé est le client cloisonné exporté par
 * `@school/database`. Toute autre voie d'accès à la base contournerait
 * l'extension qui injecte `establishment_id`, et transformerait une lecture en
 * fuite inter-établissements silencieuse.
 *
 * Ces mêmes règles sont doublées d'un test statique
 * (`src/__tests__/owner-space.test.ts`), qui s'exécute avec `pnpm --filter api
 * test` sans dépendre de la présence d'ESLint.
 */
const OWNER_FILES = ['src/routes/owner/**/*.ts', 'src/services/owner/**/*.ts'];

const NO_UNSCOPED_PRISMA =
  "L'espace Propriétaire lit exclusivement par le client `prisma` cloisonné de @school/database : " +
  '`unscopedPrisma` contourne le filtre `establishment_id` et exposerait les données des autres établissements.';

const NO_NEW_PRISMA_CLIENT =
  'Interdit sous owner/** : un client instancié à la main est dépourvu de l’extension de cloisonnement ' +
  '(cf. services/analytics.service.ts, qui commet précisément cette erreur). Importer `prisma` depuis @school/database.';

module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['dist', 'coverage', 'node_modules', '.eslintrc.cjs'],
  rules: {
    // Cette configuration existe pour les garde-fous owner/** ; elle n'a pas
    // vocation à imposer rétroactivement un style au reste de l'API. Les
    // remarques qui ne concernent pas le cloisonnement restent des
    // avertissements, pour que `pnpm --filter api lint` échoue sur ce qui
    // compte et sur rien d'autre.
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-unused-vars': 'off',
    'prefer-const': 'warn',
  },
  overrides: [
    {
      files: OWNER_FILES,
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: '@school/database',
                importNames: ['unscopedPrisma'],
                message: NO_UNSCOPED_PRISMA,
              },
              {
                name: '@prisma/client',
                importNames: ['PrismaClient'],
                message: NO_NEW_PRISMA_CLIENT,
              },
            ],
          },
        ],
        'no-restricted-syntax': [
          'error',
          {
            selector: "NewExpression[callee.name='PrismaClient']",
            message: NO_NEW_PRISMA_CLIENT,
          },
          {
            selector: "MemberExpression[object.name='unscopedPrisma']",
            message: NO_UNSCOPED_PRISMA,
          },
          {
            selector:
              "CallExpression[callee.property.name=/^(create|createMany|createManyAndReturn|update|updateMany|upsert|delete|deleteMany|executeRaw|executeRawUnsafe)$/]",
            message:
              "L'espace Propriétaire est en lecture seule : aucune écriture n'est admise sous owner/**.",
          },
        ],
      },
    },
  ],
};
