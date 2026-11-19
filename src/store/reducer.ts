// Reducer único: todas as alterações aos dados passam por aqui.
// Assim, qualquer ecrã (de qualquer perfil) vê de imediato o mesmo estado.
import {
  AppState, Booking, Floor, Notice, Park, PassPlan, PaymentMethod, Prices, User, Vehicle, VehicleType,
} from '../types/models';
import { DAY, MIN, euro, time, uid, date as fmtDate } from '../utils/format';
import { allSpots, bookingCode, findSpot, freeSpotsFor, price, spotStateFor } from '../utils/rules';

export type Action =
  | { type: 'HYDRATE'; state: AppState }
  | { type: 'RESET'; state: AppState }
  | { type: 'LOGIN'; userId: string }
  | { type: 'LOGOUT' }
  | { type: 'REGISTER'; user: User; vehicle: Vehicle }
  | { type: 'SELECT_PARK'; parkId: string }
  // Utente
  | { type: 'CREATE_BOOKING'; booking: Booking }
  | { type: 'UPDATE_BOOKING'; bookingId: string; start: number; end: number; spotId: string; amount: number; now: number }
  | { type: 'CANCEL_BOOKING'; bookingId: string; now: number }
  | { type: 'START_IMMEDIATE'; userId: string; parkId: string; vehicleId: string; now: number }
  | { type: 'CHECK_IN'; bookingId: string; now: number }
  | { type: 'END_STAY'; bookingId: string; now: number }
  | { type: 'BUY_PASS'; userId: string; parkId: string; vehicleId: string; plan: PassPlan; method: PaymentMethod; now: number }
  | { type: 'RENEW_PASS'; passId: string; now: number }
  | { type: 'UPDATE_USER'; userId: string; patch: Partial<User> }
  | { type: 'ADD_VEHICLE'; vehicle: Vehicle }
  | { type: 'REMOVE_VEHICLE'; vehicleId: string }
  | { type: 'READ_NOTIFICATIONS'; userId: string }
  // Gestor
  | { type: 'SET_SPOT_ACTIVE'; spotId: string; active: boolean }
  | { type: 'BLOCK_SPOT'; spotId: string; reason: string; from: number; to: number; by: string; resolution: 'mover' | 'reembolsar'; notify: boolean; now: number }
  | { type: 'UNBLOCK_SPOT'; spotId: string }
  | { type: 'MARK_FREE'; spotId: string; now: number }
  | { type: 'MARK_OCCUPIED'; spotId: string; plate: string; now: number }
  | { type: 'SET_USER_STATUS'; userId: string; status: User['status']; by: string; now: number }
  | { type: 'CREATE_NOTICE'; notice: Notice; now: number }
  | { type: 'SEND_ALERT'; userId: string; title: string; body: string; by: string; now: number }
  | { type: 'ISSUE_EXTRA'; bookingId: string; minutes: number; amount: number; now: number }
  | { type: 'RESOLVE_DETECTION'; detectionId: string; now: number }
  // Administrador
  | { type: 'CREATE_PARK'; park: Park }
  | { type: 'UPDATE_PARK'; parkId: string; patch: Partial<Park> }
  | { type: 'SET_PARK_ACTIVE'; parkId: string; active: boolean; notify: boolean; now: number }
  | { type: 'UPDATE_FLOORS'; parkId: string; floors: Floor[] }
  | { type: 'UPDATE_PRICES'; prices: Record<string, Prices> }
  | { type: 'CREATE_MANAGER'; user: User }
  | { type: 'DELETE_USER'; userId: string }
  | { type: 'RESET_HISTORY'; parkId: string; from: number; to: number };

const notify = (s: AppState, userId: string | null, title: string, body: string, now: number): AppState =>
  !userId ? s : { ...s, notifications: [{ id: uid('nt'), userId, title, body, createdAt: now, read: false }, ...s.notifications] };

const log = (s: AppState, userId: string, text: string, now: number): AppState =>
  ({ ...s, activity: [{ id: uid('act'), userId, text, at: now }, ...s.activity] });

const patchBooking = (s: AppState, id: string, patch: Partial<Booking>): AppState =>
  ({ ...s, bookings: s.bookings.map((b) => (b.id === id ? { ...b, ...patch } : b)) });

const mapSpots = (s: AppState, spotId: string, fn: (sp: Park['floors'][number]['spots'][number]) => Park['floors'][number]['spots'][number]): AppState => ({
  ...s,
  parks: s.parks.map((p) => ({
    ...p,
    floors: p.floors.map((f) => ({ ...f, spots: f.spots.map((sp) => (sp.id === spotId ? fn(sp) : sp)) })),
  })),
});

export function reducer(state: AppState, a: Action): AppState {
  switch (a.type) {
    case 'HYDRATE':
    case 'RESET':
      return a.state;
    case 'LOGIN': {
      const u = state.users.find((x) => x.id === a.userId);
      const parkId = u?.role === 'gestor' && u.parkIds[0] ? u.parkIds[0] : state.selectedParkId;
      return { ...state, sessionUserId: a.userId, selectedParkId: parkId };
    }
    case 'LOGOUT':
      return { ...state, sessionUserId: null };
    case 'REGISTER':
      return { ...state, users: [...state.users, a.user], vehicles: [...state.vehicles, a.vehicle], sessionUserId: a.user.id };
    case 'SELECT_PARK':
      return { ...state, selectedParkId: a.parkId };

    // ---------------- Utente ----------------
    case 'CREATE_BOOKING': {
      const s = { ...state, bookings: [...state.bookings, a.booking] };
      const info = findSpot(s, a.booking.spotId);
      return notify(s, a.booking.userId, 'Reserva confirmada',
        `Lugar ${info?.spot.code} · ${fmtDate(a.booking.start)}, ${time(a.booking.start)}–${time(a.booking.end)}. Pago ${euro(a.booking.amount)}.`, a.booking.createdAt);
    }
    case 'UPDATE_BOOKING': {
      const b = state.bookings.find((x) => x.id === a.bookingId);
      if (!b) return state;
      const diff = a.amount - b.amount;
      const s = patchBooking(state, b.id, { start: a.start, end: a.end, spotId: a.spotId, amount: a.amount });
      return notify(s, b.userId, 'Reserva alterada',
        `${time(a.start)}–${time(a.end)}. ${diff >= 0 ? `Diferença paga: ${euro(diff)}` : `Reembolso: ${euro(-diff)}`}.`, a.now);
    }
    case 'CANCEL_BOOKING': {
      const b = state.bookings.find((x) => x.id === a.bookingId);
      if (!b) return state;
      const s = patchBooking(state, b.id, { status: 'cancelada', refunded: b.amount });
      return notify(s, b.userId, 'Reserva cancelada', `Reembolso de ${euro(b.amount)} por ${b.method ?? 'MB WAY'}.`, a.now);
    }
    case 'START_IMMEDIATE': {
      // RFC2: o sistema atribui o primeiro lugar livre (sem possibilidade de alteração).
      const park = state.parks.find((p) => p.id === a.parkId)!;
      const v = state.vehicles.find((x) => x.id === a.vehicleId)!;
      // Uma estadia em curso por veículo.
      if (state.bookings.some((b) => b.vehicleId === v.id && b.status === 'em_curso')) return state;
      const free = freeSpotsFor(state, park, a.now, a.now + 2 * 60 * MIN, a.now, v.type)
        .filter((sp) => (v.type === 'motociclo' ? sp.kind === 'motociclo' : sp.kind === 'normal'));
      const sp = free[0] ?? freeSpotsFor(state, park, a.now, a.now + 60 * MIN, a.now, v.type)[0];
      if (!sp) return state;
      const n = state.bookings.length + 1;
      const booking: Booking = {
        id: uid('b'), code: bookingCode(a.now, n % 1000), parkId: park.id, spotId: sp.id, userId: a.userId, vehicleId: v.id,
        type: 'imediata', start: a.now, end: a.now + 2 * 60 * MIN, checkIn: a.now, status: 'em_curso', amount: 0, paid: false, createdAt: a.now,
      };
      const s = { ...state, bookings: [...state.bookings, booking] };
      return notify(s, a.userId, 'Entrada registada', `Lugar ${sp.code} atribuído. O valor é calculado à saída.`, a.now);
    }
    case 'CHECK_IN':
      return patchBooking(state, a.bookingId, { status: 'em_curso', checkIn: a.now });
    case 'END_STAY': {
      const b = state.bookings.find((x) => x.id === a.bookingId);
      if (!b) return state;
      const park = state.parks.find((p) => p.id === b.parkId)!;
      const v = state.vehicles.find((x) => x.id === b.vehicleId)!;
      if (b.type === 'imediata') {
        const amount = price(park, v.type, b.checkIn ?? b.start, Math.max(a.now, (b.checkIn ?? b.start) + MIN)); // mínimo: 1 fração
        const s = patchBooking(state, b.id, { status: 'concluida', checkOut: a.now, end: a.now, amount, paid: true, method: 'MB WAY' });
        return notify(s, b.userId, 'Valor a pagar à saída', `Estadia de ${time(b.checkIn ?? b.start)} a ${time(a.now)}: ${euro(amount)} (cobrado por MB WAY).`, a.now);
      }
      return patchBooking(state, b.id, { status: 'concluida', checkOut: a.now });
    }
    case 'BUY_PASS': {
      // Uma avença ativa por veículo em cada parque (veículos diferentes podem ter avenças em simultâneo).
      if (state.passes.some((p) => p.vehicleId === a.vehicleId && p.parkId === a.parkId && p.to > a.now && p.from <= a.now)) return state;
      const park = state.parks.find((p) => p.id === a.parkId)!;
      const priceCents = a.plan === '24h' ? park.prices.pass24 : park.prices.passDay;
      const pass = {
        id: uid('p'), code: `AV-${String(state.passes.length + 413).padStart(4, '0')}`, userId: a.userId, parkId: a.parkId,
        vehicleId: a.vehicleId, plan: a.plan, from: a.now, to: a.now + 30 * DAY, price: priceCents,
      };
      const s = { ...state, passes: [...state.passes, pass] };
      return notify(s, a.userId, 'Avença ativa', `Válida até ${fmtDate(pass.to)}. Pago ${euro(priceCents)} por ${a.method}.`, a.now);
    }
    case 'RENEW_PASS': {
      const p = state.passes.find((x) => x.id === a.passId);
      if (!p) return state;
      const park = state.parks.find((x) => x.id === p.parkId)!;
      const priceCents = p.plan === '24h' ? park.prices.pass24 : park.prices.passDay;
      const to = Math.max(p.to, a.now) + 30 * DAY;
      const s = { ...state, passes: state.passes.map((x) => (x.id === p.id ? { ...x, to, price: priceCents } : x)) };
      return notify(s, p.userId, 'Avença renovada', `Nova data de fim: ${fmtDate(to)}.`, a.now);
    }
    case 'UPDATE_USER':
      return { ...state, users: state.users.map((u) => (u.id === a.userId ? { ...u, ...a.patch } : u)) };
    case 'ADD_VEHICLE':
      return { ...state, vehicles: [...state.vehicles, a.vehicle] };
    case 'REMOVE_VEHICLE':
      return { ...state, vehicles: state.vehicles.map((v) => (v.id === a.vehicleId ? { ...v, archived: true } : v)) };
    case 'READ_NOTIFICATIONS':
      return { ...state, notifications: state.notifications.map((n) => (n.userId === a.userId ? { ...n, read: true } : n)) };

    // ---------------- Gestor ----------------
    case 'SET_SPOT_ACTIVE':
      return mapSpots(state, a.spotId, (sp) => ({ ...sp, active: a.active }));
    case 'BLOCK_SPOT': {
      let s = mapSpots(state, a.spotId, (sp) => ({ ...sp, block: { reason: a.reason, from: a.from, to: a.to, by: a.by } }));
      const info = findSpot(s, a.spotId)!;
      const affected = s.bookings.filter((b) => b.spotId === a.spotId && b.status === 'confirmada' && b.start < a.to && a.from < b.end);
      for (const b of affected) {
        if (a.resolution === 'mover') {
          const v = s.vehicles.find((x) => x.id === b.vehicleId)!;
          const alt = freeSpotsFor(s, info.park, b.start, b.end, a.now, v.type).find((sp) => sp.id !== a.spotId && sp.kind === 'normal');
          if (alt) {
            s = patchBooking(s, b.id, { spotId: alt.id });
            if (a.notify) s = notify(s, b.userId, 'O seu lugar mudou', `O seu lugar mudou para ${alt.code} por motivo de ${a.reason.toLowerCase()}. O horário e o valor mantêm-se.`, a.now);
            continue;
          }
        }
        s = patchBooking(s, b.id, { status: 'cancelada', refunded: b.amount });
        if (a.notify) s = notify(s, b.userId, 'Reserva cancelada pelo parque', `O lugar ${info.spot.code} ficou indisponível (${a.reason.toLowerCase()}). Reembolso de ${euro(b.amount)}.`, a.now);
      }
      return log(s, s.sessionUserId ?? '', `Bloqueou o lugar ${info.spot.code}`, a.now);
    }
    case 'UNBLOCK_SPOT':
      return mapSpots(state, a.spotId, (sp) => ({ ...sp, block: undefined }));
    case 'MARK_FREE': {
      const cur = state.bookings.find((b) => b.spotId === a.spotId && b.status === 'em_curso');
      if (!cur) return state;
      return reducer({ ...state, detections: state.detections.map((d) => (d.spotId === a.spotId ? { ...d, resolved: true } : d)) },
        { type: 'END_STAY', bookingId: cur.id, now: a.now });
    }
    case 'MARK_OCCUPIED': {
      const info = findSpot(state, a.spotId)!;
      let v = state.vehicles.find((x) => x.plate === a.plate);
      let s = state;
      if (!v) {
        v = { id: uid('v'), ownerId: null, plate: a.plate, model: 'Por identificar', type: 'automovel' };
        s = { ...s, vehicles: [...s.vehicles, v] };
      }
      const booking: Booking = {
        id: uid('b'), code: 'MANUAL', parkId: info.park.id, spotId: a.spotId, userId: v.ownerId, vehicleId: v.id, type: 'imediata',
        start: a.now, end: a.now + 60 * MIN, checkIn: a.now, status: 'em_curso', amount: 0, paid: false, createdAt: a.now,
      };
      return { ...s, bookings: [...s.bookings, booking] };
    }
    case 'SET_USER_STATUS': {
      const s = { ...state, users: state.users.map((u) => (u.id === a.userId ? { ...u, status: a.status } : u)) };
      const msg = a.status === 'ativa' ? 'A sua conta foi validada. Já pode reservar lugares.' : a.status === 'suspensa' ? 'A sua conta foi suspensa. Contacte o parque.' : '';
      const s2 = msg ? notify(s, a.userId, 'Estado da conta', msg, a.now) : s;
      const u = state.users.find((x) => x.id === a.userId);
      return log(s2, a.by, `${a.status === 'ativa' ? 'Validou' : 'Suspendeu'} a conta de ${u?.name}`, a.now);
    }
    case 'CREATE_NOTICE': {
      let s = { ...state, notices: [a.notice, ...state.notices] };
      // Destinatários: utentes ligados ao parque (reservas, estadias ou avenças).
      const n = a.notice;
      const parkBookings = s.bookings.filter((b) => b.parkId === n.parkId && b.userId);
      let ids = new Set(parkBookings.map((b) => b.userId as string));
      if (n.audience === 'reserva_hoje') {
        const day = new Date(a.now).toDateString();
        ids = new Set(parkBookings.filter((b) => b.status !== 'cancelada' && new Date(b.start).toDateString() === day).map((b) => b.userId as string));
      } else if (n.audience === 'avenca') {
        ids = new Set(s.passes.filter((p) => p.parkId === n.parkId && p.to > a.now).map((p) => p.userId));
      } else if (n.audience === 'piso') {
        ids = new Set(parkBookings.filter((b) => b.spotId.startsWith(n.floorId ?? '') && b.status !== 'cancelada' && b.end > a.now).map((b) => b.userId as string));
      }
      ids.forEach((id) => { s = notify(s, id, n.title, n.message, Math.max(a.now, n.publishAt)); });
      return s;
    }
    case 'SEND_ALERT':
      return log(notify(state, a.userId, a.title, a.body, a.now), a.by, 'Enviou um alerta individual', a.now);
    case 'ISSUE_EXTRA': {
      const b = state.bookings.find((x) => x.id === a.bookingId)!;
      const extra = { id: uid('pe'), code: `PE-${b.code.replace(/\D/g, '').slice(-4)}`, bookingId: b.id, amount: a.amount, minutes: a.minutes, createdAt: a.now, paid: false };
      const s = { ...state, extras: [...state.extras, extra] };
      return notify(s, b.userId, 'Pagamento extra', `Tempo excedido de ${a.minutes} min. Valor a pagar: ${euro(a.amount)}.`, a.now);
    }
    case 'RESOLVE_DETECTION':
      return { ...state, detections: state.detections.map((d) => (d.id === a.detectionId ? { ...d, resolved: true } : d)) };

    // ---------------- Administrador ----------------
    case 'CREATE_PARK':
      return { ...state, parks: [...state.parks, a.park] };
    case 'UPDATE_PARK':
      return { ...state, parks: state.parks.map((p) => (p.id === a.parkId ? { ...p, ...a.patch } : p)) };
    case 'SET_PARK_ACTIVE': {
      let s: AppState = { ...state, parks: state.parks.map((p) => (p.id === a.parkId ? { ...p, active: a.active } : p)) };
      if (a.notify && !a.active) {
        const park = state.parks.find((p) => p.id === a.parkId)!;
        const ids = new Set(s.bookings.filter((b) => b.parkId === a.parkId && b.status === 'confirmada' && b.userId).map((b) => b.userId as string));
        s.passes.filter((p) => p.parkId === a.parkId && p.to > a.now).forEach((p) => ids.add(p.userId));
        ids.forEach((id) => { s = notify(s, id, `${park.name} desativado`, 'O parque deixa de aceitar novas reservas. As reservas e avenças ativas mantêm-se até ao fim.', a.now); });
      }
      return s;
    }
    case 'UPDATE_FLOORS':
      return { ...state, parks: state.parks.map((p) => (p.id === a.parkId ? { ...p, floors: a.floors } : p)) };
    case 'UPDATE_PRICES':
      return { ...state, parks: state.parks.map((p) => (a.prices[p.id] ? { ...p, prices: a.prices[p.id] } : p)) };
    case 'CREATE_MANAGER':
      return { ...state, users: [...state.users, a.user] };
    case 'DELETE_USER':
      return { ...state, users: state.users.filter((u) => u.id !== a.userId) };
    case 'RESET_HISTORY': {
      const keep = (b: Booking) => !(b.parkId === a.parkId && b.start >= a.from && b.start < a.to && (b.status === 'concluida' || b.status === 'cancelada'));
      return { ...state, bookings: state.bookings.filter(keep) };
    }
    default:
      return state;
  }
}

// Utilitários usados nos ecrãs para validar disponibilidade antes de despachar ações.
export function isSpotFree(state: AppState, spotId: string, from: number, to: number, now: number, ignore?: string) {
  const info = findSpot(state, spotId);
  if (!info) return false;
  return spotStateFor(info.spot, state.bookings.filter((b) => b.parkId === info.park.id), from, to, now, ignore) === 'livre';
}

export function totalSpots(p: Park) {
  return allSpots(p).length;
}

export type { VehicleType };
