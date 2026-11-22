// Dados de demonstração, gerados em relação à data atual
// para que reservas, ocupação e prazos façam sempre sentido.
import {
  AppState, Booking, Floor, Notice, Park, Pass, Spot, SpotKind, User, Vehicle, VehicleType,
} from '../types/models';
import { DAY, MIN, at, dayKey, startOfDay } from '../utils/format';
import { price } from '../utils/rules';

// Gerador pseudoaleatório determinístico (os dados são iguais em todos os arranques do dia).
function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function floor(parkId: string, name: string, zone: string, count: number, opts: {
  kinds?: Record<number, SpotKind>; disabled?: number[];
} = {}): Floor {
  const id = `${parkId}_${zone}`;
  const spots: Spot[] = Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    return {
      id: `${id}${String(n).padStart(2, '0')}`,
      code: `${zone}${String(n).padStart(2, '0')}`,
      floorId: id,
      kind: opts.kinds?.[n] ?? 'normal',
      active: !(opts.disabled ?? []).includes(n),
    };
  });
  return { id, name, zone, spots };
}

const FIRST = ['Rita', 'Tiago', 'Sara', 'Nuno', 'Joana', 'André', 'Catarina', 'Bruno', 'Mariana', 'Diogo', 'Filipa', 'Hugo',
  'Patrícia', 'Ricardo', 'Cláudia', 'Paulo', 'Daniela', 'Gonçalo', 'Vera', 'Rafael', 'Teresa', 'Fábio', 'Helena', 'Vítor',
  'Lúcia', 'Sérgio', 'Mónica', 'Rui', 'Carla', 'Jorge', 'Alexandra', 'Henrique', 'Susana', 'Miguel', 'Raquel', 'Duarte'];
const LAST = ['Pereira', 'Ferreira', 'Gomes', 'Ribeiro', 'Carvalho', 'Lopes', 'Rocha', 'Teixeira', 'Moreira', 'Correia',
  'Mendes', 'Nunes', 'Vieira', 'Pires', 'Cardoso', 'Pinto', 'Rodrigues', 'Fonseca', 'Morais', 'Gonçalves'];
const MODELS = ['Renault Clio', 'Peugeot 208', 'Volkswagen Golf', 'Toyota Yaris', 'SEAT Ibiza', 'Fiat 500', 'Opel Corsa',
  'Citroën C3', 'Dacia Sandero', 'BMW Série 1', 'Mercedes Classe A', 'Nissan Qashqai'];

export const DEMO = {
  utente: { email: 'ines.martins@email.pt', password: 'parkupb1' },
  gestor: { email: 'rui.costa@parkupb.pt', password: 'gestor123' },
  admin: { email: 'ana.ferreira@parkupb.pt', password: 'admin123' },
};

export function createSeed(nowTs = Date.now()): AppState {
  const today = startOfDay(nowTs);
  const base = Math.floor(nowTs / (15 * MIN)) * 15 * MIN; // agora arredondado a 15 min
  const T = (min: number) => base + min * MIN;
  const rand = rng(Number(dayKey(nowTs).replace(/-/g, '')));
  const pick = <X,>(arr: X[]) => arr[Math.floor(rand() * arr.length)];

  // ---------- Parques ----------
  const estacao: Park = {
    id: 'estacao', name: 'Parque Municipal da Estação', address: 'Rua da Estação, Bragança', area: 'Centro',
    lat: 41.8061, lng: -6.7567, open24: true, openTime: '00:00', closeTime: '23:59', active: true,
    prices: { carHour: 120, motoHour: 60, pass24: 6500, passDay: 4500 },
    floors: [
      floor('estacao', 'Piso -1', 'A', 20, { kinds: { 1: 'mobilidade', 11: 'mobilidade', 19: 'motociclo', 20: 'motociclo' } }),
      floor('estacao', 'Piso 0', 'B', 20, { kinds: { 1: 'mobilidade' }, disabled: [15, 20] }),
      floor('estacao', 'Piso 1', 'C', 20, { disabled: [15, 20] }),
    ],
  };
  const mercado: Park = {
    id: 'mercado', name: 'Parque do Mercado Municipal', address: 'Rua do Mercado, Bragança', area: 'Mercado',
    lat: 41.8075, lng: -6.7539, open24: false, openTime: '07:00', closeTime: '22:00', active: true,
    prices: { carHour: 100, motoHour: 50, pass24: 5500, passDay: 3500 },
    floors: [
      floor('mercado', 'Piso -1', 'A', 20, { kinds: { 1: 'mobilidade', 20: 'motociclo' }, disabled: [19] }),
      floor('mercado', 'Piso 0', 'B', 20, { kinds: { 1: 'mobilidade' }, disabled: [20] }),
    ],
  };
  const campus: Park = {
    id: 'campus', name: 'Parque do Campus IPB', address: 'Alameda de Santa Apolónia, Bragança', area: 'Campus IPB',
    lat: 41.7979, lng: -6.7681, open24: true, openTime: '00:00', closeTime: '23:59', active: true,
    prices: { carHour: 80, motoHour: 40, pass24: 4000, passDay: 2500 },
    floors: [
      floor('campus', 'Piso 0', 'A', 40, { kinds: { 1: 'mobilidade', 2: 'mobilidade', 39: 'motociclo', 40: 'motociclo' }, disabled: [30] }),
      floor('campus', 'Piso 1', 'B', 40, { kinds: { 1: 'mobilidade' }, disabled: [40] }),
    ],
  };
  const parks = [estacao, mercado, campus];
  const spot = (code: string, p: Park = estacao) => p.floors.flatMap((f) => f.spots).find((s) => s.code === code)!;

  // Lugar A10 bloqueado para manutenção (gestor).
  spot('A10').block = { reason: 'Manutenção', note: 'Reparação da iluminação', from: T(-225), to: at(today, '18:00') > nowTs ? at(today, '18:00') : T(240), by: 'Rui Costa' };

  // ---------- Contas ----------
  const users: User[] = [];
  const vehicles: Vehicle[] = [];
  const addUser = (u: Partial<User> & Pick<User, 'id' | 'name' | 'email'>, created = -40) => {
    const user: User = {
      role: 'utente', phone: '+351 9' + Math.floor(10000000 + rand() * 89999999), password: 'parkupb1', status: 'ativa',
      parkIds: [], createdAt: today + created * DAY, ...u,
    };
    users.push(user);
    return user;
  };
  const addVehicle = (ownerId: string | null, plate: string, model: string, type: VehicleType = 'automovel') => {
    const v: Vehicle = { id: `v_${plate}`, ownerId, plate, model, type };
    vehicles.push(v);
    return v;
  };

  addUser({ id: 'admin_ana', role: 'admin', name: 'Ana Ferreira', email: DEMO.admin.email, password: DEMO.admin.password, phone: '+351 918 650 234' }, -90);
  addUser({ id: 'gestor_rui', role: 'gestor', name: 'Rui Costa', email: DEMO.gestor.email, password: DEMO.gestor.password, phone: '+351 917 432 890', parkIds: ['estacao'] }, -60);
  addUser({ id: 'gestor_marta', role: 'gestor', name: 'Marta Alves', email: 'marta.alves@parkupb.pt', password: 'gestor123', phone: '+351 915 302 118', parkIds: ['estacao', 'mercado'] }, -55);
  addUser({ id: 'gestor_paulo', role: 'gestor', name: 'Paulo Neves', email: 'paulo.neves@parkupb.pt', password: 'gestor123', phone: '+351 914 776 230', parkIds: ['campus'] }, -50);

  const ines = addUser({ id: 'u_ines', name: 'Inês Martins', email: DEMO.utente.email, password: DEMO.utente.password, phone: '+351 912 345 678', nif: '231 456 789' }, -45);
  const ana = addUser({ id: 'u_ana', name: 'Ana Silva', email: 'ana.silva@email.pt', phone: '+351 913 222 104', nif: '245 678 913' }, -52);
  const pedro = addUser({ id: 'u_pedro', name: 'Pedro Alves', email: 'pedro.alves@email.pt' });
  const martaS = addUser({ id: 'u_marta', name: 'Marta Sousa', email: 'marta.sousa@email.pt' });
  const luis = addUser({ id: 'u_luis', name: 'Luís Fernandes', email: 'luis.fernandes@email.pt' });
  const joao = addUser({ id: 'u_joao', name: 'João Martins', email: 'joao.martins@email.pt' });
  const carlos = addUser({ id: 'u_carlos', name: 'Carlos Pinto', email: 'carlos.pinto@email.pt' });
  const inesL = addUser({ id: 'u_ineslopes', name: 'Inês Lopes', email: 'ines.lopes@email.pt', status: 'suspensa' });
  const pedroS = addUser({ id: 'u_pedrosousa', name: 'Pedro Sousa', email: 'pedro.sousa@email.pt' });
  const beatriz = addUser({ id: 'u_beatriz', name: 'Beatriz Carvalho', email: 'beatriz.carvalho@email.pt', phone: '+351 913 284 675', status: 'por_validar' }, 0);
  const miguel = addUser({ id: 'u_miguel', name: 'Miguel Rodrigues', email: 'miguel.rodrigues@email.pt', phone: '+351 926 175 803', status: 'por_validar' }, 0);
  const sofia = addUser({ id: 'u_sofia', name: 'Sofia Fernandes', email: 'sofia.fernandes@email.pt', status: 'por_validar' }, 0);

  const vInes = addVehicle(ines.id, 'AA-12-BC', 'Renault Captur');
  const vInesMoto = addVehicle(ines.id, '34-LP-12', 'Honda PCX 125', 'motociclo');
  const vAna = addVehicle(ana.id, 'AB-12-CD', 'Renault Clio');
  const vPedro = addVehicle(pedro.id, '23-DE-45', 'Opel Corsa');
  const vMarta = addVehicle(martaS.id, '45-RS-67', 'Fiat 500');
  const vLuis = addVehicle(luis.id, '56-GH-78', 'Peugeot 2008');
  const vJoao = addVehicle(joao.id, '56-TR-78', 'Peugeot 208');
  const vCarlos = addVehicle(carlos.id, '34-EF-56', 'Toyota Corolla');
  addVehicle(inesL.id, '34-UV-56', 'Toyota Yaris');
  const vPedroS = addVehicle(pedroS.id, 'CD-45-EF', 'Volkswagen Golf');
  addVehicle(beatriz.id, 'BD-34-EF', 'Renault Clio');
  addVehicle(miguel.id, '78-LM-90', 'SEAT Ibiza');
  addVehicle(sofia.id, '91-QA-27', 'Dacia Sandero');
  const vUnknown1 = addVehicle(null, '98-ZX-76', 'Por identificar');
  const vUnknown2 = addVehicle(null, '12-UV-34', 'Por identificar');

  // Utentes adicionais para gerar movimento realista nos três parques.
  const fillers: Vehicle[] = [];
  for (let i = 0; i < 110; i++) {
    const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`;
    const u = addUser({ id: `u_f${i}`, name, email: `${name.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}.${name.split(' ')[1].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}${i}@email.pt` }, -20 - Math.floor(rand() * 60));
    const L = 'ABCDEFGHIJLMNOPRSTUVXZ';
    const plate = `${String(10 + Math.floor(rand() * 89))}-${L[Math.floor(rand() * L.length)]}${L[Math.floor(rand() * L.length)]}-${String(10 + Math.floor(rand() * 89))}`;
    fillers.push(addVehicle(u.id, plate, pick(MODELS)));
  }

  // ---------- Reservas ----------
  const bookings: Booking[] = [];
  let seq = 1;
  const book = (p: Park, s: Spot, v: Vehicle, b: Partial<Booking> & Pick<Booking, 'start' | 'end' | 'status'>): Booking => {
    const type = b.type ?? 'antecipada';
    const amount = b.amount ?? (type === 'avenca' ? 0 : price(p, v.type, b.start, b.end));
    const booking: Booking = {
      id: `b_${seq}`, code: `R-${1000 + seq}`, parkId: p.id, spotId: s.id, userId: v.ownerId, vehicleId: v.id, type,
      amount, paid: type !== 'imediata' || b.status === 'concluida', method: 'MB WAY', createdAt: b.start - DAY, ...b,
    };
    seq++;
    bookings.push(booking);
    return booking;
  };

  // Estadias em curso e reservas (dados coerentes com o Figma)
  book(estacao, spot('A12'), vAna, { start: T(-45), end: T(15), status: 'em_curso', checkIn: T(-45) });
  book(estacao, spot('B03'), vPedro, { type: 'imediata', start: T(-90), end: T(30), status: 'em_curso', checkIn: T(-90), amount: 0, paid: false });
  book(estacao, spot('B08'), vMarta, { start: T(-140), end: T(-20), status: 'em_curso', checkIn: T(-140) });
  book(estacao, spot('B05'), vJoao, { start: T(-105), end: T(-45), status: 'em_curso', checkIn: T(-105) });
  const passLuis: Pass = {
    id: 'p_luis', code: 'AV-0412', userId: luis.id, parkId: 'estacao', vehicleId: vLuis.id, plan: '24h',
    from: today - 10 * DAY, to: today + 20 * DAY, price: estacao.prices.pass24,
  };
  book(estacao, spot('A02'), vLuis, { type: 'avenca', passId: passLuis.id, start: T(-305), end: T(45), status: 'em_curso', checkIn: T(-305), amount: 0 });
  const unk1 = book(estacao, spot('C04'), vUnknown1, { type: 'imediata', start: T(-13), end: T(-13), status: 'em_curso', checkIn: T(-13), amount: 0, paid: false });
  const unk2 = book(estacao, spot('B07'), vUnknown2, { type: 'imediata', start: T(-5), end: T(-5), status: 'em_curso', checkIn: T(-5), amount: 0, paid: false });
  book(estacao, spot('A07'), vCarlos, { start: T(75), end: T(135), status: 'confirmada' });

  // Reservas da Inês (utente de demonstração)
  const tomorrow = today + DAY;
  book(estacao, spot('A12'), vInes, { code: 'PU-' + dayKey(tomorrow).slice(2).replace(/-/g, '') + '-014', start: at(tomorrow, '09:00'), end: at(tomorrow, '11:45'), status: 'confirmada', createdAt: nowTs - 2 * DAY });
  book(estacao, spot('A08'), vInes, { start: at(today - 2 * DAY, '10:00'), end: at(today - 2 * DAY, '12:00'), status: 'concluida', checkIn: at(today - 2 * DAY, '09:58'), checkOut: at(today - 2 * DAY, '11:52') });
  book(estacao, spot('A19'), vInesMoto, { start: at(today - 3 * DAY, '18:00'), end: at(today - 3 * DAY, '19:00'), status: 'concluida', checkIn: at(today - 3 * DAY, '18:02'), checkOut: at(today - 3 * DAY, '18:55') });
  book(estacao, spot('B11'), vInes, { start: at(today - 4 * DAY, '14:00'), end: at(today - 4 * DAY, '17:00'), status: 'concluida', checkIn: at(today - 4 * DAY, '14:05'), checkOut: at(today - 4 * DAY, '16:48') });
  const cancelled = book(estacao, spot('A05'), vInes, { start: at(today - 6 * DAY, '08:00'), end: at(today - 6 * DAY, '10:00'), status: 'cancelada' });
  cancelled.refunded = cancelled.amount;
  book(mercado, spot('B04', mercado), vInes, { start: at(today - 9 * DAY, '10:00'), end: at(today - 9 * DAY, '11:30'), status: 'concluida', checkIn: at(today - 9 * DAY, '10:00'), checkOut: at(today - 9 * DAY, '11:20') });
  book(campus, spot('A12', campus), vPedroS, { start: T(-60 * 24), end: T(-60 * 23), status: 'concluida', checkIn: T(-60 * 24) });

  // Movimento gerado: ocupação atual, reservas próximas e histórico de 30 dias.
  const isBusy = (p: Park, s: Spot, from: number, to: number) =>
    !s.active || !!s.block || bookings.some((b) => b.spotId === s.id && b.start < to && from < Math.max(b.end, b.checkIn ? nowTs : b.end) && (b.status === 'em_curso' || b.status === 'confirmada'));
  const carSpots = (p: Park) => p.floors.flatMap((f) => f.spots).filter((s) => s.kind !== 'motociclo' && s.active && !s.block);

  const fill = (p: Park, occupiedTarget: number, reservedTarget: number) => {
    const occupiedNow = () => bookings.filter((b) => b.parkId === p.id && b.status === 'em_curso').length;
    let guard = 0;
    while (occupiedNow() < occupiedTarget && guard++ < 500) {
      const s = pick(carSpots(p));
      const start = T(-15 * (1 + Math.floor(rand() * 12)));
      const end = T(15 * (1 + Math.floor(rand() * 16)));
      if (isBusy(p, s, start, end)) continue;
      // Uma viatura só pode estar num parque de cada vez.
      const busyVehicles = new Set(bookings.filter((b) => b.status === 'em_curso').map((b) => b.vehicleId));
      const v = fillers.find((f) => !busyVehicles.has(f.id) && rand() < 0.5) ?? fillers.find((f) => !busyVehicles.has(f.id));
      if (!v) break;
      book(p, s, v, { start, end, status: 'em_curso', checkIn: start + Math.floor(rand() * 6) * MIN });
    }
    let reserved = bookings.filter((b) => b.parkId === p.id && b.status === 'confirmada' && b.start - nowTs < 3 * 3600000).length;
    guard = 0;
    while (reserved < reservedTarget && guard++ < 500) {
      const s = pick(carSpots(p));
      const start = T(15 * (1 + Math.floor(rand() * 11)));
      const end = start + (60 + 15 * Math.floor(rand() * 9)) * MIN;
      if (isBusy(p, s, start, end)) continue;
      book(p, s, pick(fillers), { start, end, status: 'confirmada' });
      reserved++;
    }
  };
  fill(estacao, 28, 10);
  fill(mercado, 20, 4);
  fill(campus, 40, 8);

  // Reservas futuras (próximos 3 dias) para a vista virtual mostrar lugares reservados.
  for (const p of parks) {
    for (let d = 1; d <= 3; d++) {
      const target = p.id === 'campus' ? 30 : 20;
      let made = 0;
      let guard = 0;
      while (made < target && guard++ < 400) {
        const startH = 8 + Math.floor(rand() * 11);
        const start = at(today + d * DAY, `${String(startH).padStart(2, '0')}:${pick(['00', '15', '30', '45'])}`);
        const end = start + (60 + 30 * Math.floor(rand() * 8)) * MIN;
        const s = pick(carSpots(p));
        if (!p.open24 && new Date(end).getHours() >= 22) continue;
        if (isBusy(p, s, start, end)) continue;
        book(p, s, pick(fillers), { start, end, status: 'confirmada', createdAt: nowTs - Math.floor(rand() * 5) * DAY });
        made++;
      }
    }
  }

  // Histórico (estadias concluídas, canceladas e entradas imediatas)
  for (const p of parks) {
    const perDay = p.id === 'campus' ? 26 : p.id === 'estacao' ? 22 : 14;
    for (let d = 30; d >= 0; d--) {
      const day = today - d * DAY;
      const n = d === 0 ? Math.round(perDay * 0.6) : perDay;
      for (let k = 0; k < n; k++) {
        const startH = p.open24 ? 7 + Math.floor(rand() * 13) : 7 + Math.floor(rand() * 11);
        const start = at(day, `${String(startH).padStart(2, '0')}:${pick(['00', '15', '30', '45'])}`);
        const end = start + (45 + 15 * Math.floor(rand() * 11)) * MIN;
        if (end >= T(-15)) continue;
        const r = rand();
        const s = pick(carSpots(p));
        const v = pick(fillers);
        if (r < 0.06) {
          const b = book(p, s, v, { start, end, status: 'cancelada' });
          b.refunded = b.amount;
        } else {
          book(p, s, v, {
            type: r < 0.3 ? 'imediata' : 'antecipada', start, end, status: 'concluida',
            checkIn: start, checkOut: end - Math.floor(rand() * 10) * MIN,
          });
        }
      }
    }
  }

  // ---------- Avenças, avisos, notificações, deteções ----------
  const passes: Pass[] = [passLuis, {
    id: 'p_f1', code: 'AV-0398', userId: fillers[3].ownerId!, parkId: 'campus', vehicleId: fillers[3].id, plan: 'diurna',
    from: today - 15 * DAY, to: today + 15 * DAY, price: campus.prices.passDay,
  }];

  const notices: Notice[] = [
    { id: 'n1', parkId: 'estacao', kind: 'alerta', title: 'Circulação condicionada no Piso 0', message: 'Utilize a rampa norte durante a manutenção da sinalização.', audience: 'todos', publishAt: at(today, '08:00'), until: at(today, '23:00'), createdBy: 'Rui Costa' },
    { id: 'n2', parkId: 'estacao', kind: 'informacao', title: 'Limpeza do Piso -1', message: 'O piso estará em limpeza amanhã, entre as 07:00 e as 09:00.', audience: 'piso', floorId: 'estacao_A', publishAt: at(tomorrow, '06:00'), until: at(tomorrow, '09:00'), createdBy: 'Rui Costa' },
    { id: 'n3', parkId: 'estacao', kind: 'informacao', title: 'Manutenção concluída', message: 'O acesso pela Rua da Estação foi reposto.', audience: 'todos', publishAt: at(today - DAY, '09:00'), until: at(today - DAY, '17:00'), createdBy: 'Rui Costa' },
  ];

  return {
    seedDay: dayKey(nowTs),
    sessionUserId: null,
    selectedParkId: 'estacao',
    users, vehicles, parks, bookings, passes, notices,
    notifications: [
      { id: 'nt1', userId: ines.id, title: 'Reserva confirmada', body: 'O lugar A12 está garantido para amanhã, das 09:00 às 11:45.', createdAt: nowTs - 2 * DAY, read: true },
      { id: 'nt2', userId: ines.id, title: 'Circulação condicionada no Piso 0', body: 'Utilize a rampa norte durante a manutenção da sinalização.', createdAt: at(today, '08:00') < nowTs ? at(today, '08:00') : nowTs - 30 * MIN, read: false },
    ],
    detections: [
      { id: 'd1', parkId: 'estacao', spotId: unk1.spotId, plate: '98-ZX-76', detectedAt: T(-13), resolved: false },
      { id: 'd2', parkId: 'estacao', spotId: unk2.spotId, plate: '12-UV-34', detectedAt: T(-5), resolved: false },
    ],
    extras: [],
    activity: [
      { id: 'a1', userId: 'gestor_rui', text: 'Validou uma reserva', at: T(-13) },
      { id: 'a2', userId: 'gestor_rui', text: 'Bloqueou o lugar A10', at: T(-225) },
      { id: 'a3', userId: 'gestor_rui', text: 'Iniciou sessão', at: at(today, '08:02') < nowTs ? at(today, '08:02') : T(-60) },
    ],
  };
}
