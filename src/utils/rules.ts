// Regras de negócio puras (sem UI), reutilizadas por todos os perfis.
import { AppState, Booking, Park, Spot, SpotState, VehicleType } from '../types/models';
import { HOUR, MIN, time } from './format';

export const FRACTION_MIN = 15;
export const CHANGE_DEADLINE_MIN = 60;

/** Preço por hora (cêntimos) para o tipo de veículo. */
export function hourly(park: Park, type: VehicleType): number {
  return type === 'motociclo' ? park.prices.motoHour : park.prices.carHour;
}

export function fractions(start: number, end: number): number {
  return Math.max(0, Math.ceil((end - start) / (FRACTION_MIN * MIN)));
}

/** Valor em cêntimos: frações de 15 minutos a 1/4 da tarifa horária. */
export function price(park: Park, type: VehicleType, start: number, end: number): number {
  return Math.round((fractions(start, end) * hourly(park, type)) / 4);
}

export function fractionValue(park: Park, type: VehicleType): number {
  return Math.round(hourly(park, type) / 4);
}

/** Prazo para alterar/cancelar: até 1 hora antes da entrada. */
export function changeDeadline(b: Booking): number {
  return b.start - CHANGE_DEADLINE_MIN * MIN;
}

export function canChange(b: Booking, now: number): boolean {
  return b.type === 'antecipada' && b.status === 'confirmada' && now <= changeDeadline(b);
}

/** Horário de funcionamento (RFA1): limita as horas das reservas. */
export function hoursError(park: Park, start: number, end: number): string | null {
  if (end <= start) return 'A saída tem de ser posterior à entrada.';
  if (park.open24) return null;
  const s = time(start);
  const e = time(end);
  const sameDay = new Date(start).toDateString() === new Date(end).toDateString();
  if (!sameDay || s < park.openTime || e > park.closeTime) {
    return `O parque está fechado neste horário. Funciona das ${park.openTime} às ${park.closeTime}.`;
  }
  return null;
}

export function allSpots(park: Park): Spot[] {
  return park.floors.flatMap((f) => f.spots);
}

export function findSpot(state: AppState, spotId: string): { park: Park; spot: Spot; floorName: string; zone: string } | null {
  for (const park of state.parks) {
    for (const f of park.floors) {
      const spot = f.spots.find((s) => s.id === spotId);
      if (spot) return { park, spot, floorName: f.name, zone: f.zone };
    }
  }
  return null;
}

const overlaps = (a1: number, a2: number, b1: number, b2: number) => a1 < b2 && b1 < a2;

/** Fim efetivo de uma estadia em curso (se excedeu, conta até agora). */
function effectiveEnd(b: Booking, now: number) {
  return b.status === 'em_curso' ? Math.max(b.end, now) : b.end;
}

/** Estado de um lugar num período (vista virtual do utente, RFC4). */
export function spotStateFor(spot: Spot, bookings: Booking[], from: number, to: number, now: number, ignoreBookingId?: string): SpotState {
  if (!spot.active) return 'desativado';
  if (spot.block && overlaps(from, to, spot.block.from, spot.block.to)) return 'bloqueado';
  let state: SpotState = 'livre';
  for (const b of bookings) {
    if (b.spotId !== spot.id || b.id === ignoreBookingId) continue;
    if (b.status !== 'confirmada' && b.status !== 'em_curso') continue;
    if (!overlaps(from, to, b.start, effectiveEnd(b, now))) continue;
    if (b.status === 'em_curso') return 'ocupado';
    state = 'reservado';
  }
  return state;
}

/** Estado atual de um lugar (vista do gestor, RFG1b/RFG4). */
export function spotStateNow(spot: Spot, bookings: Booking[], now: number): { state: SpotState; booking?: Booking; next?: Booking } {
  if (!spot.active) return { state: 'desativado' };
  if (spot.block && spot.block.to > now && spot.block.from <= now) return { state: 'bloqueado' };
  const mine = bookings.filter((b) => b.spotId === spot.id && (b.status === 'em_curso' || b.status === 'confirmada'));
  const current = mine.find((b) => b.status === 'em_curso');
  if (current) return { state: 'ocupado', booking: current };
  const next = mine
    .filter((b) => b.status === 'confirmada' && b.start - now <= 3 * HOUR && b.end > now)
    .sort((a, b) => a.start - b.start)[0];
  if (next) return { state: 'reservado', next };
  return { state: 'livre' };
}

export function parkOccupancy(state: AppState, park: Park, now: number) {
  const counts = { livre: 0, ocupado: 0, reservado: 0, bloqueado: 0, desativado: 0 };
  const parkBookings = state.bookings.filter((b) => b.parkId === park.id);
  for (const s of allSpots(park)) counts[spotStateNow(s, parkBookings, now).state]++;
  const total = allSpots(park).length;
  const usable = total - counts.desativado;
  return { ...counts, total, usable, rate: total ? counts.ocupado / total : 0 };
}

/** Lugares livres para um período (utente). */
export function freeSpotsFor(state: AppState, park: Park, from: number, to: number, now: number, type: VehicleType) {
  const parkBookings = state.bookings.filter((b) => b.parkId === park.id);
  return allSpots(park).filter(
    (s) =>
      spotStateFor(s, parkBookings, from, to, now) === 'livre' &&
      (type === 'motociclo' ? true : s.kind !== 'motociclo'),
  );
}

export function overtimeMinutes(b: Booking, now: number): number {
  if (b.status !== 'em_curso' || b.type === 'avenca') return 0;
  return Math.max(0, Math.floor((now - b.end) / MIN));
}

export function bookingCode(now: number, n: number): string {
  const d = new Date(now);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `PU-${yy}${mm}${dd}-${String(n).padStart(3, '0')}`;
}
