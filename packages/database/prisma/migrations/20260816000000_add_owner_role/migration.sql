-- Profil « Propriétaire » : accès en lecture seule aux tableaux de bord
-- analytiques de son établissement.
--
-- Cette migration ne contient QUE l'ajout de la valeur d'enum, volontairement.
-- PostgreSQL n'autorise pas l'utilisation d'une valeur d'enum dans la même
-- transaction que sa création : toute écriture s'appuyant sur 'OWNER'
-- (seed, backfill, contrainte) doit vivre dans une migration ultérieure.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'OWNER';
