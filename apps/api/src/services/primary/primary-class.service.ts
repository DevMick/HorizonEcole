import { prisma } from '@school/database';
import { randomUUID } from 'crypto';
import {
  ALL_PRIMARY_SUBJECTS,
  PRIMARY_SUBJECT_LABELS,
  computeDivisor,
  getPrimaryProfile,
  normalizePrimaryLevel,
  primaryLevelRank,
  type PrimaryLevelProfile,
  type PrimaryScale,
} from './class-profiles';

/**
 * Classes du primaire : grille de matières, barèmes et seuils.
 *
 * Le principe est qu'une classe du primaire est **utilisable dès sa création**.
 * L'administration n'a rien à configurer : le niveau (CP1 → CM2) détermine la
 * grille, les barèmes, le diviseur et les seuils d'admission. Elle peut ensuite
 * les retoucher, auquel cas le diviseur est recalculé — jamais saisi.
 */

const round2 = (value: number) => Math.round(value * 100) / 100;

export interface PrimaryClassGridSubjectInput {
  subjectId: string;
  maxScore: number;
  sortOrder?: number;
}

/**
 * Garantit la présence des matières du primaire dans le catalogue global.
 * Les codes sont préfixés `P_` : aucune collision possible avec le secondaire,
 * qui possède déjà « MATH ». Renvoie l'index code → matière.
 */
export async function ensurePrimarySubjectCatalog(): Promise<Map<string, { id: string; name: string; code: string }>> {
  const codes = ALL_PRIMARY_SUBJECTS.map((subject) => subject.code);
  const existing = await prisma.subjects.findMany({
    where: { code: { in: codes } },
    select: { id: true, name: true, code: true },
  });

  const byCode = new Map(existing.map((subject) => [subject.code, subject]));
  const missing = ALL_PRIMARY_SUBJECTS.filter((subject) => !byCode.has(subject.code));

  for (const subject of missing) {
    const created = await prisma.subjects.create({
      data: {
        id: randomUUID(),
        name: PRIMARY_SUBJECT_LABELS[subject.code] ?? subject.label,
        code: subject.code,
        coefficient: 1,
        description: 'Matière du cycle primaire',
      },
      select: { id: true, name: true, code: true },
    });
    byCode.set(created.code, created);
  }

  return byCode;
}

/** Classe du primaire, ou erreur explicite si elle relève du secondaire. */
async function requirePrimaryClass(classId: string) {
  const schoolClass = await prisma.schoolClass.findUnique({
    where: { id: classId },
    select: { id: true, name: true, level: true, cycle: true },
  });

  if (!schoolClass) {
    throw new Error('Classe non trouvée');
  }
  if (schoolClass.cycle !== 'PRIMAIRE') {
    throw new Error("Cette classe n'appartient pas au cycle primaire");
  }

  return schoolClass;
}

/**
 * Profil du niveau d'une classe. Le champ `level` fait foi ; à défaut on le
 * déduit du nom (« CM2 1 » → CM2), ce qui couvre les classes générées en masse.
 */
export function resolveProfile(schoolClass: { name: string; level?: string | null }): PrimaryLevelProfile {
  const profile = getPrimaryProfile(schoolClass.level) ?? getPrimaryProfile(schoolClass.name);

  if (!profile) {
    throw new Error(
      `Niveau du primaire introuvable pour la classe « ${schoolClass.name} ». ` +
        'Attendu : CP1, CP2, CE1, CE2, CM1 ou CM2.',
    );
  }

  return profile;
}

/**
 * Installe (ou complète) la grille et les paramètres d'une classe du primaire à
 * partir de son niveau. Idempotent : relancée, elle n'écrase pas les barèmes
 * déjà ajustés par l'administration, elle ajoute seulement ce qui manque.
 */
export async function provisionClass(classId: string) {
  const schoolClass = await requirePrimaryClass(classId);
  const profile = resolveProfile(schoolClass);
  const catalog = await ensurePrimarySubjectCatalog();

  const existingRows = await prisma.primary_class_subjects.findMany({
    where: { class_id: classId },
    select: { subject_id: true },
  });
  const existingSubjectIds = new Set(existingRows.map((row) => row.subject_id));

  for (const subject of profile.subjects) {
    const catalogSubject = catalog.get(subject.code);
    if (!catalogSubject || existingSubjectIds.has(catalogSubject.id)) continue;

    await prisma.primary_class_subjects.create({
      data: {
        class_id: classId,
        subject_id: catalogSubject.id,
        max_score: subject.maxScore,
        sort_order: subject.order,
      },
    });
  }

  await recomputeSettings(classId, profile);

  return getClassGrid(classId);
}

/**
 * Recalcule le diviseur d'une classe à partir de sa grille effective, et crée
 * les paramètres s'ils manquent. Les seuils viennent du profil à la création
 * puis sont conservés : ce sont des décisions d'établissement.
 */
async function recomputeSettings(classId: string, profile: PrimaryLevelProfile) {
  const subjects = await prisma.primary_class_subjects.findMany({
    where: { class_id: classId },
    select: { max_score: true },
  });

  const existing = await prisma.primary_class_settings.findUnique({
    where: { class_id: classId },
  });

  const scale = (existing?.average_scale ?? profile.scale) as PrimaryScale;
  const divisor = computeDivisor(
    subjects.map((subject) => ({ maxScore: subject.max_score })),
    scale,
  );

  if (existing) {
    return prisma.primary_class_settings.update({
      where: { class_id: classId },
      data: { divisor },
    });
  }

  return prisma.primary_class_settings.create({
    data: {
      class_id: classId,
      divisor,
      average_scale: profile.scale,
      moyenne_admission: profile.thresholds.moyenneAdmission,
      moyenne_redoublement: profile.thresholds.moyenneRedoublement,
    },
  });
}

/** Grille complète d'une classe : matières, barèmes, diviseur et seuils. */
export async function getClassGrid(classId: string) {
  const schoolClass = await requirePrimaryClass(classId);

  const [settings, subjects] = await Promise.all([
    prisma.primary_class_settings.findUnique({ where: { class_id: classId } }),
    prisma.primary_class_subjects.findMany({
      where: { class_id: classId },
      orderBy: [{ sort_order: 'asc' }],
      include: { subject: { select: { id: true, name: true, code: true } } },
    }),
  ]);

  const profile = getPrimaryProfile(schoolClass.level) ?? getPrimaryProfile(schoolClass.name);
  const totalMaxScore = subjects.reduce((sum, row) => sum + row.max_score, 0);

  return {
    class: {
      id: schoolClass.id,
      name: schoolClass.name,
      level: normalizePrimaryLevel(schoolClass.level) ?? normalizePrimaryLevel(schoolClass.name),
      cycle: schoolClass.cycle,
    },
    profile: profile
      ? {
          level: profile.level,
          label: profile.label,
          scale: profile.scale,
          evaluations: profile.evaluations,
        }
      : null,
    settings: settings
      ? {
          divisor: Number(settings.divisor),
          averageScale: settings.average_scale,
          moyenneAdmission: Number(settings.moyenne_admission),
          moyenneRedoublement: Number(settings.moyenne_redoublement),
        }
      : null,
    totalMaxScore,
    subjects: subjects.map((row) => ({
      id: row.id,
      subjectId: row.subject.id,
      name: row.subject.name,
      code: row.subject.code,
      maxScore: row.max_score,
      sortOrder: row.sort_order,
    })),
  };
}

/**
 * Remplace la grille d'une classe (matières et barèmes) et met à jour ses
 * seuils. Le diviseur est recalculé à partir de la nouvelle grille.
 *
 * Les compositions déjà créées ne bougent pas : chacune a figé sa propre grille
 * (cf. `primary_evaluations`), pour qu'une notation en cours ne change pas de
 * barème sous les pieds de l'enseignant.
 */
export async function updateClassGrid(
  classId: string,
  data: {
    subjects: PrimaryClassGridSubjectInput[];
    averageScale?: number;
    moyenneAdmission?: number;
    moyenneRedoublement?: number;
  },
) {
  const schoolClass = await requirePrimaryClass(classId);
  const profile = resolveProfile(schoolClass);

  if (!data.subjects.length) {
    throw new Error('La grille doit comporter au moins une matière');
  }

  const invalid = data.subjects.find((subject) => !(subject.maxScore > 0));
  if (invalid) {
    throw new Error('Chaque matière doit avoir un barème strictement positif');
  }

  const uniqueSubjectIds = new Set(data.subjects.map((subject) => subject.subjectId));
  if (uniqueSubjectIds.size !== data.subjects.length) {
    throw new Error('Une matière ne peut figurer deux fois dans la grille');
  }

  const knownSubjects = await prisma.subjects.findMany({
    where: { id: { in: Array.from(uniqueSubjectIds) } },
    select: { id: true },
  });
  if (knownSubjects.length !== uniqueSubjectIds.size) {
    throw new Error('Une des matières de la grille est introuvable');
  }

  const scale = (data.averageScale ?? profile.scale) as PrimaryScale;
  if (scale !== 10 && scale !== 20) {
    throw new Error("L'échelle de la moyenne doit être 10 ou 20");
  }

  const divisor = computeDivisor(data.subjects, scale);

  await prisma.$transaction(async (tx) => {
    await tx.primary_class_subjects.deleteMany({ where: { class_id: classId } });
    await tx.primary_class_subjects.createMany({
      data: data.subjects.map((subject, index) => ({
        class_id: classId,
        subject_id: subject.subjectId,
        max_score: subject.maxScore,
        sort_order: subject.sortOrder ?? index + 1,
      })),
    });

    await tx.primary_class_settings.upsert({
      where: { class_id: classId },
      create: {
        class_id: classId,
        divisor,
        average_scale: scale,
        moyenne_admission: data.moyenneAdmission ?? profile.thresholds.moyenneAdmission,
        moyenne_redoublement: data.moyenneRedoublement ?? profile.thresholds.moyenneRedoublement,
      },
      update: {
        divisor,
        average_scale: scale,
        ...(data.moyenneAdmission !== undefined ? { moyenne_admission: data.moyenneAdmission } : {}),
        ...(data.moyenneRedoublement !== undefined
          ? { moyenne_redoublement: data.moyenneRedoublement }
          : {}),
      },
    });
  });

  return getClassGrid(classId);
}

/**
 * Réinstalle la grille des classes du primaire qui n'en ont pas.
 *
 * Le provisionnement a lieu à la création de la classe, mais rien ne garantit
 * qu'il aboutisse : une erreur passagère y laisserait une classe sans matières
 * ni seuils, donc inutilisable, sans qu'aucun mécanisme ne la rattrape. Cette
 * fonction ferme cette porte — elle ne touche que les classes incomplètes, et
 * ne réécrit jamais une grille déjà ajustée par l'administration.
 *
 * L'échec sur une classe n'interrompt pas les autres : mieux vaut cinq classes
 * réparées sur six qu'aucune.
 */
export async function healUnprovisionedClasses(): Promise<void> {
  const broken = await prisma.schoolClass.findMany({
    where: {
      cycle: 'PRIMAIRE',
      OR: [{ primary_subjects: { none: {} } }, { primary_settings: { is: null } }],
    },
    select: { id: true, name: true },
  });

  for (const schoolClass of broken) {
    try {
      await provisionClass(schoolClass.id);
    } catch (err) {
      console.warn(
        `Réparation de la grille de « ${schoolClass.name} » (${schoolClass.id}) échouée :`,
        (err as Error).message,
      );
    }
  }
}

/**
 * Liste des classes du primaire, avec l'essentiel pour le tableau de bord de
 * l'administration : effectif, grille installée, et titulaire de l'année.
 *
 * Le titulaire est le professeur principal (`class_main_teachers`) : au
 * primaire, un seul maître enseigne toutes les matières de sa classe, ce que
 * cette table exprime déjà — une classe, un enseignant, une année.
 */
export async function listClasses(filters: { academicYearId?: string } = {}) {
  // Une classe du primaire sans grille n'est pas exploitable : on la répare
  // avant de répondre. Le provisionnement d'origine (à la création de l'école)
  // peut avoir échoué pour une raison passagère, et rien d'autre ne rattraperait
  // cette classe — elle resterait indéfiniment inutilisable. Ne cible que les
  // classes réellement incomplètes : une fois réparées, c'est un no-op.
  await healUnprovisionedClasses();

  const classes = await prisma.schoolClass.findMany({
    where: { cycle: 'PRIMAIRE' },
    orderBy: { name: 'asc' },
    include: {
      primary_settings: true,
      _count: { select: { students: true, primary_subjects: true } },
      main_teachers: {
        where: filters.academicYearId ? { academic_year_id: filters.academicYearId } : undefined,
        include: {
          teacher: { select: { id: true, first_name: true, last_name: true, email: true } },
        },
      },
    },
  });

  // Ordre pédagogique CP1 → CM2, et non alphabétique : la base ne sait trier
  // que sur le nom, ce qui placerait CE1 avant CP1. À rang égal (divisions
  // « CM2 A », « CM2 B »), on retombe sur le nom.
  const ordered = [...classes].sort((a, b) => {
    const rank = primaryLevelRank(a.level ?? a.name) - primaryLevelRank(b.level ?? b.name);
    return rank !== 0 ? rank : a.name.localeCompare(b.name, 'fr');
  });

  return ordered.map((schoolClass) => {
    const mainTeacher = schoolClass.main_teachers[0]?.teacher ?? null;

    return {
      id: schoolClass.id,
      name: schoolClass.name,
      level: normalizePrimaryLevel(schoolClass.level) ?? normalizePrimaryLevel(schoolClass.name),
      studentsCount: schoolClass._count.students,
      subjectsCount: schoolClass._count.primary_subjects,
      isConfigured: Boolean(schoolClass.primary_settings) && schoolClass._count.primary_subjects > 0,
      settings: schoolClass.primary_settings
        ? {
            divisor: Number(schoolClass.primary_settings.divisor),
            averageScale: schoolClass.primary_settings.average_scale,
            moyenneAdmission: Number(schoolClass.primary_settings.moyenne_admission),
            moyenneRedoublement: Number(schoolClass.primary_settings.moyenne_redoublement),
          }
        : null,
      mainTeacher: mainTeacher
        ? {
            id: mainTeacher.id,
            firstName: mainTeacher.first_name,
            lastName: mainTeacher.last_name,
            email: mainTeacher.email,
          }
        : null,
    };
  });
}

/**
 * Désigne le titulaire d'une classe du primaire pour une année.
 *
 * Une classe n'a qu'un titulaire et un enseignant n'est titulaire que d'une
 * classe par année : les deux contraintes sont portées par la base
 * (`class_main_teachers`), on se contente ici de traduire les violations en
 * messages lisibles.
 */
export async function setMainTeacher(
  classId: string,
  academicYearId: string,
  teacherId: string | null,
) {
  await requirePrimaryClass(classId);

  const academicYear = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
  if (!academicYear) {
    throw new Error('Année académique non trouvée');
  }

  if (!teacherId) {
    await prisma.class_main_teachers.deleteMany({
      where: { class_id: classId, academic_year_id: academicYearId },
    });
    return null;
  }

  const teacher = await prisma.teachers.findUnique({ where: { id: teacherId } });
  if (!teacher) {
    throw new Error('Enseignant non trouvé');
  }

  const heldElsewhere = await prisma.class_main_teachers.findFirst({
    where: {
      teacher_id: teacherId,
      academic_year_id: academicYearId,
      class_id: { not: classId },
    },
    include: { class: { select: { name: true } } },
  });
  if (heldElsewhere) {
    throw new Error(
      `${teacher.first_name} ${teacher.last_name} est déjà titulaire de la classe ${heldElsewhere.class.name} pour cette année`,
    );
  }

  const existing = await prisma.class_main_teachers.findFirst({
    where: { class_id: classId, academic_year_id: academicYearId },
  });

  if (existing) {
    return prisma.class_main_teachers.update({
      where: { id: existing.id },
      data: { teacher_id: teacherId },
      include: { teacher: true },
    });
  }

  return prisma.class_main_teachers.create({
    data: { class_id: classId, academic_year_id: academicYearId, teacher_id: teacherId },
    include: { teacher: true },
  });
}

/**
 * Classes du primaire dont un utilisateur est titulaire — socle du contrôle
 * d'accès de l'espace enseignant : il ne voit et ne note que sa classe.
 */
export async function getTeacherClasses(userId: string, academicYearId?: string) {
  const teacher = await prisma.teachers.findFirst({
    where: { user_id: userId },
    select: { id: true, first_name: true, last_name: true },
  });

  if (!teacher) return { teacher: null, classes: [] };

  const assignments = await prisma.class_main_teachers.findMany({
    where: {
      teacher_id: teacher.id,
      ...(academicYearId ? { academic_year_id: academicYearId } : {}),
      class: { cycle: 'PRIMAIRE' },
    },
    include: {
      class: {
        select: {
          id: true,
          name: true,
          level: true,
          _count: { select: { students: true } },
        },
      },
      academicYear: { select: { id: true, name: true, isCurrent: true } },
    },
  });

  return {
    teacher: { id: teacher.id, firstName: teacher.first_name, lastName: teacher.last_name },
    classes: assignments.map((assignment) => ({
      id: assignment.class.id,
      name: assignment.class.name,
      level:
        normalizePrimaryLevel(assignment.class.level) ?? normalizePrimaryLevel(assignment.class.name),
      studentsCount: assignment.class._count.students,
      academicYear: assignment.academicYear,
    })),
  };
}

/**
 * Vrai si l'utilisateur a le droit de noter cette classe : l'administration
 * partout, l'enseignant uniquement sur la classe dont il est titulaire.
 */
export async function canRecordForClass(
  user: { id: string; role: string },
  classId: string,
): Promise<boolean> {
  if (user.role === 'ADMIN') return true;
  if (user.role !== 'TEACHER') return false;

  const teacher = await prisma.teachers.findFirst({
    where: { user_id: user.id },
    select: { id: true },
  });
  if (!teacher) return false;

  const assignment = await prisma.class_main_teachers.findFirst({
    where: { teacher_id: teacher.id, class_id: classId },
    select: { id: true },
  });

  return Boolean(assignment);
}

/** Élèves d'une classe du primaire, dans l'ordre alphabétique des documents. */
export async function getClassStudents(classId: string) {
  return prisma.student.findMany({
    where: { classId, status: 'ACTIVE' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      studentNumber: true,
      gender: true,
      dateOfBirth: true,
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });
}

/**
 * Crée une nouvelle classe du primaire pour le niveau donné.
 *
 * Règle de nommage :
 *  - 1re classe du niveau → « CP1 » (sans lettre)
 *  - 2e classe → on renomme « CP1 » en « CP1 A » puis on crée « CP1 B »
 *  - 3e, 4e… → on cherche la lettre la plus haute parmi les divisions
 *    existantes (A, B…) et on en prend la suivante (C, D…)
 *
 * Le provisionnement de la grille (matières + barèmes + seuils) est appliqué
 * immédiatement : la classe est utilisable dès sa création.
 */
export async function createPrimaryClass(level: string) {
  const normalizedLevel = normalizePrimaryLevel(level);
  if (!normalizedLevel) {
    throw new Error(`Niveau invalide : attendu CP1, CP2, CE1, CE2, CM1 ou CM2`);
  }

  const allClasses = await prisma.schoolClass.findMany({
    where: { cycle: 'PRIMAIRE' },
    select: { id: true, name: true, level: true },
  });

  const sameLevel = allClasses.filter(
    (c) => normalizePrimaryLevel(c.level ?? c.name) === normalizedLevel,
  );

  let newName: string;

  if (sameLevel.length === 0) {
    newName = normalizedLevel;
  } else {
    // Renomme la classe sans lettre-suffixe en « LEVEL A » si elle existe.
    const unsuffixed = sameLevel.find(
      (c) => c.name.trim().toUpperCase() === normalizedLevel,
    );

    if (unsuffixed) {
      await prisma.schoolClass.update({
        where: { id: unsuffixed.id },
        data: { name: `${normalizedLevel} A` },
      });
    }

    // Suffixes effectifs après l'éventuel renommage.
    const effectiveNames = sameLevel.map((c) =>
      c.id === unsuffixed?.id ? `${normalizedLevel} A` : c.name,
    );

    const letters = effectiveNames
      .map((name) => name.slice(normalizedLevel.length).trim().toUpperCase())
      .filter((s) => /^[A-Z]$/.test(s));

    if (letters.length === 0) {
      newName = `${normalizedLevel} B`;
    } else {
      const maxCode = Math.max(...letters.map((s) => s.charCodeAt(0)));
      if (maxCode >= 'Z'.charCodeAt(0)) {
        throw new Error(
          `Impossible de créer une nouvelle classe de niveau ${normalizedLevel} : toutes les divisions (A–Z) sont utilisées`,
        );
      }
      newName = `${normalizedLevel} ${String.fromCharCode(maxCode + 1)}`;
    }
  }

  const newClass = await prisma.schoolClass.create({
    data: {
      id: randomUUID(),
      name: newName,
      level: normalizedLevel,
      cycle: 'PRIMAIRE',
    },
  });

  await provisionClass(newClass.id);

  return listClasses();
}

export async function deletePrimaryClass(classId: string) {
  const target = await prisma.schoolClass.findUnique({
    where: { id: classId },
    select: { id: true, name: true, level: true, cycle: true },
  });

  if (!target || target.cycle !== 'PRIMAIRE') {
    throw new Error('Classe introuvable ou non primaire');
  }

  const normalizedLevel = normalizePrimaryLevel(target.level ?? target.name);
  if (!normalizedLevel) {
    throw new Error('Niveau de la classe non reconnu');
  }

  // Interdire la suppression de la classe par défaut (sans suffixe lettre).
  const baseName = target.name.trim().toUpperCase();
  if (baseName === normalizedLevel) {
    throw new Error(
      `La classe par défaut "${target.name}" ne peut pas être supprimée. Supprimez d'abord les divisions supplémentaires.`,
    );
  }

  await prisma.schoolClass.delete({ where: { id: classId } });

  // Après suppression, si une seule classe subsiste au même niveau avec un
  // suffixe lettre, on la renomme vers le nom de base (« CP1 A » → « CP1 »).
  const remaining = await prisma.schoolClass.findMany({
    where: { cycle: 'PRIMAIRE' },
    select: { id: true, name: true, level: true },
  });

  const sameLevel = remaining.filter(
    (c) => normalizePrimaryLevel(c.level ?? c.name) === normalizedLevel,
  );

  if (sameLevel.length === 1) {
    const sole = sameLevel[0];
    const suffix = sole.name.slice(normalizedLevel.length).trim().toUpperCase();
    if (/^[A-Z]$/.test(suffix)) {
      await prisma.schoolClass.update({
        where: { id: sole.id },
        data: { name: normalizedLevel },
      });
    }
  }

  return listClasses();
}

export { round2 };
