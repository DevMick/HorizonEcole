import { Router } from 'express';
import classesRoutes from './classes';
import evaluationsRoutes from './evaluations';
import gradesRoutes from './grades';
import resultsRoutes from './results';

/**
 * Module du cycle primaire, monté sous `/api/primary`.
 *
 * Regroupé sous un préfixe unique plutôt qu'éclaté en quatre montages : le
 * primaire est un sous-système cohérent (grille, compositions, notes,
 * résultats), et son isolement rend visible qu'il ne touche à rien du
 * secondaire.
 */
const router = Router();

router.use('/classes', classesRoutes);
router.use('/evaluations', evaluationsRoutes);
router.use('/grades', gradesRoutes);
router.use('/results', resultsRoutes);

export default router;
