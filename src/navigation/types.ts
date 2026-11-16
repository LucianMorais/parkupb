import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { NavigatorScreenParams, useNavigation } from '@react-navigation/native';
import { PassPlan } from '../types/models';

export interface BookingDraft {
  parkId: string;
  vehicleId: string;
  start: number;
  end: number;
  spotId?: string;
}

export type AuthStackParams = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  TeamAccess: undefined;
  StaffLogin: { role: 'gestor' | 'admin' };
};

export type UtenteTabsParams = {
  Inicio: undefined;
  Reservar: undefined;
  Avencas: undefined;
  Historico: undefined;
  Perfil: undefined;
};

export type UtenteStackParams = {
  UtenteTabs: NavigatorScreenParams<UtenteTabsParams> | undefined;
  SelectPark: undefined;
  ChooseSpot: { draft: BookingDraft };
  Payment: { draft: BookingDraft };
  Booking: { id: string; justCreated?: boolean };
  EditBooking: { id: string };
  ReviewChange: { id: string; start: number; end: number; spotId: string };
  Immediate: undefined;
  Stay: { id?: string };
  BuyPass: { plan: PassPlan };
  EditProfile: undefined;
  Vehicles: undefined;
  Notifications: undefined;
};

export type GestorTabsParams = {
  Painel: undefined;
  Lugares: { floorId?: string } | undefined;
  Utentes: undefined;
  Avisos: undefined;
  PerfilGestor: undefined;
};

export type GestorStackParams = {
  GestorTabs: NavigatorScreenParams<GestorTabsParams> | undefined;
  ParkVehicles: undefined;
  Stats: undefined;
  NewNotice: undefined;
  IndividualAlert: { userId?: string };
  UserDetail: { id: string };
  EditUser: { id: string };
  Incidents: undefined;
  IncidentDetail: { bookingId: string };
  ExtraIssued: { bookingId: string };
  BlockDone: { spotId: string; affected: { name: string; plate: string; outcome: string }[] };
};

export type AdminDrawerParams = {
  VisaoGeral: undefined;
  Parques: undefined;
  Contas: { tab?: 'utentes' | 'gestores' | 'validar' } | undefined;
  Veiculos: undefined;
  HistoricoAdmin: undefined;
  Precos: undefined;
  PerfilAdmin: undefined;
};

export type AdminStackParams = {
  AdminDrawer: NavigatorScreenParams<AdminDrawerParams> | undefined;
  ParkDetail: { id: string };
  CreatePark: undefined;
  EditFloors: { id: string };
  AccountDetail: { id: string };
  CreateManager: undefined;
  VehicleDetail: { id: string };
  HistoryReset: undefined;
};

export type AuthProps<K extends keyof AuthStackParams> = NativeStackScreenProps<AuthStackParams, K>;
export type UProps<K extends keyof UtenteStackParams> = NativeStackScreenProps<UtenteStackParams, K>;
export type GProps<K extends keyof GestorStackParams> = NativeStackScreenProps<GestorStackParams, K>;
export type AProps<K extends keyof AdminStackParams> = NativeStackScreenProps<AdminStackParams, K>;

// Hooks de navegação tipados para ecrãs dentro de tabs/drawer que abrem ecrãs da stack.
export const useUNav = () => useNavigation<NativeStackNavigationProp<UtenteStackParams>>();
export const useGNav = () => useNavigation<NativeStackNavigationProp<GestorStackParams>>();
export const useANav = () => useNavigation<NativeStackNavigationProp<AdminStackParams>>();
