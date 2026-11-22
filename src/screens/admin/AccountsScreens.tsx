import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute } from '@react-navigation/native';
import {
  Avatar, Badge, Button, Card, ChipGroup, ConfirmSheet, Divider, EmptyState, InfoBox, InfoRow, OptionCard, SectionTitle, StatCard, TextField, statusBadge,
} from '../../components';
import { colors } from '../../theme';
import { useApp, useMe } from '../../store/AppContext';
import { spotLabel, userById, vehicleById, vehiclesOf } from '../../store/selectors';
import { AProps, AdminDrawerParams, useANav } from '../../navigation/types';
import { DAY, at, dateShort, dateTime, euro, startOfDay, time, uid } from '../../utils/format';
import { Booking } from '../../types/models';
import { overtimeMinutes } from '../../utils/rules';
import { AdminScreen } from './AdminScreen';

const PAGE = 6;

/** RFA2: gestão das contas de utentes e gestores. */
export function AccountsScreen() {
  const nav = useANav();
  const route = useRoute<RouteProp<AdminDrawerParams, 'Contas'>>();
  const { state, now, dispatch } = useApp();
  const me = useMe();
  const [tab, setTab] = useState<'utentes' | 'gestores' | 'validar'>(route.params?.tab ?? 'utentes');
  const [q, setQ] = useState('');
  const [park, setPark] = useState('todos');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  React.useEffect(() => { if (route.params?.tab) setTab(route.params.tab); }, [route.params?.tab]);

  const inPark = (uId: string, role: string) => park === 'todos' || (role === 'gestor'
    ? state.users.find((u) => u.id === uId)?.parkIds.includes(park)
    : state.bookings.some((b) => b.userId === uId && b.parkId === park));
  const list = state.users
    .filter((u) => (tab === 'gestores' ? u.role === 'gestor' : u.role === 'utente') && (tab !== 'validar' || u.status === 'por_validar'))
    .filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()) && inPark(u.id, u.role))
    .sort((a, b) => (a.status === 'por_validar' ? -1 : 0) - (b.status === 'por_validar' ? -1 : 0) || a.name.localeCompare(b.name));
  const pending = state.users.filter((u) => u.status === 'por_validar').length;
  const pageItems = tab === 'validar' ? list : list.slice(page * PAGE, page * PAGE + PAGE);
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <AdminScreen title="Contas" subtitle="Consulte e faça a gestão de todas as contas."
      footer={tab === 'validar' && selected.length > 0
        ? <Button title={`Validar ${selected.length} contas selecionadas`} icon="checkmark-done" onPress={() => { selected.forEach((id) => dispatch({ type: 'SET_USER_STATUS', userId: id, status: 'ativa', by: me.id, now })); setSelected([]); }} />
        : tab !== 'validar' ? <Button title="Criar conta de gestor" icon="person-add-outline" onPress={() => nav.navigate('CreateManager')} /> : undefined}>
      <ChipGroup value={tab} onChange={(t) => { setTab(t); setPage(0); setSelected([]); }} options={[
        { value: 'utentes', label: 'Utentes' }, { value: 'gestores', label: 'Gestores' }, { value: 'validar', label: `Por validar · ${pending}` },
      ]} />
      <TextField placeholder="Pesquisar por nome ou email" icon="search" value={q} onChangeText={(t) => { setQ(t); setPage(0); }} />
      <ChipGroup value={park} onChange={(p) => { setPark(p); setPage(0); }} options={[{ value: 'todos', label: 'Todos os parques' }, ...state.parks.map((p) => ({ value: p.id, label: p.name.replace('Parque ', '').replace('Municipal da ', '').replace('do ', '') }))]} />
      <Text style={{ color: colors.muted, marginBottom: 8 }}>{list.length} {tab === 'gestores' ? 'gestores' : tab === 'validar' ? 'registos aguardam a sua decisão' : 'utentes'}</Text>
      {list.length === 0 && <EmptyState icon="people-outline" title="Sem contas" text="Nada para mostrar neste filtro." />}
      {pageItems.map((u) => {
        const sb = statusBadge.account(u.status);
        if (tab === 'validar') {
          const on = selected.includes(u.id);
          return (
            <Card key={u.id} style={on ? { borderColor: colors.primary } : undefined}>
              <Pressable onPress={() => toggle(u.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '800' }}>{u.name}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12.5 }}>{u.email} · Utente · {dateShort(u.createdAt)}</Text>
                </View>
                <Badge {...sb} />
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <Button title="Validar" small onPress={() => dispatch({ type: 'SET_USER_STATUS', userId: u.id, status: 'ativa', by: me.id, now })} style={{ flex: 1 }} />
                <Button title="Recusar" small variant="secondary" onPress={() => dispatch({ type: 'SET_USER_STATUS', userId: u.id, status: 'suspensa', by: me.id, now })} style={{ flex: 1 }} />
              </View>
            </Card>
          );
        }
        return (
          <Card key={u.id} onPress={() => nav.navigate('AccountDetail', { id: u.id })} style={{ paddingVertical: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar name={u.name} uri={u.photoUri} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800' }}>{u.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 12.5 }}>{u.email}</Text>
                <Text style={{ color: colors.faint, fontSize: 12 }}>{u.role === 'gestor' ? `Gestor · ${u.parkIds.length} parque(s)` : 'Utente'}</Text>
              </View>
              <Badge {...sb} />
            </View>
          </Card>
        );
      })}
      {tab !== 'validar' && list.length > PAGE && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button title="← Anterior" variant="link" disabled={page === 0} onPress={() => setPage(page - 1)} />
          <Text style={{ color: colors.muted }}>{page * PAGE + 1}–{Math.min(list.length, (page + 1) * PAGE)} de {list.length}</Text>
          <Button title="Seguinte →" variant="link" disabled={(page + 1) * PAGE >= list.length} onPress={() => setPage(page + 1)} />
        </View>
      )}
    </AdminScreen>
  );
}

export function AccountDetailScreen({ route, navigation }: AProps<'AccountDetail'>) {
  const { state, now, dispatch } = useApp();
  const me = useMe();
  const [del, setDel] = useState(false);
  const [editParks, setEditParks] = useState(false);
  const u = userById(state, route.params.id);
  if (!u) return <AdminScreen back title="Ficha de conta"><EmptyState icon="trash-outline" title="Conta eliminada" text="Esta conta já não existe." /></AdminScreen>;
  const sb = statusBadge.account(u.status);
  const activity = state.activity.filter((a) => a.userId === u.id).slice(0, 4);
  const vs = vehiclesOf(state, u.id);
  const bookings = state.bookings.filter((b) => b.userId === u.id);
  const paid = bookings.filter((b) => b.paid && b.status !== 'cancelada').reduce((a, b) => a + b.amount, 0);

  return (
    <AdminScreen back title="Ficha de conta">
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={u.name} uri={u.photoUri} size={52} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', fontSize: 17 }}>{u.name}</Text>
            <Text style={{ color: colors.muted }}>{u.role === 'gestor' ? 'Gestor' : u.role === 'admin' ? 'Administrador' : 'Utente'}</Text>
          </View>
          <Badge {...sb} />
        </View>
        <Divider />
        <InfoRow label="Email" value={u.email} />
        <InfoRow label="Telemóvel" value={u.phone} />
        <InfoRow label="Data de registo" value={dateShort(u.createdAt)} />
      </Card>
      {u.role === 'gestor' && (
        <>
          <SectionTitle title="Parques atribuídos" action={editParks ? 'Concluir' : 'Alterar'} onAction={() => setEditParks((e) => !e)} />
          <Card>
            {state.parks.map((p) => {
              const on = u.parkIds.includes(p.id);
              if (!editParks && !on) return null;
              return editParks
                ? <OptionCard key={p.id} label={p.name} active={on} onPress={() => dispatch({ type: 'UPDATE_USER', userId: u.id, patch: { parkIds: on ? u.parkIds.filter((x) => x !== p.id) : [...u.parkIds, p.id] } })} />
                : <Text key={p.id} style={{ paddingVertical: 3 }}>{p.name}</Text>;
            })}
          </Card>
        </>
      )}
      {u.role === 'utente' && (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <StatCard value={vs.length} label="Veículos" />
          <StatCard value={bookings.length} label="Reservas" />
          <StatCard value={euro(paid)} label="Total pago" />
        </View>
      )}
      <SectionTitle title="Atividade recente" />
      <Card>
        {activity.map((a) => <InfoRow key={a.id} label={dateTime(a.at)} value={a.text} />)}
        {activity.length === 0 && <Text style={{ color: colors.muted }}>Sem atividade registada.</Text>}
      </Card>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        {u.status === 'suspensa'
          ? <Button title="Reativar conta" style={{ flex: 1 }} onPress={() => dispatch({ type: 'SET_USER_STATUS', userId: u.id, status: 'ativa', by: me.id, now })} />
          : <Button title="Suspender conta" variant="secondary" style={{ flex: 1 }} onPress={() => dispatch({ type: 'SET_USER_STATUS', userId: u.id, status: 'suspensa', by: me.id, now })} />}
      </View>
      {u.id !== me.id && <Button title="Eliminar conta" variant="ghost" icon="trash-outline" onPress={() => setDel(true)} />}

      <ConfirmSheet visible={del} onClose={() => setDel(false)} title={`Eliminar a conta de ${u.name}?`} confirmLabel="Eliminar conta"
        text={`Esta ação é definitiva. ${u.name} perde o acesso à app${u.role === 'gestor' ? ' e deixa de estar atribuído aos seus parques' : ''}. O histórico de reservas mantém-se.`}
        onConfirm={() => { dispatch({ type: 'DELETE_USER', userId: u.id }); setDel(false); navigation.goBack(); }}>
        <InfoBox text="Prefere suspender a conta? Pode reativá-la mais tarde." />
        <Button title="Suspender em vez de eliminar" variant="link" onPress={() => { dispatch({ type: 'SET_USER_STATUS', userId: u.id, status: 'suspensa', by: me.id, now }); setDel(false); }} />
      </ConfirmSheet>
    </AdminScreen>
  );
}

export function CreateManagerScreen({ navigation }: AProps<'CreateManager'>) {
  const { state, dispatch } = useApp();
  const [f, setF] = useState({ name: '', email: '', phone: '' });
  const [parks, setParks] = useState<string[]>([]);
  const exists = state.users.some((u) => u.email === f.email.trim().toLowerCase());
  const valid = f.name.trim().split(' ').length > 1 && /^\S+@\S+\.\S+$/.test(f.email) && !exists && f.phone.replace(/\D/g, '').length >= 9 && parks.length > 0;
  const create = () => {
    dispatch({ type: 'CREATE_MANAGER', user: { id: uid('g'), role: 'gestor', name: f.name.trim(), email: f.email.trim().toLowerCase(), phone: f.phone, password: 'gestor123', status: 'ativa', parkIds: parks, createdAt: Date.now() } });
    navigation.goBack();
  };
  return (
    <AdminScreen back title="Criar conta de gestor" subtitle="Preencha os dados e atribua os parques." footer={<Button title="Criar e enviar convite" icon="send" disabled={!valid} onPress={create} />}>
      <TextField label="Nome completo" value={f.name} onChangeText={(t) => setF({ ...f, name: t })} />
      <TextField label="Email" value={f.email} onChangeText={(t) => setF({ ...f, email: t })} autoCapitalize="none" error={exists ? 'Já existe uma conta com este email.' : null} />
      <TextField label="Telemóvel" value={f.phone} onChangeText={(t) => setF({ ...f, phone: t })} keyboardType="phone-pad" />
      <SectionTitle title="Parques atribuídos" action={`${parks.length} selecionados`} />
      <Text style={{ color: colors.muted, marginBottom: 8 }}>Pode atribuir mais do que um parque.</Text>
      {state.parks.map((p) => (
        <OptionCard key={p.id} label={p.name} sub={p.address} active={parks.includes(p.id)} onPress={() => setParks((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))} />
      ))}
      <InfoBox text="O convite por email permite definir a palavra-passe e ativar a conta. Na demonstração, a palavra-passe inicial é gestor123." />
    </AdminScreen>
  );
}

/** RFA3: todos os veículos estacionados e que alguma vez usaram os parques. */
export function VehiclesScreen() {
  const nav = useANav();
  const { state } = useApp();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'todos' | 'agora'>('todos');
  const [page, setPage] = useState(0);
  const used = state.vehicles
    .map((v) => {
      const bs = state.bookings.filter((b) => b.vehicleId === v.id && b.status !== 'cancelada').sort((a, b) => b.start - a.start);
      return { v, visits: bs.length, last: bs[0], live: bs.find((b) => b.status === 'em_curso') };
    })
    .filter((x) => x.visits > 0)
    .filter((x) => (tab === 'agora' ? !!x.live : true) && x.v.plate.replace(/-/g, '').includes(q.toUpperCase().replace(/-/g, '')))
    .sort((a, b) => Number(!!b.live) - Number(!!a.live) || (b.last?.start ?? 0) - (a.last?.start ?? 0));
  const items = used.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <AdminScreen title="Veículos" subtitle="Todos os veículos com utilização dos parques.">
      <TextField placeholder="Pesquisar por matrícula" icon="search" value={q} onChangeText={(t) => { setQ(t); setPage(0); }} autoCapitalize="characters" />
      <ChipGroup value={tab} onChange={(t) => { setTab(t); setPage(0); }} options={[{ value: 'todos', label: 'Todos' }, { value: 'agora', label: 'No parque agora' }]} />
      <Text style={{ color: colors.muted, marginBottom: 8 }}>{used.length} veículos · Todos os parques</Text>
      {items.map(({ v, visits, last, live }) => (
        <Card key={v.id} onPress={() => nav.navigate('VehicleDetail', { id: v.id })}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '900', fontSize: 16 }}>{v.plate}</Text>
            {live ? <Badge label="No parque" tone="primary" /> : <Text style={{ color: colors.muted }}>{visits} visitas</Text>}
          </View>
          <Text>{userById(state, v.ownerId)?.name ?? 'Utente por identificar'}</Text>
          <Text style={{ color: colors.muted, fontSize: 12.5 }}>{v.type === 'automovel' ? 'Automóvel' : 'Motociclo'} · {v.model}</Text>
          {last && <Text style={{ color: colors.muted, fontSize: 12.5 }}>{state.parks.find((p) => p.id === last.parkId)?.area} · {live ? `Entrada hoje, ${time(live.checkIn ?? live.start)}` : `Última visita: ${dateShort(last.start)}`}</Text>}
        </Card>
      ))}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button title="← Anterior" variant="link" disabled={page === 0} onPress={() => setPage(page - 1)} />
        <Text style={{ color: colors.muted }}>{used.length ? page * PAGE + 1 : 0}–{Math.min(used.length, (page + 1) * PAGE)} de {used.length}</Text>
        <Button title="Seguinte →" variant="link" disabled={(page + 1) * PAGE >= used.length} onPress={() => setPage(page + 1)} />
      </View>
    </AdminScreen>
  );
}

export function VehicleDetailScreen({ route, navigation }: AProps<'VehicleDetail'>) {
  const { state } = useApp();
  const v = vehicleById(state, route.params.id)!;
  const owner = userById(state, v.ownerId);
  const bs = state.bookings.filter((b) => b.vehicleId === v.id && b.status !== 'cancelada').sort((a, b) => b.start - a.start);
  const live = bs.find((b) => b.status === 'em_curso');
  const total = bs.filter((b) => b.paid).reduce((a, b) => a + b.amount, 0);
  const lastPerPark = state.parks.map((p) => ({ p, b: bs.find((b) => b.parkId === p.id) })).filter((x) => x.b);
  return (
    <AdminScreen back title="Ficha do veículo">
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontWeight: '900', fontSize: 22 }}>{v.plate}</Text>
          {live && <Badge label="No parque" tone="primary" />}
        </View>
        <Text style={{ color: colors.muted }}>{v.type === 'automovel' ? 'Automóvel' : 'Motociclo'} · {v.model}</Text>
        <Divider />
        <Pressable disabled={!owner} onPress={() => owner && navigation.navigate('AccountDetail', { id: owner.id })}>
          <InfoRow label="Utente associado" value={owner ? `${owner.name} →` : 'Por identificar'} />
        </Pressable>
        {owner && <Text style={{ color: colors.muted, fontSize: 12.5, textAlign: 'right' }}>{owner.email}</Text>}
      </Card>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <StatCard value={bs.length} label="Visitas desde o registo" />
        <StatCard value={euro(total)} label="Total pago na app" />
      </View>
      {bs[0] && (
        <Card>
          <Text style={{ color: colors.muted }}>Última entrada</Text>
          <Text style={{ fontWeight: '800' }}>{dateTime(bs[0].checkIn ?? bs[0].start)}</Text>
          <Text style={{ color: colors.muted }}>{state.parks.find((p) => p.id === bs[0].parkId)?.name} · {spotLabel(state, bs[0].spotId)?.code}</Text>
        </Card>
      )}
      <SectionTitle title="Estadias por parque" action="Última em cada parque" />
      {lastPerPark.map(({ p, b }) => (
        <Card key={p.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '800', flex: 1 }}>{p.name}</Text>
            <Text style={{ fontWeight: '800' }}>{euro(b!.amount)}</Text>
          </View>
          <Text style={{ color: colors.muted }}>{dateShort(b!.start)} · {time(b!.start)}–{time(b!.end)} · {b!.status === 'em_curso' ? 'Em curso' : 'Concluída'} · {b!.type === 'avenca' ? 'Avença' : b!.type === 'imediata' ? 'Pago à saída' : 'Pago na reserva'}</Text>
        </Card>
      ))}
    </AdminScreen>
  );
}

type HStatus = 'todos' | 'concluida' | 'cancelada' | 'incumprimento' | 'em_curso';

/** RFA5: histórico de reservas com filtros e reset. */
export function HistoryScreen() {
  const nav = useANav();
  const { state, now } = useApp();
  const [park, setPark] = useState('todos');
  const [period, setPeriod] = useState<'hoje' | 'ontem' | '7' | '30'>('ontem');
  const [status, setStatus] = useState<HStatus>('todos');
  const [type, setType] = useState<'todos' | Booking['type']>('todos');
  const [page, setPage] = useState(0);
  const today = startOfDay(now);
  const range = { hoje: [today, today + DAY], ontem: [today - DAY, today], '7': [today - 6 * DAY, today + DAY], '30': [today - 29 * DAY, today + DAY] }[period];
  const st = (b: Booking): Exclude<HStatus, 'todos'> => (overtimeMinutes(b, now) > 0 ? 'incumprimento' : b.status === 'confirmada' ? 'em_curso' : (b.status as Exclude<HStatus, 'todos'>));
  const list = state.bookings
    .filter((b) => b.start >= range[0] && b.start < range[1] && (park === 'todos' || b.parkId === park) && (type === 'todos' || b.type === type))
    .filter((b) => status === 'todos' || st(b) === status)
    .sort((a, b) => b.start - a.start);
  const paid = list.filter((b) => b.paid).reduce((a, b) => a + b.amount, 0);
  const refunded = list.reduce((a, b) => a + (b.refunded ?? 0), 0);
  const items = list.slice(page * PAGE, page * PAGE + PAGE);
  const badge = (b: Booking) => {
    const s = st(b);
    return s === 'incumprimento' ? { label: 'Em incumprimento', tone: 'danger' as const }
      : s === 'cancelada' ? { label: b.refunded ? 'Reembolsada' : 'Cancelada', tone: 'warning' as const }
        : s === 'em_curso' ? { label: b.status === 'confirmada' ? 'Confirmada' : 'Em curso', tone: 'primary' as const }
          : { label: 'Concluída', tone: 'success' as const };
  };

  return (
    <AdminScreen title="Histórico" subtitle="Reservas de todos os parques.">
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <StatCard value={list.length} label="Reservas no período" />
        <StatCard value={euro(paid - refunded)} label={`Receita líquida · Reemb. ${euro(refunded)}`} />
      </View>
      <ChipGroup value={period} onChange={(v) => { setPeriod(v); setPage(0); }} options={[{ value: 'hoje', label: 'Hoje' }, { value: 'ontem', label: 'Ontem' }, { value: '7', label: '7 dias' }, { value: '30', label: '30 dias' }]} />
      <ChipGroup value={park} onChange={(v) => { setPark(v); setPage(0); }} options={[{ value: 'todos', label: 'Todos os parques' }, ...state.parks.map((p) => ({ value: p.id, label: p.area }))]} />
      <ChipGroup value={status} onChange={(v) => { setStatus(v); setPage(0); }} options={[
        { value: 'todos', label: 'Todos os estados' }, { value: 'concluida', label: 'Concluída' }, { value: 'em_curso', label: 'Ativa' }, { value: 'cancelada', label: 'Cancelada/Reembolsada' }, { value: 'incumprimento', label: 'Em incumprimento' },
      ]} />
      <ChipGroup value={type} onChange={(v) => { setType(v); setPage(0); }} options={[
        { value: 'todos', label: 'Todos os tipos' }, { value: 'antecipada', label: 'Antecipada' }, { value: 'imediata', label: 'Entrada imediata' }, { value: 'avenca', label: 'Avença' },
      ]} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ color: colors.muted }}>{list.length} reservas encontradas</Text>
        <Pressable onPress={() => nav.navigate('HistoryReset')}><Text style={{ color: colors.danger, fontWeight: '700' }}>Reset do histórico →</Text></Pressable>
      </View>
      {items.map((b) => {
        const v = vehicleById(state, b.vehicleId);
        return (
          <Card key={b.id} style={{ paddingVertical: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontWeight: '800', flex: 1 }}>{userById(state, b.userId)?.name ?? 'Por identificar'} · {v?.plate}</Text>
              <Badge {...badge(b)} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
              <Text style={{ color: colors.muted }}>{state.parks.find((p) => p.id === b.parkId)?.area} · {time(b.start)}–{time(b.end)}</Text>
              <Text style={{ fontWeight: '800' }}>{euro(b.status === 'cancelada' ? 0 : b.amount)}</Text>
            </View>
            <Text style={{ color: colors.faint, fontSize: 12 }}>{b.code} · {dateShort(b.start)} · {b.type === 'antecipada' ? 'Antecipada' : b.type === 'imediata' ? 'Entrada imediata' : 'Avença'}</Text>
          </Card>
        );
      })}
      {list.length > PAGE && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button title="← Anterior" variant="link" disabled={page === 0} onPress={() => setPage(page - 1)} />
          <Text style={{ color: colors.muted }}>{page * PAGE + 1}–{Math.min(list.length, (page + 1) * PAGE)} de {list.length}</Text>
          <Button title="Seguinte →" variant="link" disabled={(page + 1) * PAGE >= list.length} onPress={() => setPage(page + 1)} />
        </View>
      )}
    </AdminScreen>
  );
}

export function HistoryResetScreen({ navigation }: AProps<'HistoryReset'>) {
  const { state, now, dispatch } = useApp();
  const [park, setPark] = useState(state.parks[0].id);
  const [months, setMonths] = useState<'1' | '2' | 'tudo'>('1');
  const [confirm, setConfirm] = useState('');
  const today = startOfDay(now);
  const to = today - (months === '1' ? 7 : 0) * DAY; // mantém sempre a última semana se "1 mês"
  const from = months === 'tudo' ? 0 : at(today - (months === '1' ? 30 : 60) * DAY, '00:00');
  const end = months === 'tudo' ? today : to;
  const count = state.bookings.filter((b) => b.parkId === park && b.start >= from && b.start < end && (b.status === 'concluida' || b.status === 'cancelada')).length;
  return (
    <AdminScreen back title="Reset do histórico" subtitle="Eliminação permanente de reservas.">
      <InfoBox tone="danger" title="Ação irreversível" text="Esta ação apaga definitivamente as reservas selecionadas e não pode ser anulada. Reservas ativas e futuras nunca são apagadas." />
      <Text style={{ fontWeight: '700', marginBottom: 6 }}>Parque</Text>
      <ChipGroup value={park} onChange={setPark} options={state.parks.map((p) => ({ value: p.id, label: p.name }))} />
      <Text style={{ fontWeight: '700', marginBottom: 6 }}>Período</Text>
      <ChipGroup value={months} onChange={setMonths} scroll={false} options={[
        { value: '1', label: 'Dias 30 a 8 atrás' }, { value: '2', label: 'Últimos 60 dias' }, { value: 'tudo', label: 'Tudo até hoje' },
      ]} />
      <Card>
        <InfoRow label="Reservas selecionadas" value={`${count} reservas`} strong />
        <Text style={{ color: colors.muted, fontSize: 12.5 }}>Concluídas e canceladas · {state.parks.find((p) => p.id === park)?.name}{months === 'tudo' ? '' : `, de ${dateShort(from)} a ${dateShort(end - 1)}`}</Text>
      </Card>
      <TextField label={`Para eliminar estas ${count} reservas, escreva RESET.`} value={confirm} onChangeText={setConfirm} autoCapitalize="characters" />
      <Button title={`Eliminar ${count} reservas definitivamente`} variant="danger" disabled={confirm !== 'RESET' || count === 0}
        onPress={() => { dispatch({ type: 'RESET_HISTORY', parkId: park, from, to: end }); navigation.goBack(); }} />
      <Button title="Cancelar e voltar ao histórico" variant="ghost" onPress={() => navigation.goBack()} />
    </AdminScreen>
  );
}

export function AdminProfileScreen() {
  const { state, dispatch } = useApp();
  const me = useMe();
  const [f, setF] = useState({ name: me.name, phone: me.phone, password: '' });
  const [saved, setSaved] = useState(false);
  const total = state.parks.reduce((a, p) => a + p.floors.reduce((x, fl) => x + fl.spots.length, 0), 0);
  return (
    <AdminScreen title="O meu perfil" subtitle="Dados e segurança da sua conta de administrador.">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <Avatar name={f.name} uri={me.photoUri} size={64} />
        <View><Text style={{ fontWeight: '800', fontSize: 17 }}>{f.name}</Text><Text style={{ color: colors.muted }}>{me.email}</Text></View>
      </View>
      <TextField label="Nome" value={f.name} onChangeText={(t) => { setF({ ...f, name: t }); setSaved(false); }} />
      <TextField label="Telemóvel" value={f.phone} onChangeText={(t) => { setF({ ...f, phone: t }); setSaved(false); }} />
      <TextField label="Nova palavra-passe" value={f.password} onChangeText={(t) => setF({ ...f, password: t })} secure hint="Deixe em branco para manter." />
      <Button title={saved ? 'Alterações guardadas ✓' : 'Guardar alterações'} onPress={() => { dispatch({ type: 'UPDATE_USER', userId: me.id, patch: { name: f.name, phone: f.phone, ...(f.password ? { password: f.password } : {}) } }); setSaved(true); }} />
      <Card style={{ marginTop: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontWeight: '800' }}>Acesso à administração</Text>
          <Badge label="Administradora" />
        </View>
        <Text style={{ color: colors.muted }}>Gestão de todos os parques de Bragança.</Text>
        <InfoRow label="Âmbito" value={`${state.parks.length} parques · ${total} lugares`} />
      </Card>
      <Button title="Terminar sessão" variant="secondary" icon="log-out-outline" onPress={() => dispatch({ type: 'LOGOUT' })} />
    </AdminScreen>
  );
}
