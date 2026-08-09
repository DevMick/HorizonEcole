import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

/**
 * Établissement du compte connecté.
 *
 * Sa réponse pilote ce que l'application propose : les niveaux de classes
 * ouverts et les modules affichés découlent du type d'école choisi à la
 * création. Un collège ne se voit donc jamais proposer de CP1, ni une école
 * primaire des coefficients de Terminale.
 */

export type SchoolType = 'PRIMAIRE' | 'COLLEGE' | 'LYCEE';

export interface EstablishmentLevel {
  key: string;
  label: string;
  cycle: 'PRIMAIRE' | 'SECONDAIRE';
}

export interface EstablishmentLevelGroup {
  label: string;
  levels: EstablishmentLevel[];
}

export interface Establishment {
  id: string;
  name: string;
  code: string;
  schoolType: SchoolType;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  motto: string | null;
  /**
   * Rattachement administratif de l'enseignement primaire, porté par l'en-tête
   * des fiches de classement officielles. Nul pour un collège ou un lycée.
   */
  directionRegionale: string | null;
  secteurPedagogique: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  levels: EstablishmentLevel[];
  levelGroups: EstablishmentLevelGroup[];
  modules: { primary: boolean; secondary: boolean };
}

export function useEstablishment() {
  return useQuery<Establishment>({
    queryKey: ['establishment-me'],
    // Change rarement, et conditionne le menu : on évite de le rejouer à chaque
    // navigation, sans pour autant le figer pour la session.
    staleTime: 5 * 60 * 1000,
    queryFn: async () => (await api.get('/establishments/me')).data.data,
  });
}

export const SCHOOL_TYPE_LABELS: Record<SchoolType, string> = {
  PRIMAIRE: 'École primaire',
  COLLEGE: 'Collège',
  LYCEE: 'Lycée',
};
