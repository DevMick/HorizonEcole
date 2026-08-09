import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BadgeCheck,
  Building,
  CalendarDays,
  GraduationCap,
  Info,
  KeyRound,
  Mail,
  Phone,
  UserRound,
  Users,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { useEstablishment, SCHOOL_TYPE_LABELS } from '../../lib/hooks/useEstablishment';
import { useAcademicYears } from '../../lib/hooks/useAcademicYears';
import { useMyPrimaryClasses } from '../../lib/hooks/usePrimary';
import { Button, Card, Skeleton, StatusBadge } from '../../components/ds';
import { ChangePasswordModal } from '../../components/layout/ChangePasswordModal';
import { ListHead, PrimaryPageHead } from '../../components/primary/PrimaryTeacherShell';

dayjs.locale('fr');

/**
 * « Profil » — la fiche de l'enseignant, telle que l'école l'a enregistrée.
 *
 * Rien ne s'y modifie : l'état civil, le contrat et l'affectation relèvent de
 * l'administration. L'enseignant y vérifie ce qui le concerne et y change son mot
 * de passe, seule action qui lui appartient en propre.
 */

const CONTRACT_LABELS: Record<string, string> = {
  CDI: 'Contrat à durée indéterminée',
  CDD: 'Contrat à durée déterminée',
  VACATAIRE: 'Vacataire',
};

/** Ligne d'information : icône, libellé, valeur — le format de l'espace Famille. */
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <li className="ds-course-item">
      <span className="ds-dash-action-ic" aria-hidden>
        <Icon width={16} height={16} />
      </span>
      <span className="ds-course-main">
        <span className="text-[.74rem] text-ds-text-tertiary">{label}</span>
        <strong className="break-words">{value ?? '—'}</strong>
      </span>
    </li>
  );
}

export default function PrimaryTeacherProfilePage() {
  const { user } = useAuthStore();
  const [passwordOpen, setPasswordOpen] = useState(false);

  const { data: establishment } = useEstablishment();
  const { currentYear } = useAcademicYears();
  const { data: mine } = useMyPrimaryClasses(currentYear?.id);
  const schoolClass = mine?.classes?.[0] ?? null;

  const { data: teacher, isLoading } = useQuery({
    queryKey: ['teacher-me-info'],
    queryFn: async () => (await api.get('/teachers/me/info')).data.data,
  });

  if (isLoading) {
    return (
      <div className="animate-fade-in mx-auto max-w-4xl space-y-4">
        <Skeleton height={70} className="rounded-lg" />
        <Skeleton height={140} className="rounded-lg" />
      </div>
    );
  }

  const lastName = teacher?.lastName ?? user?.lastName ?? '';
  const firstName = teacher?.firstName ?? user?.firstName ?? '';
  const fullName = `${lastName} ${firstName}`.trim() || '—';
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();

  return (
    <div className="animate-fade-in mx-auto max-w-4xl">
      <PrimaryPageHead title="Profil" subtitle="Vos informations et votre affectation." />

      {/* Carte d'identité — pastille d'initiales, nom, badges de rôle. */}
      <Card accent className="mb-4">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <span
            className="ds-stat-medallion"
            aria-hidden
            style={{ width: 68, height: 68, fontSize: '1.35rem', fontWeight: 700 }}
          >
            {initials || '—'}
          </span>
          <div className="min-w-0 flex-1">
            <strong className="block font-display text-[1.2rem] text-ds-text">{fullName}</strong>
            <p className="mt-0.5 break-words text-sm text-ds-text-secondary">
              {teacher?.email ?? user?.email ?? '—'}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
              <StatusBadge status="role" icon={false}>
                Enseignant
              </StatusBadge>
              {schoolClass && (
                <StatusBadge status="success" icon={false}>
                  Titulaire {schoolClass.name}
                </StatusBadge>
              )}
              {teacher?.contractType && (
                <StatusBadge status="neutral" icon={false}>
                  {teacher.contractType}
                </StatusBadge>
              )}
            </div>
          </div>
          <Button
            variant="secondary"
            icon={<KeyRound aria-hidden />}
            onClick={() => setPasswordOpen(true)}
            className="w-full sm:w-auto"
          >
            Mot de passe
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card padded={false}>
          <div className="px-4 pt-4">
            <ListHead icon={UserRound} title="Mes informations" />
          </div>
          <ul className="ds-course-list px-4 pb-2">
            <InfoRow icon={Mail} label="Adresse email" value={teacher?.email ?? user?.email} />
            <InfoRow icon={Phone} label="Téléphone" value={teacher?.phone || '—'} />
            <InfoRow
              icon={BadgeCheck}
              label="Type de contrat"
              value={
                teacher?.contractType
                  ? CONTRACT_LABELS[teacher.contractType] ?? teacher.contractType
                  : '—'
              }
            />
            <InfoRow
              icon={CalendarDays}
              label="Date d'embauche"
              value={teacher?.hireDate ? dayjs(teacher.hireDate).format('DD MMMM YYYY') : '—'}
            />
          </ul>
        </Card>

        <Card padded={false}>
          <div className="px-4 pt-4">
            <ListHead icon={GraduationCap} title="Mon affectation" />
          </div>
          <ul className="ds-course-list px-4 pb-2">
            <InfoRow
              icon={GraduationCap}
              label="Classe dont je suis titulaire"
              value={
                schoolClass ? (
                  <>
                    {schoolClass.name}
                    {schoolClass.level ? (
                      <span className="font-normal text-ds-text-tertiary">
                        {' '}
                        · niveau {schoolClass.level}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="font-normal text-ds-text-tertiary">Aucune classe attribuée</span>
                )
              }
            />
            <InfoRow
              icon={Users}
              label="Effectif de ma classe"
              value={schoolClass ? `${schoolClass.studentsCount} élève(s)` : '—'}
            />
            <InfoRow
              icon={Building}
              label="Établissement"
              value={
                establishment ? (
                  <>
                    {establishment.name}
                    <span className="block text-[.74rem] font-normal text-ds-text-tertiary">
                      {SCHOOL_TYPE_LABELS[establishment.schoolType]}
                    </span>
                  </>
                ) : (
                  '—'
                )
              }
            />
            <InfoRow
              icon={CalendarDays}
              label="Année scolaire en cours"
              value={currentYear?.name ?? '—'}
            />
          </ul>
        </Card>
      </div>

      <Card accent="info" className="mt-4">
        <div className="flex items-start gap-3">
          <span className="ds-stat-medallion" aria-hidden>
            <Info width={20} height={20} />
          </span>
          <div>
            <strong className="font-display text-ds-text">Informations gérées par l'école</strong>
            <p className="mt-1 text-sm text-ds-text-secondary">
              Vos informations personnelles et votre affectation sont tenues par l'administration de
              l'établissement. Pour toute correction, adressez-vous au secrétariat.
            </p>
          </div>
        </div>
      </Card>

      <ChangePasswordModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        onSuccess={() => setPasswordOpen(false)}
      />
    </div>
  );
}
