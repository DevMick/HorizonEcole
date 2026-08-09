-- Direction Régionale et Secteur Pédagogique de rattachement.
--
-- Ces deux mentions figurent dans l'en-tête des fiches de classement
-- officielles de l'enseignement primaire ivoirien. Elles ne concernent que les
-- écoles primaires : nulles ailleurs, d'où des colonnes facultatives plutôt
-- qu'une table séparée.
ALTER TABLE "establishments"
  ADD COLUMN "direction_regionale" VARCHAR(150),
  ADD COLUMN "secteur_pedagogique" VARCHAR(150);
