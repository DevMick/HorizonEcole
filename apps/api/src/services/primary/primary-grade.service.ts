import { prisma } from '@school/database';

/**
 * Saisie des notes du primaire.
 *
 * L'enseignant remplit un tableau élèves × matières pour une composition. La
 * saisie est donc naturellement massive : `saveGrades` prend le tableau entier
 * et le réconcilie en une transaction, plutôt que d'exposer un CRUD note par
 * note qui multiplierait les allers-retours et laisserait le tableau à moitié
 * enregistré si le réseau lâche en cours de route.
 */

export interface PrimaryGradeInput {
  studentId: string;
  subjectId: string;
  /** Note dans le barème de la matière, ou `null` pour effacer la saisie. */
  note?: number | null;
  isAbsent?: boolean;
}

/** Composition ouverte à la saisie, ou message expliquant pourquoi elle ne l'est pas. */
async function requireOpenEvaluation(evaluationId: string) {
  const evaluation = await prisma.primary_evaluations.findUnique({
    where: { id: evaluationId },
    include: {
      class: { select: { id: true, name: true, cycle: true } },
      subjects: { select: { subject_id: true, max_score: true } },
    },
  });

  if (!evaluation) throw new Error('Composition non trouvée');
  if (evaluation.class.cycle !== 'PRIMAIRE') {
    throw new Error("Cette composition n'appartient pas au cycle primaire");
  }
  if (evaluation.is_locked) {
    throw new Error('Cette composition est verrouillée par l’administration');
  }

  return evaluation;
}

/**
 * Tableau de saisie d'une composition : la grille figée, les élèves de la
 * classe et les notes déjà enregistrées.
 */
export async function getEntryGrid(evaluationId: string) {
  const evaluation = await prisma.primary_evaluations.findUnique({
    where: { id: evaluationId },
    include: {
      class: { select: { id: true, name: true, level: true, cycle: true } },
      academicYear: { select: { id: true, name: true } },
      release: true,
      subjects: {
        orderBy: { sort_order: 'asc' },
        include: { subject: { select: { id: true, name: true, code: true } } },
      },
    },
  });

  if (!evaluation) throw new Error('Composition non trouvée');

  const [students, grades] = await Promise.all([
    prisma.student.findMany({
      where: { classId: evaluation.class_id, status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        studentNumber: true,
        gender: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    }),
    prisma.primary_grades.findMany({
      where: { evaluation_id: evaluationId },
      select: { student_id: true, subject_id: true, note: true, is_absent: true },
    }),
  ]);

  const byStudent = new Map<string, Record<string, { note: number | null; isAbsent: boolean }>>();
  grades.forEach((grade) => {
    const row = byStudent.get(grade.student_id) ?? {};
    row[grade.subject_id] = {
      note: grade.note === null ? null : Number(grade.note),
      isAbsent: grade.is_absent,
    };
    byStudent.set(grade.student_id, row);
  });

  return {
    evaluation: {
      id: evaluation.id,
      name: evaluation.name,
      date: evaluation.date,
      isExam: evaluation.is_exam,
      isLocked: evaluation.is_locked,
      divisor: Number(evaluation.divisor),
      averageScale: evaluation.average_scale,
      publishedAt: evaluation.release?.generated_at ?? null,
    },
    class: evaluation.class,
    academicYear: evaluation.academicYear,
    subjects: evaluation.subjects.map((row) => ({
      subjectId: row.subject_id,
      name: row.subject.name,
      code: row.subject.code,
      maxScore: row.max_score,
      sortOrder: row.sort_order,
    })),
    students: students.map((student) => ({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      fullName: `${student.lastName} ${student.firstName}`.trim(),
      studentNumber: student.studentNumber,
      gender: student.gender,
      grades: byStudent.get(student.id) ?? {},
    })),
  };
}

/**
 * Enregistre un lot de notes.
 *
 * Chaque entrée est validée contre le barème *figé de la composition*, pas
 * contre celui de la classe : c'est ce qui garantit qu'une grille retouchée en
 * cours d'année ne rende pas invalides des notes déjà saisies.
 */
export async function saveGrades(
  evaluationId: string,
  entries: PrimaryGradeInput[],
  userId?: string,
) {
  const evaluation = await requireOpenEvaluation(evaluationId);

  if (entries.length === 0) {
    return { saved: 0, cleared: 0 };
  }

  const maxScoreBySubject = new Map(
    evaluation.subjects.map((subject) => [subject.subject_id, subject.max_score]),
  );

  const studentIds = Array.from(new Set(entries.map((entry) => entry.studentId)));
  const students = await prisma.student.findMany({
    where: { id: { in: studentIds }, classId: evaluation.class_id },
    select: { id: true },
  });
  const validStudentIds = new Set(students.map((student) => student.id));

  entries.forEach((entry) => {
    if (!validStudentIds.has(entry.studentId)) {
      throw new Error("Un des élèves n'appartient pas à cette classe");
    }

    const maxScore = maxScoreBySubject.get(entry.subjectId);
    if (maxScore === undefined) {
      throw new Error("Une des matières ne figure pas dans la grille de cette composition");
    }

    if (entry.note !== null && entry.note !== undefined) {
      if (!Number.isFinite(entry.note) || entry.note < 0 || entry.note > maxScore) {
        throw new Error(`Chaque note doit être comprise entre 0 et son barème (ici ${maxScore})`);
      }
    }
  });

  let saved = 0;
  let cleared = 0;

  await prisma.$transaction(async (tx) => {
    for (const entry of entries) {
      const isAbsent = entry.isAbsent ?? false;
      const note = isAbsent ? null : entry.note ?? null;

      // Une case vide et non absente n'est pas un zéro : on supprime la ligne
      // pour que le tableau distingue « pas encore saisi » de « 0 ».
      if (note === null && !isAbsent) {
        const deleted = await tx.primary_grades.deleteMany({
          where: {
            evaluation_id: evaluationId,
            student_id: entry.studentId,
            subject_id: entry.subjectId,
          },
        });
        cleared += deleted.count;
        continue;
      }

      await tx.primary_grades.upsert({
        where: {
          evaluation_id_student_id_subject_id: {
            evaluation_id: evaluationId,
            student_id: entry.studentId,
            subject_id: entry.subjectId,
          },
        },
        create: {
          evaluation_id: evaluationId,
          student_id: entry.studentId,
          subject_id: entry.subjectId,
          note,
          is_absent: isAbsent,
          recorded_by: userId ?? null,
        },
        update: {
          note,
          is_absent: isAbsent,
          recorded_by: userId ?? null,
        },
      });
      saved += 1;
    }
  });

  return { saved, cleared };
}

/**
 * Marque un élève absent (ou de nouveau présent) sur toute la composition.
 *
 * L'absence porte sur la composition entière, pas sur une matière : c'est ainsi
 * qu'elle est constatée au primaire, où toutes les épreuves se déroulent dans
 * la même session. Repasser en « présent » efface les lignes d'absence pour
 * rouvrir la saisie sur des cases vierges.
 */
export async function setStudentAbsence(
  evaluationId: string,
  studentId: string,
  isAbsent: boolean,
  userId?: string,
) {
  const evaluation = await requireOpenEvaluation(evaluationId);

  const student = await prisma.student.findFirst({
    where: { id: studentId, classId: evaluation.class_id },
    select: { id: true },
  });
  if (!student) throw new Error("Cet élève n'appartient pas à cette classe");

  if (!isAbsent) {
    await prisma.primary_grades.deleteMany({
      where: { evaluation_id: evaluationId, student_id: studentId, is_absent: true },
    });
    return { isAbsent: false };
  }

  await prisma.$transaction(async (tx) => {
    for (const subject of evaluation.subjects) {
      await tx.primary_grades.upsert({
        where: {
          evaluation_id_student_id_subject_id: {
            evaluation_id: evaluationId,
            student_id: studentId,
            subject_id: subject.subject_id,
          },
        },
        create: {
          evaluation_id: evaluationId,
          student_id: studentId,
          subject_id: subject.subject_id,
          note: null,
          is_absent: true,
          recorded_by: userId ?? null,
        },
        update: { note: null, is_absent: true, recorded_by: userId ?? null },
      });
    }
  });

  return { isAbsent: true };
}
