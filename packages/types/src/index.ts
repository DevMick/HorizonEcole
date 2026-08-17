/**
 * Catalogue canonique des clés de menu affectables à un rôle personnalisé.
 * Source de vérité utilisée par le backend pour maintenir automatiquement à
 * jour le rôle protégé « Administrateur » (voir apps/api/src/routes/roles.ts
 * et apps/api/src/routes/auth.ts). Reflète exactement les entrées de
 * `apps/web/src/lib/navigation/menu-catalog.ts` — toute nouvelle entrée de
 * menu doit être ajoutée aux deux endroits.
 *
 * Les clés sont réparties par cycle, parce qu'un menu n'a de sens que pour le
 * type d'école qui le pratique : une école primaire n'a pas de coefficients ni
 * de conduite trimestrielle, un collège n'a pas de compositions CP1 → CM2.
 * C'est `menuKeysForSchoolType` qui fait ce tri, et c'est lui — et non la liste
 * complète — que doivent utiliser la création d'établissement et la
 * resynchronisation du rôle protégé.
 */

/** Menus communs à tous les types d'établissement. */
export const COMMON_MENU_KEYS: string[] = [
  '/dashboard',
  '/people/students',
  '/people/parents',
  '/people/teachers',
  '/people/roles',
  '/people/users',
  '/academic/years',
  '/academic/inscriptions',
  '/academic/timetable',
  '/academic/attendance',
  '/academic/uncalled-sessions',
];

/** Pédagogie du secondaire : moyennes par coefficients, conduite, matières. */
export const SECONDARY_MENU_KEYS: string[] = [
  '/people/classrooms',
  '/academic/classes',
  '/academic/subjects',
  '/academic/assignments',
  '/academic/coefficients',
  '/academic/class-grades',
  '/academic/conduct',
  '/academic/complete-averages',
];

/** Module primaire : grilles CP1 → CM2, compositions, notes et classements. */
export const PRIMARY_MENU_KEYS: string[] = [
  '/primary/classes',
  '/primary/evaluations',
  '/primary/grades',
  '/primary/results',
];

/**
 * Finance : commune à tous les types d'établissement.
 *
 * `/finance/payments` figurait dans le sidebar et dans le catalogue de l'écran
 * des rôles, mais pas ici : cocher « Paiements » sur un rôle n'avait donc aucun
 * effet, la clé étant écartée au filtrage côté serveur. Le manque ne se voyait
 * pas tant que les administrateurs échappaient au filtre ; il se verrait
 * maintenant qu'ils y sont soumis.
 *
 * Les trois clés suivantes, à l'inverse, ne mènent à aucun écran monté
 * (`App.tsx` n'en déclare aucune route) : elles restent le temps que les rôles
 * existants ne perdent pas de lignes, mais aucun catalogue ne les propose.
 */
export const FINANCE_MENU_KEYS: string[] = [
  '/finance/payment-conditions',
  '/finance/payments',
  '/finance/fee-rates',
  '/finance/payment-schedules',
  '/finance/invoices',
];

/**
 * Menus de l'espace Propriétaire — tableaux de bord analytiques, en lecture
 * seule.
 *
 * Ils sont tenus **à l'écart** de `ALL_MENU_KEYS` et de `menuKeysForSchoolType()`
 * à dessein : ce sont les menus d'un profil, pas des menus d'administration. Les
 * verser dans la liste commune donnerait l'espace Propriétaire au rôle
 * « Administrateur », et proposerait « Pilotage » comme case à cocher pour un
 * comptable — une case qui ne mènerait nulle part, la navigation d'un compte
 * ADMIN n'ayant aucune entrée `/owner/*`.
 */
export const OWNER_HOME_MENU_KEY = '/owner';

export const OWNER_MENU_KEYS: string[] = [
  OWNER_HOME_MENU_KEY,
  '/owner/effectifs',
  '/owner/assiduite',
  '/owner/resultats',
  '/owner/enseignants',
  '/owner/finance',
];

/** Toutes les clés existantes — sert de référence, jamais d'octroi de droits. */
export const ALL_MENU_KEYS: string[] = [
  ...COMMON_MENU_KEYS,
  ...SECONDARY_MENU_KEYS,
  ...PRIMARY_MENU_KEYS,
  ...FINANCE_MENU_KEYS,
];

export type SchoolTypeValue = 'PRIMAIRE' | 'COLLEGE' | 'LYCEE';

/** Libellés français des types d'établissement, pour tout affichage. */
export const SCHOOL_TYPE_LABELS: Record<SchoolTypeValue, string> = {
  PRIMAIRE: 'École primaire',
  COLLEGE: 'Collège',
  LYCEE: 'Lycée',
};

/**
 * Description du rôle « Administrateur » d'une école, telle qu'elle s'affiche
 * dans l'écran des rôles.
 *
 * Rédigée ici et nulle part ailleurs : la création d'un établissement et le
 * script de rattrapage l'écrivaient chacun de leur côté, et toutes deux à
 * partir de la valeur brute de l'énumération — d'où le « de type lycee » sans
 * accent ni majuscule que lisaient les utilisateurs. Le libellé est mis en
 * minuscules parce qu'il suit « de type ».
 */
export function descriptionRoleAdmin(schoolType: string | null | undefined): string {
  const libelle = (
    SCHOOL_TYPE_LABELS[schoolType as SchoolTypeValue] ?? String(schoolType)
  ).toLowerCase();
  return `Accès complet aux menus d'un établissement de type ${libelle}.`;
}

/**
 * Menus pertinents pour un type d'établissement. C'est la liste que reçoit le
 * rôle « Administrateur » à la création de l'école, et la seule que l'écran des
 * rôles doit proposer : cocher « Coefficients » dans une école primaire ne
 * donnerait accès qu'à un écran sans objet.
 *
 * Un type inconnu ne donne que le tronc commun — on n'accorde pas de droits par
 * défaut sur une valeur qu'on ne comprend pas.
 */
export function menuKeysForSchoolType(schoolType: string | null | undefined): string[] {
  switch (schoolType) {
    case 'PRIMAIRE':
      return [...COMMON_MENU_KEYS, ...PRIMARY_MENU_KEYS, ...FINANCE_MENU_KEYS];
    case 'COLLEGE':
    case 'LYCEE':
      return [...COMMON_MENU_KEYS, ...SECONDARY_MENU_KEYS, ...FINANCE_MENU_KEYS];
    default:
      return [...COMMON_MENU_KEYS, ...FINANCE_MENU_KEYS];
  }
}

/**
 * Menus de l'espace Propriétaire ouverts par un type d'établissement.
 *
 * L'assiduité suit la même règle que la navigation : l'appel par séance est un
 * mécanisme du secondaire, et une école primaire pure n'a ni séances ni notes
 * de conduite. Lui affecter ce menu mènerait à un écran qui se referme sur
 * lui-même.
 */
export function ownerMenuKeysForSchoolType(schoolType: string | null | undefined): string[] {
  if (schoolType === 'PRIMAIRE') {
    return OWNER_MENU_KEYS.filter((key) => key !== '/owner/assiduite');
  }
  return [...OWNER_MENU_KEYS];
}

/**
 * Menu que le rôle « Administrateur » ne peut pas perdre.
 *
 * C'est depuis l'écran des rôles qu'on répare une coche malheureuse : l'en
 * priver enfermerait l'établissement dehors, sans aucun retour possible par
 * l'interface.
 */
export const ADMIN_LOCKED_MENU_KEY = '/people/roles';

/** Nom du rôle système protégé, créé automatiquement et affecté à tous les menus. */
export const PROTECTED_ADMIN_ROLE_NAME = 'Administrateur';

/**
 * Nom du second rôle protégé, créé lui aussi à l'ouverture de l'école.
 *
 * Il porte les menus de l'espace Propriétaire et, comme « Administrateur »,
 * c'est son nom qui fait dériver le rôle système d'un compte auquel on
 * l'affecte (cf. `apps/api/src/routes/users.ts`).
 */
export const PROTECTED_OWNER_ROLE_NAME = 'Propriétaire';

// User types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  SECRETARY = 'SECRETARY',
  ACCOUNTANT = 'ACCOUNTANT',
  PARENT = 'PARENT',
  STUDENT = 'STUDENT',
  STAFF = 'STAFF',
  /**
   * Propriétaire de l'établissement : lecture seule des tableaux de bord
   * analytiques (`/api/owner/*`). Ce n'est pas un rôle personnalisé
   * `Role`/`RoleMenu` — les clés de menu `/owner/*` ne rejoignent donc ni
   * `COMMON_MENU_KEYS` ni `menuKeysForSchoolType()`.
   */
  OWNER = 'OWNER'
}

// Student types
export interface Student {
  id: string;
  userId?: string;
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
  photoUrl?: string;
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
  class?: SchoolClass;
  studentParents?: StudentParent[];
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE'
}

export enum StudentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  GRADUATED = 'GRADUATED',
  TRANSFERRED = 'TRANSFERRED',
  EXPELLED = 'EXPELLED'
}

export enum ParentRelation {
  PERE = 'PERE',
  MERE = 'MERE',
  TUTEUR = 'TUTEUR',
  AUTRE = 'AUTRE'
}

export interface Parent {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  relation: ParentRelation;
  phone: string;
  email?: string;
  address?: string;
  profession?: string;
  workplace?: string;
  isPrimaryContact: boolean;
  isFinancialResponsible: boolean;
  createdAt: Date;
  studentParents?: StudentParent[];
}

export interface StudentParent {
  id: string;
  studentId: string;
  parentId: string;
  student?: Student;
  parent?: Parent;
}

// Class types
export interface Class {
  id: string;
  name: string;
  level: string;
  academicYear: string;
  teacherId?: string;
  capacity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Academic Year types
export interface AcademicYear {
  id: string;
  year: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Subject types
export interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
  credits: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Grade types - Using new comprehensive grade system
// See full Grade interface in Grades section below

// Financial types
export interface Fee {
  id: string;
  name: string;
  amount: number;
  type: FeeType;
  academicYearId: string;
  dueDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum FeeType {
  TUITION = 'TUITION',
  REGISTRATION = 'REGISTRATION',
  EXAM = 'EXAM',
  TRANSPORT = 'TRANSPORT',
  UNIFORM = 'UNIFORM',
  OTHER = 'OTHER'
}

export interface Payment {
  id: string;
  studentId: string;
  feeId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHECK = 'CHECK',
  MOBILE_MONEY = 'MOBILE_MONEY'
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

// Form types - keeping for compatibility, use new Student request types below

// Dashboard types
export interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalRevenue: number;
  monthlyRevenue: number;
  pendingPayments: number;
}

// Search and filter types
export interface SearchFilters {
  query?: string;
  status?: string;
  classId?: string;
  academicYearId?: string;
  page?: number;
  limit?: number;
}

// Staff types
export interface Staff {
  id: string;
  userId?: string;
  staffNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: string;
  nationality?: string;
  idCardNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  function: StaffFunction;
  specialization?: string;
  contractType: ContractType;
  hireDate: Date;
  endDate?: Date;
  baseSalary: number;
  cvUrl?: string;
  diplomaUrl?: string;
  contractUrl?: string;
  idCardUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum ContractType {
  CDI = 'CDI',
  CDD = 'CDD',
  VACATAIRE = 'VACATAIRE',
  BENEVOLAT = 'BENEVOLAT'
}

export enum StaffFunction {
  ENSEIGNANT = 'ENSEIGNANT',
  DIRECTEUR = 'DIRECTEUR',
  SURVEILLANT = 'SURVEILLANT',
  SECRETAIRE = 'SECRETAIRE',
  COMPTABLE = 'COMPTABLE',
  MAINTENANCE = 'MAINTENANCE'
}

export interface StaffSalary {
  id: string;
  staffId: string;
  month: number;
  year: number;
  baseSalary: number;
  allowances: number;
  overtimeHours: number;
  overtimeRate: number;
  bonuses: number;
  deductions: number;
  cnpsEmployee: number;
  cnpsEmployer: number;
  incomeTax: number;
  grossSalary: number;
  netSalary: number;
  paymentDate?: Date;
  status: SalaryStatus;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
  staff?: Staff;
}

export enum SalaryStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  PAID = 'PAID'
}

export interface CreateStaffRequest {
  userId?: string;
  staffNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality?: string;
  idCardNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  function: StaffFunction;
  specialization?: string;
  contractType: ContractType;
  hireDate: string;
  endDate?: string;
  baseSalary: number;
}

export interface UpdateStaffRequest extends Partial<CreateStaffRequest> {
  id: string;
  isActive?: boolean;
}

export interface CreateStaffSalaryRequest {
  staffId: string;
  month: number;
  year: number;
  baseSalary: number;
  allowances?: number;
  overtimeHours?: number;
  overtimeRate?: number;
  bonuses?: number;
  deductions?: number;
  cnpsEmployee?: number;
  cnpsEmployer?: number;
  incomeTax?: number;
  notes?: string;
}

export interface UpdateStaffSalaryRequest extends Partial<CreateStaffSalaryRequest> {
  id: string;
  status?: SalaryStatus;
  paymentDate?: string;
}

export interface StaffFilters extends SearchFilters {
  function?: StaffFunction;
  contractType?: ContractType;
  isActive?: boolean;
}

export interface SalaryFilters extends SearchFilters {
  staffId?: string;
  month?: number;
  year?: number;
  status?: SalaryStatus;
}

// Academic types
export interface AcademicYear {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  createdAt: Date;
}

export enum AcademicLevel {
  SIXIEME = 'SIXIEME',
  CINQUIEME = 'CINQUIEME',
  QUATRIEME = 'QUATRIEME',
  TROISIEME = 'TROISIEME'
}

export interface SchoolClass {
  id: string;
  academicYearId: string;
  name: string;
  level: AcademicLevel;
  maxStudents: number;
  mainTeacherId?: string;
  createdAt: Date;
  academicYear?: AcademicYear;
  mainTeacher?: Staff;
  classSubjects?: ClassSubject[];
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  coefficient: number;
  description?: string;
  createdAt: Date;
}

export interface ClassSubject {
  id: string;
  classId: string;
  subjectId: string;
  teacherId?: string;
  hoursPerWeek: number;
  class?: SchoolClass;
  subject?: Subject;
  teacher?: Staff;
}

// Request types for Academic entities
export interface CreateAcademicYearRequest {
  name: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
}

export interface UpdateAcademicYearRequest extends Partial<CreateAcademicYearRequest> {
  id: string;
}

export interface CreateClassRequest {
  academicYearId: string;
  name: string;
  level: AcademicLevel;
  maxStudents?: number;
  mainTeacherId?: string;
}

export interface UpdateClassRequest extends Partial<CreateClassRequest> {
  id: string;
}

export interface CreateSubjectRequest {
  name: string;
  code: string;
  coefficient?: number;
  description?: string;
}

export interface UpdateSubjectRequest extends Partial<CreateSubjectRequest> {
  id: string;
}

export interface CreateClassSubjectRequest {
  classId: string;
  subjectId: string;
  teacherId?: string;
  hoursPerWeek?: number;
}

export interface UpdateClassSubjectRequest extends Partial<CreateClassSubjectRequest> {
  id: string;
}

// Filter types
export interface AcademicYearFilters extends SearchFilters {
  isCurrent?: boolean;
}

export interface ClassFilters extends SearchFilters {
  academicYearId?: string;
  level?: AcademicLevel;
  mainTeacherId?: string;
}

export interface SubjectFilters extends SearchFilters {
  code?: string;
}

export interface ClassSubjectFilters extends SearchFilters {
  classId?: string;
  subjectId?: string;
  teacherId?: string;
}

// Request types for Students
export interface CreateStudentRequest {
  userId?: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
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
  enrollmentDate: string;
  parents?: CreateParentRequest[];
}

export interface UpdateStudentRequest extends Partial<CreateStudentRequest> {
  id: string;
  status?: StudentStatus;
}

export interface CreateParentRequest {
  id?: string; // If existing parent
  userId?: string;
  firstName: string;
  lastName: string;
  relation: ParentRelation;
  phone: string;
  email?: string;
  address?: string;
  profession?: string;
  workplace?: string;
  isPrimaryContact?: boolean;
  isFinancialResponsible?: boolean;
}

export interface UpdateParentRequest extends Partial<CreateParentRequest> {
  id: string;
}

// Filter types
export interface StudentFilters extends SearchFilters {
  classId?: string;
  status?: StudentStatus;
  gender?: string;
  academicYearId?: string;
}

export interface ParentFilters extends SearchFilters {
  relation?: ParentRelation;
  isPrimaryContact?: boolean;
  isFinancialResponsible?: boolean;
}

// Schedule types
export interface Schedule {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: number; // 1=Monday, 5=Friday
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  room?: string;
  academicYearId: string;
  isActive: boolean;
  createdAt: Date;
  class?: SchoolClass;
  subject?: Subject;
  teacher?: Staff;
  academicYear?: AcademicYear;
  exceptions?: ScheduleException[];
}

export interface ScheduleException {
  id: string;
  scheduleId: string;
  date: Date;
  replacementTeacherId?: string;
  isCancelled: boolean;
  reason?: string;
  createdBy?: string;
  createdAt: Date;
  schedule?: Schedule;
  replacementTeacher?: Staff;
}

export interface CreateScheduleRequest {
  classId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string;
  academicYearId: string;
}

export interface UpdateScheduleRequest extends Partial<CreateScheduleRequest> {
  id: string;
  isActive?: boolean;
}

export interface CreateScheduleExceptionRequest {
  scheduleId: string;
  date: string;
  replacementTeacherId?: string;
  isCancelled?: boolean;
  reason?: string;
}

export interface UpdateScheduleExceptionRequest extends Partial<CreateScheduleExceptionRequest> {
  id: string;
}

export interface ScheduleFilters extends SearchFilters {
  classId?: string;
  teacherId?: string;
  subjectId?: string;
  dayOfWeek?: number;
  academicYearId?: string;
  isActive?: boolean;
}

export interface ScheduleExceptionFilters extends SearchFilters {
  scheduleId?: string;
  date?: string;
  isCancelled?: boolean;
}

export interface ScheduleConflict {
  hasConflict: boolean;
  conflictType?: 'TEACHER' | 'ROOM' | 'CLASS';
  conflictingSchedule?: Schedule;
  message?: string;
}

// Grades and Report Cards types
export enum GradeType {
  DEVOIR = 'DEVOIR',
  COMPOSITION = 'COMPOSITION',
  INTERROGATION = 'INTERROGATION',
  ORAL = 'ORAL',
  PRATIQUE = 'PRATIQUE'
}

export enum Trimester {
  PREMIER = 'PREMIER',
  DEUXIEME = 'DEUXIEME',
  TROISIEME = 'TROISIEME'
}

export enum Mention {
  EXCELLENT = 'EXCELLENT',
  TRES_BIEN = 'TRES_BIEN',
  BIEN = 'BIEN',
  ASSEZ_BIEN = 'ASSEZ_BIEN',
  PASSABLE = 'PASSABLE',
  INSUFFISANT = 'INSUFFISANT'
}

export interface Grade {
  id: string;
  studentId: string;
  subjectId: string;
  teacherId?: string;
  classId: string;
  gradeType: GradeType;
  value: number;
  maxValue: number;
  coefficient: number;
  date: Date;
  trimester: Trimester;
  academicYearId: string;
  title?: string;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  student?: Student;
  subject?: Subject;
  teacher?: Staff;
  class?: SchoolClass;
  academicYear?: AcademicYear;
}

export interface ReportCard {
  id: string;
  studentId: string;
  classId: string;
  trimester: Trimester;
  academicYearId: string;
  generalAverage?: number;
  classRank?: number;
  totalStudents?: number;
  mention?: Mention;
  teacherComment?: string;
  principalComment?: string;
  absencesCount: number;
  lateCount: number;
  generatedAt: Date;
  generatedBy?: string;
  student?: Student;
  class?: SchoolClass;
  academicYear?: AcademicYear;
  subjects?: ReportCardSubject[];
}

export interface ReportCardSubject {
  id: string;
  reportCardId: string;
  subjectId: string;
  average?: number;
  coefficient?: number;
  weightedAverage?: number;
  teacherComment?: string;
  reportCard?: ReportCard;
  subject?: Subject;
}

// Request types
export interface CreateGradeRequest {
  studentId: string;
  subjectId: string;
  teacherId?: string;
  classId: string;
  gradeType: GradeType;
  value: number;
  maxValue?: number;
  coefficient?: number;
  date: string;
  trimester: Trimester;
  academicYearId: string;
  title?: string;
  notes?: string;
}

export interface UpdateGradeRequest extends Partial<CreateGradeRequest> {
  id: string;
}

export interface CreateReportCardRequest {
  studentId: string;
  classId: string;
  trimester: Trimester;
  academicYearId: string;
  teacherComment?: string;
  principalComment?: string;
  absencesCount?: number;
  lateCount?: number;
}

export interface UpdateReportCardRequest extends Partial<CreateReportCardRequest> {
  id: string;
  generalAverage?: number;
  classRank?: number;
  mention?: Mention;
}

// Filter types
export interface GradeFilters extends SearchFilters {
  studentId?: string;
  subjectId?: string;
  teacherId?: string;
  classId?: string;
  gradeType?: GradeType;
  trimester?: Trimester;
  academicYearId?: string;
}

export interface ReportCardFilters extends SearchFilters {
  studentId?: string;
  classId?: string;
  trimester?: Trimester;
  academicYearId?: string;
  mention?: Mention;
}

// Attendance types
export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED'
}

export enum TimePeriod {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON'
}

export interface Attendance {
  id: string;
  studentId: string;
  classId: string;
  date: Date;
  period: TimePeriod;
  status: AttendanceStatus;
  excuse?: string;
  isJustified: boolean;
  justificationDocumentUrl?: string;
  recordedBy?: string;
  recordedAt: Date;
  student?: Student;
  class?: SchoolClass;
}

export interface AttendanceSummary {
  id: string;
  studentId: string;
  month: number;
  year: number;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  excusedDays: number;
  attendanceRate?: number;
  createdAt: Date;
  student?: Student;
}

export interface CreateAttendanceRequest {
  studentId: string;
  classId: string;
  date: string;
  period: TimePeriod;
  status: AttendanceStatus;
  excuse?: string;
  isJustified?: boolean;
  justificationDocumentUrl?: string;
}

export interface UpdateAttendanceRequest extends Partial<CreateAttendanceRequest> {
  id: string;
}

export interface BulkAttendanceRequest {
  classId: string;
  date: string;
  period: TimePeriod;
  attendances: Array<{
    studentId: string;
    status: AttendanceStatus;
    excuse?: string;
  }>;
}

export interface AttendanceFilters extends SearchFilters {
  studentId?: string;
  classId?: string;
  date?: string;
  period?: TimePeriod;
  status?: AttendanceStatus;
  startDate?: string;
  endDate?: string;
}

export interface AttendanceSummaryFilters extends SearchFilters {
  studentId?: string;
  month?: number;
  year?: number;
}

// Discipline types
export enum IncidentSeverity {
  MINEUR = 'MINEUR',
  MOYEN = 'MOYEN',
  GRAVE = 'GRAVE',
  TRES_GRAVE = 'TRES_GRAVE'
}

export enum SanctionType {
  AVERTISSEMENT = 'AVERTISSEMENT',
  BLAME = 'BLAME',
  EXCLUSION_TEMPORAIRE = 'EXCLUSION_TEMPORAIRE',
  EXCLUSION_DEFINITIVE = 'EXCLUSION_DEFINITIVE',
  CONVOCATION_PARENTS = 'CONVOCATION_PARENTS',
  TRAVAUX_INTERET_GENERAL = 'TRAVAUX_INTERET_GENERAL'
}

export interface DisciplinaryIncident {
  id: string;
  studentId: string;
  date: Date;
  time?: string;
  location?: string;
  description: string;
  severity: IncidentSeverity;
  reportedBy?: string;
  witnesses?: string;
  createdAt: Date;
  student?: Student;
  reporter?: Staff;
  sanctions?: Sanction[];
}

export interface Sanction {
  id: string;
  incidentId: string;
  studentId: string;
  sanctionType: SanctionType;
  description: string;
  startDate: Date;
  endDate?: Date;
  isExecuted: boolean;
  executionNotes?: string;
  decidedBy?: string;
  createdAt: Date;
  incident?: DisciplinaryIncident;
  student?: Student;
}

export interface CreateDisciplinaryIncidentRequest {
  studentId: string;
  date: string;
  time?: string;
  location?: string;
  description: string;
  severity: IncidentSeverity;
  witnesses?: string;
}

export interface UpdateDisciplinaryIncidentRequest extends Partial<CreateDisciplinaryIncidentRequest> {
  id: string;
}

export interface CreateSanctionRequest {
  incidentId: string;
  studentId: string;
  sanctionType: SanctionType;
  description: string;
  startDate: string;
  endDate?: string;
}

export interface UpdateSanctionRequest extends Partial<CreateSanctionRequest> {
  id: string;
  isExecuted?: boolean;
  executionNotes?: string;
}

export interface DisciplinaryIncidentFilters extends SearchFilters {
  studentId?: string;
  severity?: IncidentSeverity;
  reportedBy?: string;
  startDate?: string;
  endDate?: string;
}

export interface SanctionFilters extends SearchFilters {
  studentId?: string;
  incidentId?: string;
  sanctionType?: SanctionType;
  isExecuted?: boolean;
  startDate?: string;
  endDate?: string;
}

// Document Management types
export enum DocumentType {
  CONTRAT = 'CONTRAT',
  DIPLOME = 'DIPLOME',
  CV = 'CV',
  PIECE_IDENTITE = 'PIECE_IDENTITE',
  ACTE_NAISSANCE = 'ACTE_NAISSANCE',
  CARNET_VACCINATION = 'CARNET_VACCINATION',
  BULLETIN = 'BULLETIN',
  RECU_PAIEMENT = 'RECU_PAIEMENT',
  FACTURE = 'FACTURE',
  AUTRE = 'AUTRE'
}

export type EntityType = 'student' | 'staff' | 'payment' | 'expense' | 'parent' | 'class' | 'other';

export interface Document {
  id: string;
  entityType: string;
  entityId: string;
  documentType: DocumentType;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  description?: string;
  uploadedBy?: string;
  uploadedAt: Date;
}

export interface CreateDocumentRequest {
  entityType: EntityType;
  entityId: string;
  documentType: DocumentType;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  description?: string;
}

export interface UpdateDocumentRequest extends Partial<CreateDocumentRequest> {
  id: string;
}

export interface DocumentFilters extends SearchFilters {
  entityType?: string;
  entityId?: string;
  documentType?: DocumentType;
  uploadedBy?: string;
  startDate?: string;
  endDate?: string;
}

// Audit Log types
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW' | 'EXPORT' | 'APPROVE' | 'REJECT' | 'OTHER';

export type ResourceType = 'student' | 'staff' | 'payment' | 'grade' | 'attendance' | 'schedule' | 'class' | 'subject' | 'user' | 'document' | 'other';

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  createdAt: Date;
  user?: User;
}

export interface CreateAuditLogRequest {
  userId?: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}

export interface AuditLogFilters extends SearchFilters {
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  success?: boolean;
  startDate?: string;
  endDate?: string;
  ipAddress?: string;
}

// Notification types
export enum NotificationType {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ALERT = 'ALERT',
  SUCCESS = 'SUCCESS',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: Date;
  link?: string;
  createdAt: Date;
  user?: User;
}

export interface CreateNotificationRequest {
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  link?: string;
}

export interface UpdateNotificationRequest extends Partial<CreateNotificationRequest> {
  id: string;
  isRead?: boolean;
  readAt?: Date;
}

export interface NotificationFilters extends SearchFilters {
  userId?: string;
  type?: NotificationType;
  channel?: NotificationChannel;
  isRead?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface BulkMarkReadRequest {
  notificationIds: string[];
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byChannel: Record<NotificationChannel, number>;
}