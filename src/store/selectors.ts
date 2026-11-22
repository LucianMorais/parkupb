// Consultas reutilizadas pelos ecrãs (derivam sempre do estado único).
import { AppState, Booking, Park } from '../types/models';
import { overtimeMinutes, findSpot } from '../utils/rules';

export const vehiclesOf = (s: AppState, userId: string) => s.vehicles.filter((v) => v.ownerId === userId && !v.archived);
export const vehicleById = (s: AppState, id: string) => s.vehicles.find((v) => v.id === id);
export const userById = (s: AppState, id: string | null) => (id ? s.users.find((u) => u.id === id) : undefined);
export const parkById = (s: AppState, id: string) => s.parks.find((p) => p.id === id);

export const bookingsOf = (s: AppState, userId: string) =>
  s.bookings.filter((b) => b.userId === userId).sort((a, b) => b.start - a.start);

export function nextBooking(s: AppState, userId: string, now: number): Booking | undefined {
  return s.bookings
    .filter((b) => b.userId === userId && (b.status === 'em_curso' || (b.status === 'confirmada' && b.end > now)))
    .sort((a, b) => (a.status === 'em_curso' ? -1 : b.status === 'em_curso' ? 1 : a.start - b.start))[0];
}

export function activePass(s: AppState, userId: string, parkId: string, now: number) {
  return s.passes.find((p) => p.userId === userId && p.parkId === parkId && p.to > now && p.from <= now);
}

export const unread = (s: AppState, userId: string) => s.notifications.filter((n) => n.userId === userId && !n.read).length;

export function spotLabel(s: AppState, spotId: string) {
  const info = findSpot(s, spotId);
  return info ? { code: info.spot.code, floor: info.floorName, zone: `Zona ${info.zone}`, park: info.park } : null;
}

/** Alertas de incumprimento (RFG6): tempos excedidos e viaturas sem reserva. */
export function incidents(s: AppState, park: Park, now: number) {
  const overtime = s.bookings
    .filter((b) => b.parkId === park.id && b.userId && overtimeMinutes(b, now) >= 5)
    .map((b) => ({ kind: 'tempo' as const, id: b.id, booking: b, minutes: overtimeMinutes(b, now), extra: s.extras.find((e) => e.bookingId === b.id) }));
  const unknown = s.detections
    .filter((d) => d.parkId === park.id && !d.resolved)
    .map((d) => ({ kind: 'sem_reserva' as const, id: d.id, detection: d }));
  return { overtime, unknown, total: overtime.length + unknown.length };
}

export function parkStatsBetween(s: AppState, parkId: string, from: number, to: number) {
  const list = s.bookings.filter((b) => b.parkId === parkId && b.start >= from && b.start < to && b.paid && b.status !== 'cancelada');
  const revenue = list.reduce((acc, b) => acc + b.amount, 0);
  const hours = list.reduce((acc, b) => acc + Math.max(0, (b.end - b.start) / 3600000), 0);
  return { revenue, hours: Math.round(hours), count: list.length };
}
