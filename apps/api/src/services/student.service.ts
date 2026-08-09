import { prisma, requireEstablishmentId, unscopedPrisma } from '@school/database';
import { StudentStatus, ParentRelation, UserRole } from '@prisma/client';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { sendAccountCredentialsEmail } from './mail.service';

/**
 * Génère un mot de passe aléatoire lisible (sans caractères ambigus 0/O, 1/l/I).
 * Garantit au moins une majuscule, une minuscule, un chiffre et un symbole.
 * (Même logique que TeacherService.)
 */
function generatePassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '@#$%&*';
  const all = upper + lower + digits + special;
  const bytes = randomBytes(Math.max(length, 4));
  const chars: string[] = [
    upper[bytes[0] % upper.length],
    lower[bytes[1] % lower.length],
    digits[bytes[2] % digits.length],
    special[bytes[3] % special.length],
  ];
  for (let i = 4; i < length; i++) {
    chars.push(all[bytes[i] % all.length]);
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomBytes(1)[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/**
 * Domaine interne utilisé pour fabriquer un login de secours quand l'élève n'a
 * pas d'adresse email. Ces comptes restent inactifs tant qu'aucune vraie adresse
 * n'est renseignée, donc cet email n'est jamais un moyen de connexion réel.
 */
const PLACEHOLDER_EMAIL_DOMAIN = 'comptes.souverain.local';

/** Indique si une valeur d'email est une vraie adresse (et pas un placeholder). */
function isRealEmail(email?: string | null): email is string {
  return !!email && email.trim().length > 0 && !email.endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`);
}

/**
 * Construit un login placeholder pour un élève sans adresse email.
 * Ex. « eleve-2026-0001.ecole-alpha@comptes.souverain.local ».
 *
 * Le code de l'établissement en fait partie, et ce n'est pas cosmétique : le
 * matricule n'est unique qu'au sein d'une école, alors que `users.email` l'est
 * sur toute la plateforme. Sans ce suffixe, deux écoles butteraient l'une contre
 * l'autre dès leur premier élève — au primaire, où les matricules sont générés,
 * toutes commencent à « 2026-0001 ».
 */
function placeholderEmailFor(studentNumber: string, establishmentCode: string): string {
  const slugify = (value: string) =>
    value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const student = slugify(studentNumber) || 'eleve';
  const school = slugify(establishmentCode) || 'ecole';

  return `eleve-${student}.${school}@${PLACEHOLDER_EMAIL_DOMAIN}`;
}

/**
 * Détermine si un élève relève du primaire.
 *
 * La réponse vient du type de l'établissement, et non de la classe : à la
 * création, l'élève n'en a pas encore — son affectation se décide plus tard, à
 * l'inscription, et change d'une année à l'autre. Un établissement ayant un
 * seul type, cela suffit à trancher.
 */
async function isPrimaryEnrolment(): Promise<boolean> {
  const establishment = await unscopedPrisma.establishment.findUnique({
    where: { id: requireEstablishmentId() },
    select: { schoolType: true },
  });

  return establishment?.schoolType === 'PRIMAIRE';
}

/**
 * Résout le matricule d'un nouvel élève.
 *
 * Au collège et au lycée, le matricule est un numéro officiel : il doit être
 * saisi, et son absence est une erreur — pas une invitation à en inventer un,
 * qui entrerait en conflit avec celui de l'administration scolaire. Au primaire,
 * où il n'en existe pas, l'application en attribue un.
 *
 * Le contrôle vit ici plutôt que dans le schéma de validation de la route :
 * c'est le seul endroit traversé par toutes les créations d'élève, quelle que
 * soit leur origine (formulaire, import, script).
 */
async function resolveStudentNumber(provided?: string): Promise<string> {
  const trimmed = provided?.trim();
  if (trimmed) return trimmed;

  if (!(await isPrimaryEnrolment())) {
    throw new Error('Le matricule est requis');
  }

  return generateStudentNumber();
}

/**
 * Matricule attribué par l'application, au format `AAAA-NNNN`.
 *
 * Le numéro repart de la plus haute valeur déjà attribuée dans l'école pour
 * l'année en cours ; la recherche est naturellement bornée à l'établissement
 * par le client Prisma, deux écoles peuvent donc porter le même matricule sans
 * se gêner.
 */
async function generateStudentNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${year}-`;

  const last = await prisma.student.findFirst({
    where: { studentNumber: { startsWith: prefix } },
    orderBy: { studentNumber: 'desc' },
    select: { studentNumber: true },
  });

  const lastSequence = last ? Number.parseInt(last.studentNumber.slice(prefix.length), 10) : 0;
  const next = Number.isFinite(lastSequence) ? lastSequence + 1 : 1;

  return `${prefix}${String(next).padStart(4, '0')}`;
}

export interface CreateStudentData {
  /** Absent au primaire : un matricule est alors attribué automatiquement. */
  studentNumber?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  placeOfBirth?: string;
  gender: string;
  nationality?: string;
  phone?: string;
  email?: string;
  address?: string;
  bloodType?: string;
  allergies?: string;
  medicalNotes?: string;
  classId?: string;
  enrollmentDate: Date;
  status?: StudentStatus;
  isStateAssigned?: boolean;
  attachments?: string[];
  birthCertificateUrl?: string;
  vaccinationCardUrl?: string;
  previousSchoolReportUrl?: string;
}

export interface UpdateStudentData extends Partial<CreateStudentData> {}

export interface StudentSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: StudentStatus;
  classId?: string;
  gender?: string;
  academicYearId?: string;
}

export interface StudentWithRelations {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  placeOfBirth?: string;
  gender: string;
  nationality?: string;
  phone?: string;
  email?: string;
  address?: string;
  avatarUrl?: string;
  bloodType?: string;
  allergies?: string;
  medicalNotes?: string;
  classId?: string;
  enrollmentDate: Date;
  status: StudentStatus;
  birthCertificateUrl?: string;
  vaccinationCardUrl?: string;
  previousSchoolReportUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  class?: {
    id: string;
    name: string;
  };
  studentParents?: Array<{
    id: string;
    relation: ParentRelation;
    parent: {
      id: string;
      firstName: string;
      lastName: string;
      phone: string;
      email?: string;
      relation: ParentRelation;
      isPrimaryContact: boolean;
      isFinancialResponsible: boolean;
    };
  }>;
}

export class StudentService {
  /**
   * Get students with pagination and filters
   */
  static async getStudents(params: StudentSearchParams) {
    const { page = 1, limit = 10, search, status, classId, gender, academicYearId } = params;

    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { studentNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (classId) {
      where.class = { id: classId };
    }

    if (gender) {
      where.gender = gender;
    }

    if (academicYearId) {
      where.inscriptions = { some: { academic_year_id: academicYearId } };
    }

    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          class: {
            select: {
              id: true,
              name: true,
            },
          },
          studentParents: {
            include: {
              parents: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  phone: true,
                  email: true,
                  relation: true,
                  is_primary_contact: true,
                  is_financial_responsible: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.student.count({ where }),
    ]);

    // Transform parent data from snake_case to camelCase
    const transformedStudents = students.map(student => ({
      ...student,
      studentParents: student.studentParents?.map(sp => {
        const { parents, ...rest } = sp;
        return {
          ...rest,
          parent: parents ? {
            id: parents.id,
            firstName: parents.first_name,
            lastName: parents.last_name,
            phone: parents.phone,
            email: parents.email,
            relation: parents.relation,
            isPrimaryContact: parents.is_primary_contact,
            isFinancialResponsible: parents.is_financial_responsible,
          } : null,
        };
      }) || [],
    }));

    return {
      students: transformedStudents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get student by ID with all relations
   */
  static async getStudentById(id: string): Promise<StudentWithRelations | null> {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
            role: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
          studentParents: {
            include: {
              parents: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                phone: true,
                email: true,
                relation: true,
                is_primary_contact: true,
                is_financial_responsible: true,
              },
            },
          },
        },
        grades: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            teacher: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
              },
            },
          },
          orderBy: { created_at: 'desc' },
          take: 10,
        },
        studentPayments: {
          include: {
            custom_payment_plan_installments: {
              select: {
                id: true,
                amount: true,
              },
            },
          },
          orderBy: { payment_date: 'desc' },
          take: 10,
        },
      },
    });

    if (!student) {
      return null;
    }

    // Transform parent data from snake_case to camelCase
    const transformedStudent = {
      ...student,
      studentParents: student.studentParents?.map(sp => {
        const { parents, ...rest } = sp;
        return {
          ...rest,
          parent: parents ? {
            id: parents.id,
            firstName: parents.first_name,
            lastName: parents.last_name,
            phone: parents.phone,
            email: parents.email,
            relation: parents.relation,
            isPrimaryContact: parents.is_primary_contact,
            isFinancialResponsible: parents.is_financial_responsible,
          } : null,
        };
      }) || [],
    };

    return transformedStudent as StudentWithRelations;
  }

  /**
   * Create new student
   */
  static async createStudent(data: CreateStudentData) {
    // Check if class exists if provided
    if (data.classId) {
      const classExists = await prisma.schoolClass.findUnique({
        where: { id: data.classId },
      });

      if (!classExists) {
        throw new Error('Class not found');
      }
    }

    // Exigé au collège et au lycée (numéro officiel), attribué au primaire.
    const studentNumber = await resolveStudentNumber(data.studentNumber);

    // Check if student number is unique
    // Le matricule n'est unique qu'au sein d'un etablissement.
    const existingStudent = await prisma.student.findFirst({
      where: { studentNumber },
    });

    if (existingStudent) {
      throw new Error('Student number already exists');
    }

    const studentData: any = {
      id: crypto.randomUUID(),
      ...data,
      studentNumber,
      dateOfBirth: new Date(data.dateOfBirth),
      enrollmentDate: new Date(data.enrollmentDate),
    };
    if (data.classId) {
      // Prisma refuse de recevoir à la fois la clé étrangère et la relation :
      // on retire `classId`, hérité du `...data` ci-dessus, au profit du
      // `connect` qui vérifie l'existence de la classe.
      delete studentData.classId;
      studentData.class = { connect: { id: data.classId } };
    }
    const student = await prisma.student.create({
      data: studentData,
      include: {
        class: {
          select: {
            id: true,
            name: true,
          },
        },
          studentParents: {
            include: {
              parents: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                phone: true,
                email: true,
                relation: true,
                is_primary_contact: true,
                is_financial_responsible: true,
              },
            },
          },
        },
      },
    });

    // Transform parent data from snake_case to camelCase
    const transformedStudent = {
      ...student,
      studentParents: student.studentParents?.map(sp => {
        const { parents, ...rest } = sp;
        return {
          ...rest,
          parent: parents ? {
            id: parents.id,
            firstName: parents.first_name,
            lastName: parents.last_name,
            phone: parents.phone,
            email: parents.email,
            relation: parents.relation,
            isPrimaryContact: parents.is_primary_contact,
            isFinancialResponsible: parents.is_financial_responsible,
          } : null,
        };
      }) || [],
    };

    // Création automatique du compte de connexion de l'élève (best-effort : un
    // email déjà pris ou une erreur ne doit pas bloquer la création de la fiche).
    // Le compte reste INACTIF tant qu'aucune adresse email réelle n'est fournie.
    // Au primaire, les élèves n'ont pas de compte de connexion : on ne tente rien.
    if (!(await isPrimaryEnrolment())) {
      try {
        await StudentService.createUserAccount(student.id);
        const refreshed = await prisma.student.findUnique({
          where: { id: student.id },
          select: { userId: true, generatedPassword: true },
        });
        if (refreshed) {
          (transformedStudent as any).userId = refreshed.userId;
          (transformedStudent as any).generatedPassword = refreshed.generatedPassword;
        }
      } catch (err) {
        console.warn(
          `Auto-création du compte pour l'élève ${student.id} échouée :`,
          (err as Error).message
        );
      }
    }

    return transformedStudent;
  }

  /**
   * Create a user account for a student.
   *
   * Contrairement aux enseignants, l'email d'un élève est facultatif. On crée
   * donc un compte pour tout le monde :
   *   - si l'élève a une adresse email réelle → login = cet email, compte ACTIF ;
   *   - sinon → login = un email placeholder unique dérivé du matricule, et le
   *     compte est créé INACTIF (isActive = false) : il ne pourra pas se connecter
   *     tant qu'une vraie adresse ne sera pas renseignée (voir updateStudent).
   *
   * @param studentId - The ID of the student
   * @param password - Optional password; generated automatically if omitted
   */
  static async createUserAccount(studentId: string, password?: string) {
    if (await isPrimaryEnrolment()) {
      throw new Error("Les élèves du primaire n'ont pas de compte de connexion");
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new Error('Élève non trouvé');
    }

    if (student.userId) {
      throw new Error('Cet élève a déjà un compte utilisateur');
    }

    const hasRealEmail = isRealEmail(student.email);
    let loginEmail = student.email?.trim() ?? '';

    if (!hasRealEmail) {
      const establishment = await unscopedPrisma.establishment.findUnique({
        where: { id: requireEstablishmentId() },
        select: { code: true },
      });
      loginEmail = placeholderEmailFor(student.studentNumber, establishment?.code ?? '');
    }

    const plainPassword = password && password.length > 0 ? password : generatePassword();
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    // Un compte peut déjà exister avec cet email (compte élève orphelin issu
    // d'un import ou d'une tentative antérieure, non rattaché à cette fiche).
    // S'il est du bon rôle et libre, on l'ADOPTE plutôt que d'échouer ; sinon
    // c'est un vrai conflit (email utilisé par un autre compte/personne).
    const existingUser = await prisma.user.findUnique({
      where: { email: loginEmail },
    });
    if (existingUser) {
      const linkedElsewhere = await prisma.student.findFirst({
        where: { userId: existingUser.id, NOT: { id: studentId } },
        select: { id: true },
      });
      if (existingUser.role !== UserRole.STUDENT || linkedElsewhere) {
        throw new Error('Un utilisateur avec cet email existe déjà');
      }

      const adopted = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash,
          firstName: student.firstName,
          lastName: student.lastName,
          phone: student.phone || null,
          isActive: hasRealEmail ? true : existingUser.isActive,
        },
      });

      await prisma.student.update({
        where: { id: studentId },
        data: { userId: adopted.id, generatedPassword: plainPassword },
      });

      const emailSent = hasRealEmail
        ? await sendAccountCredentialsEmail({
            to: loginEmail, firstName: student.firstName, lastName: student.lastName,
            role: 'STUDENT', login: loginEmail, password: plainPassword,
          })
        : false;

      return {
        user: {
          id: adopted.id,
          email: adopted.email,
          firstName: adopted.firstName,
          lastName: adopted.lastName,
          role: adopted.role,
          isActive: adopted.isActive,
        },
        login: loginEmail,
        password: plainPassword,
        isActive: adopted.isActive,
        adopted: true,
        emailSent,
      };
    }

    const userId = crypto.randomUUID();
    const newUser = await prisma.user.create({
      data: {
        id: userId,
        email: loginEmail,
        passwordHash,
        firstName: student.firstName,
        lastName: student.lastName,
        role: UserRole.STUDENT,
        phone: student.phone || null,
        // Le compte n'est actif que si l'élève a une vraie adresse email.
        isActive: hasRealEmail,
      },
    });

    await prisma.student.update({
      where: { id: studentId },
      data: { userId, generatedPassword: plainPassword },
    });

    const emailSent = hasRealEmail
      ? await sendAccountCredentialsEmail({
          to: loginEmail, firstName: student.firstName, lastName: student.lastName,
          role: 'STUDENT', login: loginEmail, password: plainPassword,
        })
      : false;

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        isActive: newUser.isActive,
      },
      login: loginEmail,
      password: plainPassword,
      isActive: hasRealEmail,
      emailSent,
    };
  }

  /**
   * Reset (regenerate) the password of a student's existing account.
   * @param studentId - The ID of the student
   * @param password - Optional new password; generated automatically if omitted
   */
  static async resetUserPassword(studentId: string, password?: string) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new Error('Élève non trouvé');
    }

    if (!student.userId) {
      throw new Error("Cet élève n'a pas encore de compte utilisateur");
    }

    const plainPassword = password && password.length > 0 ? password : generatePassword();
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    await prisma.user.update({
      where: { id: student.userId },
      data: { passwordHash },
    });

    await prisma.student.update({
      where: { id: studentId },
      data: { generatedPassword: plainPassword },
    });

    const user = await prisma.user.findUnique({
      where: { id: student.userId },
      select: { email: true, isActive: true },
    });

    const emailSent = user?.isActive && user.email
      ? await sendAccountCredentialsEmail({
          to: user.email, firstName: student.firstName, lastName: student.lastName,
          role: 'STUDENT', login: user.email, password: plainPassword,
        })
      : false;

    return {
      login: user?.email,
      password: plainPassword,
      isActive: user?.isActive ?? false,
      emailSent,
    };
  }

  /**
   * Réconcilie le compte de connexion d'un élève avec son adresse email courante.
   *
   * Appelé après une mise à jour de la fiche. Trois cas :
   *   1. L'élève n'a pas encore de compte → on en crée un (best-effort).
   *   2. Une vraie adresse email vient d'être renseignée sur un compte encore sur
   *      login placeholder / inactif → on remplace le login par l'email réel et on
   *      ACTIVE le compte.
   *   3. L'email réel a changé → on met à jour le login du compte.
   * On ne désactive jamais automatiquement un compte déjà actif.
   */
  static async syncUserAccountWithEmail(studentId: string) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: { select: { id: true, email: true, isActive: true } } },
    });
    if (!student) return;

    // Cas 1 : pas de compte → tenter d'en créer un.
    if (!student.userId || !student.user) {
      try {
        await StudentService.createUserAccount(studentId);
      } catch (err) {
        console.warn(
          `Sync compte élève ${studentId} : création échouée —`,
          (err as Error).message
        );
      }
      return;
    }

    // Sans vraie adresse email, rien à réconcilier (le compte reste inactif).
    if (!isRealEmail(student.email)) return;

    const desiredEmail = student.email!.trim();
    const currentEmail = student.user.email;
    const needsEmailChange = desiredEmail !== currentEmail;
    const needsActivation = !student.user.isActive;

    if (!needsEmailChange && !needsActivation) return;

    // Si l'email réel est déjà pris par un AUTRE compte, on n'écrase pas.
    if (needsEmailChange) {
      const clash = await prisma.user.findUnique({ where: { email: desiredEmail } });
      if (clash && clash.id !== student.userId) {
        console.warn(
          `Sync compte élève ${studentId} : email ${desiredEmail} déjà utilisé, activation ignorée.`
        );
        return;
      }
    }

    await prisma.user.update({
      where: { id: student.userId },
      data: { email: desiredEmail, isActive: true },
    });
  }

  /**
   * Update student
   */
  static async updateStudent(id: string, data: UpdateStudentData) {
    // Check if student exists
    const existingStudent = await prisma.student.findUnique({
      where: { id },
    });

    if (!existingStudent) {
      throw new Error('Student not found');
    }

    // Check if class exists if provided
    if (data.classId) {
      const classExists = await prisma.schoolClass.findUnique({
        where: { id: data.classId },
      });

      if (!classExists) {
        throw new Error('Class not found');
      }
    }

    // Check if student number is unique (if changed)
    if (data.studentNumber && data.studentNumber !== existingStudent.studentNumber) {
      const duplicateStudent = await prisma.student.findFirst({
        where: { studentNumber: data.studentNumber },
      });

      if (duplicateStudent) {
        throw new Error('Student number already exists');
      }
    }

    const updateData: any = { ...data };

    // Convert dates if provided
    if (data.dateOfBirth) {
      updateData.dateOfBirth = new Date(data.dateOfBirth);
    }
    if (data.enrollmentDate) {
      updateData.enrollmentDate = new Date(data.enrollmentDate);
    }

    const student = await prisma.student.update({
      where: { id },
      data: updateData,
      include: {
        class: {
          select: {
            id: true,
            name: true,
          },
        },
          studentParents: {
            include: {
              parents: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                phone: true,
                email: true,
                relation: true,
                is_primary_contact: true,
                is_financial_responsible: true,
              },
            },
          },
        },
      },
    });

    // Transform parent data from snake_case to camelCase
    const transformedStudent = {
      ...student,
      studentParents: student.studentParents?.map(sp => {
        const { parents, ...rest } = sp;
        return {
          ...rest,
          parent: parents ? {
            id: parents.id,
            firstName: parents.first_name,
            lastName: parents.last_name,
            phone: parents.phone,
            email: parents.email,
            relation: parents.relation,
            isPrimaryContact: parents.is_primary_contact,
            isFinancialResponsible: parents.is_financial_responsible,
          } : null,
        };
      }) || [],
    };

    // Réconcilie le compte de connexion avec l'email courant : création si absent,
    // activation + mise à jour du login dès qu'une vraie adresse est renseignée.
    try {
      await StudentService.syncUserAccountWithEmail(id);
      const refreshed = await prisma.student.findUnique({
        where: { id },
        select: { userId: true, generatedPassword: true },
      });
      if (refreshed) {
        (transformedStudent as any).userId = refreshed.userId;
        (transformedStudent as any).generatedPassword = refreshed.generatedPassword;
      }
    } catch (err) {
      console.warn(
        `Sync compte élève ${id} après mise à jour échouée :`,
        (err as Error).message
      );
    }

    return transformedStudent;
  }

  /**
   * Delete student
   */
  static async deleteStudent(id: string) {
    // Check if student exists
    const existingStudent = await prisma.student.findUnique({
      where: { id },
    });

    if (!existingStudent) {
      throw new Error('Student not found');
    }

    await prisma.student.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * Update student avatar
   */
  static async updateAvatar(id: string, avatarUrl: string) {
    const student = await prisma.student.update({
      where: { id },
      data: { avatarUrl },
      select: {
        id: true,
        avatarUrl: true,
      },
    });

    return student;
  }

  /**
   * Link parent to student
   */
  static async linkParent(studentId: string, parentId: string, relation: ParentRelation) {
    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    // Check if parent exists
    const parent = await prisma.parents.findUnique({
      where: { id: parentId },
    });

    if (!parent) {
      throw new Error('Parent not found');
    }

    // Check if link already exists
    const existingLink = await prisma.student_parents.findUnique({
      where: {
        student_id_parent_id: {
          student_id: studentId,
          parent_id: parentId,
        },
      },
    });

    if (existingLink) {
      throw new Error('Parent is already linked to this student');
    }

    const studentParent = await prisma.student_parents.create({
      data: {
        id: crypto.randomUUID(),
        student: { connect: { id: studentId } },
        parents: { connect: { id: parentId } },
        relation,
      },
      include: {
        parents: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            phone: true,
            email: true,
            relation: true,
            is_primary_contact: true,
            is_financial_responsible: true,
          },
        },
      },
    });

    // Transform parent data from snake_case to camelCase
    const { parents, ...rest } = studentParent;
    const transformedStudentParent = {
      ...rest,
      parent: parents ? {
        id: parents.id,
        firstName: parents.first_name,
        lastName: parents.last_name,
        phone: parents.phone,
        email: parents.email,
        relation: parents.relation,
        isPrimaryContact: parents.is_primary_contact,
        isFinancialResponsible: parents.is_financial_responsible,
      } : null,
    };

    return transformedStudentParent;
  }

  /**
   * Unlink parent from student
   */
  static async unlinkParent(studentId: string, parentId: string) {
    const deleted = await prisma.student_parents.deleteMany({
      where: {
        student_id: studentId,
        parent_id: parentId,
      },
    });

    if (deleted.count === 0) {
      throw new Error('Parent-student link not found');
    }

    return { success: true };
  }

  /**
   * Get student statistics
   */
  static async getStudentStats() {
    const [
      totalStudents,
      activeStudents,
      studentsByGender,
      studentsByClass,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.student.count({ where: { status: 'ACTIVE' } }),
      prisma.student.groupBy({
        by: ['gender'],
        _count: { gender: true },
      }),
      prisma.student.groupBy({
        by: ['classId'],
        _count: { classId: true },
        where: { classId: { not: null } },
      }),
    ]);

    return {
      totalStudents,
      activeStudents,
      studentsByGender,
      studentsByClass,
    };
  }
}
