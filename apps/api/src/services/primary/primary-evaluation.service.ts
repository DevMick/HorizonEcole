import { prisma } from '@school/database';
import {
  computeDivisor,
  defaultEvaluationDate,
  getEvaluationSubjects,
  isCm2ExamName,
  type PrimaryScale,
} from './class-profiles';
import {
  ensurePrimarySubjectCatalog,
  getClassGrid,
  provisionClass,
  resolveProfile,
} from './primary-class.service';

/**
 * Compositions du primaire.
 *
 * Une composition fige sa grille (matières + barèmes) et son diviseur à la
 * création. C'est délibéré : si l'administration retouche ensuite la grille de
 * la classe, les compositions déjà notées gardent le barème sous lequel elles
 * ont été notées, et leurs moyennes restent celles qui ont été communiquées aux
 * familles. Les compositions à venir, elles, sont recréées ou resynchronisées.
 */

/** Grille figée d'une composition, prête à être écrite en base. */
interface SnapshotSubject {
  subjectId: string;
  maxScore: number;
  sortOrder: number;
}

/**
 * Grille à appliquer à une composition : celle de la classe, augmentée de
 * l'EPS pour les examens blancs du CM2 (qui portent le diviseur à 9,5).
 */
async function buildSnapshot(
  classId: string,
  evaluationName: string,
): Promise<{ subjects: SnapshotSubject[]; divisor: number; scale: PrimaryScale; isExam: boolean }> {
  const grid = await getClassGrid(classId);

  if (!grid.settings || grid.subjects.length === 0) {
    throw new Error(
      "La grille de cette classe n'est pas encore installée — configurez-la avant de créer une composition",
    );
  }

  const schoolClass = await prisma.schoolClass.findUniqueOrThrow({
    where: { id: classId },
    select: { name: true, level: true },
  });
  const profile = resolveProfile(schoolClass);
  const scale = grid.settings.averageScale as PrimaryScale;
  const isExam = profile.level === 'CM2' && isCm2ExamName(evaluationName);

  const subjects: SnapshotSubject[] = grid.subjects.map((subject) => ({
    subjectId: subject.subjectId,
    maxScore: subject.maxScore,
    sortOrder: subject.sortOrder,
  }));

  if (isExam) {
    // L'EPS n'appartient pas à la grille ordinaire : elle n'est notée qu'aux
    // examens blancs, où elle s'ajoute en fin de tableau.
    const catalog = await ensurePrimarySubjectCatalog();
    const examSubjects = getEvaluationSubjects(profile, evaluationName);
    const extra = examSubjects.find((subject) => subject.label === 'EPS');
    const catalogSubject = extra ? catalog.get(extra.code) : null;

    if (catalogSubject && !subjects.some((subject) => subject.subjectId === catalogSubject.id)) {
      subjects.push({
        subjectId: catalogSubject.id,
        maxScore: extra!.maxScore,
        sortOrder: Math.max(...subjects.map((subject) => subject.sortOrder), 0) + 1,
      });
    }
  }

  return {
    subjects,
    divisor: computeDivisor(subjects.map((subject) => ({ maxScore: subject.maxScore })), scale),
    scale,
    isExam,
  };
}

function serialize(evaluation: any) {
  return {
    id: evaluation.id,
    academicYearId: evaluation.academic_year_id,
    classId: evaluation.class_id,
    className: evaluation.class?.name ?? null,
    name: evaluation.name,
    date: evaluation.date,
    sortOrder: evaluation.sort_order,
    isExam: evaluation.is_exam,
    isLocked: evaluation.is_locked,
    divisor: Number(evaluation.divisor),
    averageScale: evaluation.average_scale,
    publishedAt: evaluation.release?.generated_at ?? null,
    gradesCount: evaluation._count?.grades ?? undefined,
    subjects: evaluation.subjects?.map((row: any) => ({
      id: row.id,
      subjectId: row.subject_id,
      name: row.subject?.name,
      code: row.subject?.code,
      maxScore: row.max_score,
      sortOrder: row.sort_order,
    })),
  };
}

/** Compositions d'une classe (ou de toutes les classes) pour une année. */
export async function list(filters: { academicYearId: string; classId?: string }) {
  const evaluations = await prisma.primary_evaluations.findMany({
    where: {
      academic_year_id: filters.academicYearId,
      ...(filters.classId ? { class_id: filters.classId } : { class: { cycle: 'PRIMAIRE' } }),
    },
    orderBy: [{ sort_order: 'asc' }, { date: 'asc' }],
    include: {
      class: { select: { id: true, name: true } },
      release: true,
      _count: { select: { grades: true } },
    },
  });

  return evaluations.map(serialize);
}

/** Composition détaillée, avec sa grille figée. */
export async function getById(id: string) {
  const evaluation = await prisma.primary_evaluations.findUnique({
    where: { id },
    include: {
      class: { select: { id: true, name: true, level: true } },
      release: true,
      subjects: {
        orderBy: { sort_order: 'asc' },
        include: { subject: { select: { id: true, name: true, code: true } } },
      },
      _count: { select: { grades: true } },
    },
  });

  if (!evaluation) {
    throw new Error('Composition non trouvée');
  }

  return serialize(evaluation);
}

/** Crée une composition et fige sa grille. */
export async function create(data: {
  academicYearId: string;
  classId: string;
  name: string;
  date: Date;
  sortOrder?: number;
}) {
  const name = data.name.trim().toUpperCase();

  const [academicYear, duplicate] = await Promise.all([
    prisma.academicYear.findUnique({ where: { id: data.academicYearId } }),
    prisma.primary_evaluations.findFirst({
      where: { academic_year_id: data.academicYearId, class_id: data.classId, name },
    }),
  ]);

  if (!academicYear) throw new Error('Année académique non trouvée');
  if (duplicate) throw new Error('Une composition de ce nom existe déjà pour cette classe');

  const snapshot = await buildSnapshot(data.classId, name);

  const created = await prisma.primary_evaluations.create({
    data: {
      academic_year_id: data.academicYearId,
      class_id: data.classId,
      name,
      date: data.date,
      sort_order: data.sortOrder ?? 0,
      is_exam: snapshot.isExam,
      divisor: snapshot.divisor,
      average_scale: snapshot.scale,
      subjects: {
        create: snapshot.subjects.map((subject) => ({
          subject_id: subject.subjectId,
          max_score: subject.maxScore,
          sort_order: subject.sortOrder,
        })),
      },
    },
  });

  return getById(created.id);
}

/**
 * Crée les compositions prévues par le niveau (COMPOSITION 1…3 et composition
 * de passage, ou les deux examens blancs au CM2) pour une année. Idempotent :
 * les compositions déjà présentes sont conservées telles quelles.
 */
export async function provisionDefaults(classId: string, academicYearId: string) {
  const schoolClass = await prisma.schoolClass.findUnique({
    where: { id: classId },
    select: { id: true, name: true, level: true, cycle: true },
  });

  if (!schoolClass) throw new Error('Classe non trouvée');
  if (schoolClass.cycle !== 'PRIMAIRE') {
    throw new Error("Cette classe n'appartient pas au cycle primaire");
  }

  const academicYear = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
  if (!academicYear) throw new Error('Année académique non trouvée');

  const grid = await getClassGrid(classId);
  if (!grid.settings || grid.subjects.length === 0) {
    await provisionClass(classId);
  }

  const profile = resolveProfile(schoolClass);
  const existing = await prisma.primary_evaluations.findMany({
    where: { academic_year_id: academicYearId, class_id: classId },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((evaluation) => evaluation.name.toUpperCase()));

  let index = 0;
  for (const name of profile.evaluations) {
    index += 1;
    if (existingNames.has(name)) continue;

    await create({
      academicYearId,
      classId,
      name,
      date: defaultEvaluationDate(academicYear.startYear, academicYear.endYear, name),
      sortOrder: index,
    });
  }

  return list({ academicYearId, classId });
}

/** Met à jour l'intitulé, la date, l'ordre ou le verrouillage d'une composition. */
export async function update(
  id: string,
  data: { name?: string; date?: Date; sortOrder?: number; isLocked?: boolean },
) {
  const evaluation = await prisma.primary_evaluations.findUnique({ where: { id } });
  if (!evaluation) throw new Error('Composition non trouvée');

  if (data.name) {
    const name = data.name.trim().toUpperCase();
    const duplicate = await prisma.primary_evaluations.findFirst({
      where: {
        academic_year_id: evaluation.academic_year_id,
        class_id: evaluation.class_id,
        name,
        id: { not: id },
      },
    });
    if (duplicate) throw new Error('Une composition de ce nom existe déjà pour cette classe');
  }

  await prisma.primary_evaluations.update({
    where: { id },
    data: {
      ...(data.name ? { name: data.name.trim().toUpperCase() } : {}),
      ...(data.date ? { date: data.date } : {}),
      ...(data.sortOrder !== undefined ? { sort_order: data.sortOrder } : {}),
      ...(data.isLocked !== undefined ? { is_locked: data.isLocked } : {}),
    },
  });

  return getById(id);
}

/**
 * Réaligne la grille d'une composition sur celle de la classe.
 *
 * Refusé dès qu'une note existe : changer le barème sous des notes déjà saisies
 * en changerait silencieusement le sens (un 40/50 ne vaut pas un 40/30).
 */
export async function resyncGrid(id: string) {
  const evaluation = await prisma.primary_evaluations.findUnique({
    where: { id },
    include: { _count: { select: { grades: true } } },
  });
  if (!evaluation) throw new Error('Composition non trouvée');

  if (evaluation._count.grades > 0) {
    throw new Error(
      'Des notes ont déjà été saisies : supprimez-les avant de réaligner la grille sur celle de la classe',
    );
  }

  const snapshot = await buildSnapshot(evaluation.class_id, evaluation.name);

  await prisma.$transaction(async (tx) => {
    await tx.primary_evaluation_subjects.deleteMany({ where: { evaluation_id: id } });
    await tx.primary_evaluation_subjects.createMany({
      data: snapshot.subjects.map((subject) => ({
        evaluation_id: id,
        subject_id: subject.subjectId,
        max_score: subject.maxScore,
        sort_order: subject.sortOrder,
      })),
    });
    await tx.primary_evaluations.update({
      where: { id },
      data: {
        divisor: snapshot.divisor,
        average_scale: snapshot.scale,
        is_exam: snapshot.isExam,
      },
    });
  });

  return getById(id);
}

/** Supprime une composition (et, en cascade, ses notes). */
export async function remove(id: string) {
  const evaluation = await prisma.primary_evaluations.findUnique({
    where: { id },
    include: { _count: { select: { grades: true } } },
  });
  if (!evaluation) throw new Error('Composition non trouvée');

  await prisma.primary_evaluations.delete({ where: { id } });

  return { deletedGrades: evaluation._count.grades };
}

/**
 * Publie les résultats d'une composition : c'est ce geste — et lui seul — qui
 * les rend visibles aux familles.
 */
export async function publish(id: string, userId?: string) {
  const evaluation = await prisma.primary_evaluations.findUnique({ where: { id } });
  if (!evaluation) throw new Error('Composition non trouvée');

  const release = await prisma.primary_bulletin_releases.upsert({
    where: { evaluation_id: id },
    create: { evaluation_id: id, generated_by: userId ?? null },
    update: { generated_at: new Date(), generated_by: userId ?? null },
  });

  return { publishedAt: release.generated_at };
}

/** Retire la publication : les familles ne voient plus les résultats. */
export async function unpublish(id: string) {
  await prisma.primary_bulletin_releases.deleteMany({ where: { evaluation_id: id } });
  return { publishedAt: null };
}
