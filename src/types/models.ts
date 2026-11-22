// Estruturas de dados locais da aplicação.
// Nesta etapa vivem em memória (com persistência em AsyncStorage);
// na etapa Backend passam a coleções do Firestore com a mesma forma.

export type Role = 'utente' | 'gestor' | 'admin';
export type AccountStatus = 'ativa' | 'por_validar' | 'suspensa';
export type VehicleType = 'automovel' | 'motociclo';

export interface User {
  id: string;
  role: Role;
  name: string;
  email: string;
  phone: string;
  password: string;
  nif?: string;
  photoUri?: string;
  status: AccountStatus;
  parkIds: string[]; // parques atribuídos (gestor) ou vazio
  createdAt: number;
}

export interface Vehicle {
  id: string;
  ownerId: string | null; // null = viatura por identificar
  plate: string;
  type: VehicleType;
  model: string;
  archived?: boolean; // removido pelo utente (mantém o histórico)
}

export type SpotKind = 'normal' | 'mobilidade' | 'motociclo';

export interface SpotBlock {
  reason: string;
  note?: string;
  from: number;
  to: number;
  by: string;
}

export interface Spot {
  id: string;
  code: string; // A01
  floorId: string;
  kind: SpotKind;
  active: boolean;
  block?: SpotBlock;
}

export interface Floor {
  id: string;
  name: string; // Piso -1
  zone: string; // A
  spots: Spot[];
}

export interface Prices {
  carHour: number; // cêntimos
  motoHour: number;
  pass24: number;
  passDay: number;
}

export interface Park {
  id: string;
  name: string;
  address: string;
  area: string;
  lat: number;
  lng: number;
  open24: boolean;
  openTime: string; // HH:MM
  closeTime: string;
  active: boolean;
  prices: Prices;
  floors: Floor[];
}

export type BookingType = 'antecipada' | 'imediata' | 'avenca';
export type BookingStatus = 'confirmada' | 'em_curso' | 'concluida' | 'cancelada';
export type PaymentMethod = 'MB WAY' | 'Cartão' | 'Multibanco';

export interface Booking {
  id: string;
  code: string;
  parkId: string;
  spotId: string;
  userId: string | null;
  vehicleId: string;
  type: BookingType;
  start: number; // início previsto
  end: number; // saída prevista (imediata: estimativa)
  checkIn?: number;
  checkOut?: number;
  status: BookingStatus;
  amount: number; // cêntimos pagos (ou a pagar na saída, entrada imediata)
  paid: boolean;
  method?: PaymentMethod;
  refunded?: number;
  passId?: string;
  createdAt: number;
}

export type PassPlan = '24h' | 'diurna';

export interface Pass {
  id: string;
  code: string;
  userId: string;
  parkId: string;
  vehicleId: string;
  plan: PassPlan;
  from: number;
  to: number;
  price: number;
}

export type NoticeKind = 'informacao' | 'alerta' | 'urgente';
export type Audience = 'todos' | 'reserva_hoje' | 'avenca' | 'piso';

export interface Notice {
  id: string;
  parkId: string;
  title: string;
  message: string;
  kind: NoticeKind;
  audience: Audience;
  floorId?: string;
  publishAt: number;
  until: number;
  createdBy: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
}

export interface Detection {
  // Viatura detetada sem reserva válida (alerta do sistema)
  id: string;
  parkId: string;
  spotId: string;
  plate: string;
  detectedAt: number;
  resolved: boolean;
}

export interface ExtraPayment {
  id: string;
  code: string;
  bookingId: string;
  amount: number;
  minutes: number;
  createdAt: number;
  paid: boolean;
}

export interface ActivityLog {
  id: string;
  userId: string;
  text: string;
  at: number;
}

export interface AppState {
  seedDay: string;
  sessionUserId: string | null;
  selectedParkId: string;
  users: User[];
  vehicles: Vehicle[];
  parks: Park[];
  bookings: Booking[];
  passes: Pass[];
  notices: Notice[];
  notifications: AppNotification[];
  detections: Detection[];
  extras: ExtraPayment[];
  activity: ActivityLog[];
}

export type SpotState = 'livre' | 'ocupado' | 'reservado' | 'bloqueado' | 'desativado';
