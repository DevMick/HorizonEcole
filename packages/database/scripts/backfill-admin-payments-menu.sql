-- Rattrapage ponctuel : « Paiements » dans le rôle « Administrateur ».
--
-- Contexte. Les menus d'un rôle ne filtraient pas le sidebar des comptes ADMIN :
-- ceux-ci voyaient tout, quoi que porte leur rôle. Depuis que l'écran des rôles
-- pilote aussi leur navigation, une clé absente du rôle disparaît de leur menu.
--
-- Or `/finance/payments` manquait dans la liste de référence côté serveur
-- (`FINANCE_MENU_KEYS`) : elle était écartée à l'enregistrement, donc absente
-- des rôles « Administrateur » créés jusqu'ici. Sans ce rattrapage, l'écran des
-- paiements sortirait du sidebar de tous les administrateurs existants.
--
-- Ce script n'ajoute que la ligne manquante ; il ne retire ni ne modifie rien,
-- et se rejoue sans effet. À passer une fois, après le déploiement.
--
--   psql "$DATABASE_URL" -f packages/database/scripts/backfill-admin-payments-menu.sql

INSERT INTO role_menus (id, role_id, menu_key)
SELECT gen_random_uuid(), r.id, '/finance/payments'
FROM roles r
WHERE r.name = 'Administrateur'
  AND r.is_protected = true
  AND NOT EXISTS (
    SELECT 1 FROM role_menus rm
    WHERE rm.role_id = r.id AND rm.menu_key = '/finance/payments'
  );
