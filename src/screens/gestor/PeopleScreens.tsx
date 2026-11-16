import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  Avatar, Badge, Button, Card, ChipGroup, ConfirmSheet, Divider, EmptyState, InfoBox, InfoRow, ListItem, OptionCard, SectionTitle, TextField, statusBadge,
} from '../../components';
import { colors } from '../../theme';
import { useApp, useMe } from '../../store/AppContext';
import { activePass, bookingsOf, incidents, spotLabel, userById, vehicleById, vehiclesOf } from '../../store/selectors';
import { GProps, useGNav } from '../../navigation/types';
import { HOUR, MIN, at, dateShort, dateTime, euro, isValidPlate, normalizePlate, time, uid } from '../../utils/format';
import { fractions, fractionValue } from '../../utils/rules';
import { Audience, NoticeKind } from '../../types/models';
import { GestorScreen } from './GestorScreen';

// ------------------------------------------------------------------ Utentes (RFG2)

export function UsersScreen() {
  const nav = useGNav();
  const { state, park, now, dispatch } = useApp();
  const me = useMe();
  const [tab, setTab] = useState<'todos' | 'validar' | 'suspensos'>('todos');
  const [q, setQ] = useState('');
  const utentes = state.users.filter((u) => u.role === 'utente');
  const match = (u: (typeof utentes)[number]) =>
    `${u.name} ${vehiclesOf(state, u.id).map((v) => v.plate).join(' ')}`.toLowerCase().includes(q.toLowerCase());
  const pending = utentes.filter((u) => u.status === 'por_validar');
  const list = utentes
    .filter((u) => (tab === 'todos' ? u.status !== 'por_validar' : tab === 'validar' ? u.status === 'por_validar' : u.status === 'suspensa'))
    .filter(match)
    // Primeiro quem tem atividade neste parque
    .sort((a, b) => Number(state.bookings.some((x) => x.userId === b.id && x.parkId === park.id && x.end > now)) - Number(state.bookings.some((x) => x.userId === a.id && x.parkId === park.id && x.end > now)));

  return (
    <GestorScreen title="Utentes" subtitle={tab === 'validar' ? 'Valide os novos registos do parque.' : 'Consulte contas, viaturas e reservas.'}>
      <TextField placeholder="Pesquisar por nome ou matrícula" icon="search" value={q} onChangeText={setQ} />
      <ChipGroup value={tab} onChange={setTab} options={[
        { value: 'todos', label: 'Todos' }, { value: 'validar', label: `Por validar · ${pending.length}` }, { value: 'suspensos', label: 'Suspensos' },
      ]} />
      <Text style={{ color: colors.muted, marginBottom: 8 }}>{list.length} {tab === 'validar' ? 'novos registos por validar' : 'utentes'}</Text>
      {list.length === 0 && <EmptyState icon="people-outline" title="Sem utentes" text={tab === 'validar' ? 'Não há registos por validar.' : 'Nenhum utente corresponde à pesquisa.'} />}
      {list.slice(0, 30).map((u) => {
        const vs = vehiclesOf(state, u.id);
        const live = state.bookings.find((b) => b.userId === u.id && b.parkId === park.id && (b.status === 'em_curso' || (b.status === 'confirmada' && b.end > now)));
        const sb = statusBadge.account(u.status);
        if (tab === 'validar') {
          return (
            <Card key={u.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontWeight: '800', fontSize: 15 }}>{u.name}</Text>
                <Badge {...sb} />
              </View>
              <Text style={{ color: colors.muted }}>{u.email}</Text>
              <Text style={{ color: colors.muted }}>{u.phone}</Text>
              <Text style={{ color: colors.muted }}>{vs.map((v) => `${v.plate} · ${v.model}`).join(', ')}</Text>
              <Text style={{ color: colors.faint, fontSize: 12, marginBottom: 10 }}>Registado {dateShort(u.createdAt)}</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button title="Validar" small icon="checkmark" onPress={() => dispatch({ type: 'SET_USER_STATUS', userId: u.id, status: 'ativa', by: me.id, now })} style={{ flex: 1 }} />
                <Button title="Recusar" small variant="secondary" onPress={() => dispatch({ type: 'SET_USER_STATUS', userId: u.id, status: 'suspensa', by: me.id, now })} style={{ flex: 1 }} />
              </View>
            </Card>
          );
        }
        return (
          <Card key={u.id} onPress={() => nav.navigate('UserDetail', { id: u.id })} style={{ paddingVertical: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar name={u.name} uri={u.photoUri} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800' }}>{u.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 12.5 }}>{vs.map((v) => v.plate).join(' · ') || 'Sem veículos'}</Text>
                {live && <Text style={{ color: colors.primary, fontSize: 12.5 }}>{live.status === 'em_curso' ? 'No parque' : 'Reserva ativa'} · {spotLabel(state, live.spotId)?.code} · {spotLabel(state, live.spotId)?.floor}</Text>}
              </View>
              <Badge {...(u.status === 'ativa' ? { label: 'Validado', tone: 'success' as const } : sb)} />
            </View>
          </Card>
        );
      })}
    </GestorScreen>
  );
}

export function UserDetailScreen({ route, navigation }: GProps<'UserDetail'>) {
  const { state, park, now, dispatch } = useApp();
  const me = useMe();
  const [confirm, setConfirm] = useState(false);
  const u = userById(state, route.params.id);
  if (!u) return <GestorScreen back title="Ficha do utente"><EmptyState icon="person-outline" title="Conta removida" text="Este utente já não existe." /></GestorScreen>;
  const vs = vehiclesOf(state, u.id);
  const all = bookingsOf(state, u.id);
  const active = all.filter((b) => b.status === 'em_curso' || (b.status === 'confirmada' && b.end > now));
  const pass = activePass(state, u.id, park.id, now);
  const payments = all.filter((b) => b.paid && b.amount > 0).slice(0, 5);
  const sb = statusBadge.account(u.status);

  return (
    <GestorScreen back title="Ficha do utente" hidePark>
      <Card>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Avatar name={u.name} uri={u.photoUri} size={52} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', fontSize: 17 }}>{u.name}</Text>
            <Text style={{ color: colors.muted, fontSize: 12.5 }}>{u.email} · {u.phone}</Text>
          </View>
          <Badge {...sb} />
        </View>
        <Divider />
        <InfoRow label="NIF" value={u.nif ?? '—'} />
        <InfoRow label="Registo desde" value={dateShort(u.createdAt)} />
      </Card>
      <SectionTitle title="Veículos" />
      <Card>{vs.map((v) => <InfoRow key={v.id} label={v.plate} value={v.model} />)}</Card>
      <SectionTitle title="Reservas ativas" />
      {active.length === 0 && <Text style={{ color: colors.muted, marginBottom: 10 }}>Sem reservas ativas.</Text>}
      {active.map((b) => (
        <Card key={b.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '800' }}>{spotLabel(state, b.spotId)?.code} · {spotLabel(state, b.spotId)?.floor} · {vehicleById(state, b.vehicleId)?.plate}</Text>
            <Badge {...statusBadge.booking(b.status)} />
          </View>
          <Text style={{ color: colors.muted }}>{dateShort(b.start)} · {time(b.start)}–{time(b.end)} · {b.paid ? `${euro(b.amount)} · Pago na app` : 'Pagamento à saída'}</Text>
        </Card>
      ))}
      <SectionTitle title="Avença" />
      <Card>
        {pass ? <InfoRow label={pass.plan === '24h' ? 'Mensal 24 horas' : 'Mensal diurna'} value={`até ${dateShort(pass.to)}`} /> : <Text style={{ color: colors.muted }}>Sem avença neste parque.</Text>}
      </Card>
      <SectionTitle title="Histórico de pagamentos" />
      <Card>
        {payments.map((b) => <InfoRow key={b.id} label={`${dateShort(b.start)} · Reserva ${spotLabel(state, b.spotId)?.code}`} value={`${euro(b.amount)} · Pago`} />)}
        {payments.length === 0 && <Text style={{ color: colors.muted }}>Sem pagamentos.</Text>}
      </Card>
      <InfoBox text="O utente só pode alterar ou cancelar até 1 hora antes da entrada." />
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <Button title="Editar perfil" icon="create-outline" variant="secondary" onPress={() => navigation.navigate('EditUser', { id: u.id })} style={{ flex: 1 }} />
        <Button title="Enviar alerta" icon="notifications-outline" variant="secondary" onPress={() => navigation.navigate('IndividualAlert', { userId: u.id })} style={{ flex: 1 }} />
      </View>
      {u.status === 'suspensa' ? (
        <Button title="Reativar conta" onPress={() => dispatch({ type: 'SET_USER_STATUS', userId: u.id, status: 'ativa', by: me.id, now })} />
      ) : (
        <Button title="Suspender conta" variant="ghost" onPress={() => setConfirm(true)} />
      )}
      <ConfirmSheet visible={confirm} onClose={() => setConfirm(false)} title={`Suspender ${u.name}?`} text="O utente deixa de poder entrar na app e reservar. Pode reativar a conta mais tarde." confirmLabel="Suspender"
        onConfirm={() => { dispatch({ type: 'SET_USER_STATUS', userId: u.id, status: 'suspensa', by: me.id, now }); setConfirm(false); }} />
    </GestorScreen>
  );
}

/** RFG2b: editar o perfil de um utente. */
export function EditUserScreen({ route, navigation }: GProps<'EditUser'>) {
  const { state, dispatch, now } = useApp();
  const me = useMe();
  const u = userById(state, route.params.id)!;
  const [f, setF] = useState({ name: u.name, email: u.email, phone: u.phone, nif: u.nif ?? '' });
  const [validated, setValidated] = useState(u.status === 'ativa');
  const [plate, setPlate] = useState('');
  const vs = vehiclesOf(state, u.id);
  const save = () => {
    dispatch({ type: 'UPDATE_USER', userId: u.id, patch: { name: f.name, email: f.email.trim().toLowerCase(), phone: f.phone, nif: f.nif } });
    if (validated !== (u.status === 'ativa')) dispatch({ type: 'SET_USER_STATUS', userId: u.id, status: validated ? 'ativa' : 'por_validar', by: me.id, now });
    navigation.goBack();
  };
  return (
    <GestorScreen back title="Editar utente" hidePark footer={<><Button title="Guardar alterações" onPress={save} /><Button title="Cancelar" variant="ghost" onPress={() => navigation.goBack()} /></>}>
      <View style={{ alignItems: 'center', marginBottom: 12 }}><Avatar name={f.name} uri={u.photoUri} size={70} /></View>
      <TextField label="Nome" value={f.name} onChangeText={(t) => setF({ ...f, name: t })} />
      <TextField label="Email" value={f.email} onChangeText={(t) => setF({ ...f, email: t })} autoCapitalize="none" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TextField style={{ flex: 1 }} label="Telemóvel" value={f.phone} onChangeText={(t) => setF({ ...f, phone: t })} />
        <TextField style={{ flex: 1 }} label="NIF" value={f.nif} onChangeText={(t) => setF({ ...f, nif: t })} keyboardType="number-pad" />
      </View>
      <SectionTitle title="Veículos" />
      <Card>{vs.map((v) => <ListItem key={v.id} title={`${v.plate} · ${v.model}`} left={<Ionicons name="car-outline" size={20} color={colors.primary} />} chevron={false} />)}</Card>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
        <TextField style={{ flex: 1 }} placeholder="Nova matrícula" value={plate} onChangeText={(t) => setPlate(normalizePlate(t))} autoCapitalize="characters" />
        <Button title="Adicionar" small disabled={!isValidPlate(plate)} onPress={() => { dispatch({ type: 'ADD_VEHICLE', vehicle: { id: uid('v'), ownerId: u.id, plate, type: 'automovel', model: 'Automóvel' } }); setPlate(''); }} style={{ marginTop: 5 }} />
      </View>
      <SectionTitle title="Estado da conta" />
      <OptionCard label="Conta validada" sub="Pode reservar e comprar avenças" active={validated} onPress={() => setValidated((v) => !v)} icon="shield-checkmark-outline" />
      <InfoBox text="A palavra-passe só pode ser alterada pelo próprio utente." />
    </GestorScreen>
  );
}

// ------------------------------------------------------------------ Avisos

const KIND: Record<NoticeKind, { label: string; tone: 'primary' | 'warning' | 'danger' }> = {
  informacao: { label: 'Informação', tone: 'primary' }, alerta: { label: 'Alerta', tone: 'warning' }, urgente: { label: 'Urgente', tone: 'danger' },
};
const AUD: Record<Audience, string> = { todos: 'Todos os utentes do parque', reserva_hoje: 'Utentes com reserva hoje', avenca: 'Utentes com avença', piso: 'Utentes de um piso' };

export function NoticesScreen() {
  const nav = useGNav();
  const { state, park, now } = useApp();
  const list = state.notices.filter((n) => n.parkId === park.id).sort((a, b) => b.publishAt - a.publishAt);
  const st = (n: (typeof list)[number]) => (n.publishAt > now ? { label: 'Agendado', tone: 'primary' as const } : n.until < now ? { label: 'Expirado', tone: 'neutral' as const } : { label: 'Ativo', tone: 'success' as const });
  return (
    <GestorScreen title="Avisos" subtitle="Comunique com os utentes do seu parque.">
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
        <Button title="Novo aviso" icon="megaphone-outline" onPress={() => nav.navigate('NewNotice')} style={{ flex: 1 }} />
        <Button title="Alerta individual" icon="person-outline" variant="secondary" onPress={() => nav.navigate('IndividualAlert', {})} style={{ flex: 1 }} />
      </View>
      <Text style={{ color: colors.muted, marginBottom: 8 }}>{list.length} avisos no parque · {list.filter((n) => st(n).label === 'Ativo').length} ativos</Text>
      {list.map((n) => (
        <Card key={n.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Badge {...KIND[n.kind]} />
            <Badge {...st(n)} />
          </View>
          <Text style={{ fontWeight: '800', fontSize: 15 }}>{n.title}</Text>
          <Text style={{ color: colors.text, marginTop: 2 }}>{n.message}</Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>
            {AUD[n.audience]}{n.floorId ? ` · ${park.floors.find((f) => f.id === n.floorId)?.name}` : ''} · {dateShort(n.publishAt)} {time(n.publishAt)}–{time(n.until)}
          </Text>
        </Card>
      ))}
    </GestorScreen>
  );
}

export function NewNoticeScreen({ navigation }: GProps<'NewNotice'>) {
  const { park, now, dispatch } = useApp();
  const me = useMe();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [kind, setKind] = useState<NoticeKind>('informacao');
  const [audience, setAudience] = useState<Audience>('todos');
  const [floorId, setFloorId] = useState(park.floors[0].id);
  const [when, setWhen] = useState<'agora' | 'amanha'>('agora');
  const publishAt = when === 'agora' ? now : at(now + 24 * HOUR, '06:00');
  const valid = title.trim().length > 3 && message.trim().length > 5;

  const send = () => {
    dispatch({
      type: 'CREATE_NOTICE', now,
      notice: { id: uid('n'), parkId: park.id, title: title.trim(), message: message.trim(), kind, audience, floorId: audience === 'piso' ? floorId : undefined, publishAt, until: publishAt + 12 * HOUR, createdBy: me.name },
    });
    navigation.goBack();
  };

  return (
    <GestorScreen back title="Novo aviso geral" hidePark footer={<Button title={when === 'agora' ? 'Publicar aviso' : 'Agendar aviso'} icon="send" disabled={!valid} onPress={send} />}>
      <TextField label="Título" placeholder="Limpeza do Piso -1" value={title} onChangeText={setTitle} />
      <TextField label="Mensagem" placeholder="Amanhã, das 07:00 às 09:00, o Piso -1 estará em limpeza." value={message} onChangeText={setMessage} multiline style={{ minHeight: 70 }} />
      <Text style={{ fontWeight: '700', marginBottom: 6 }}>Tipo</Text>
      <ChipGroup value={kind} onChange={setKind} scroll={false} options={[{ value: 'informacao', label: 'Informação' }, { value: 'alerta', label: 'Alerta' }, { value: 'urgente', label: 'Urgente' }]} />
      <Text style={{ fontWeight: '700', marginBottom: 6 }}>Destinatários</Text>
      {(Object.keys(AUD) as Audience[]).map((a) => <OptionCard key={a} label={AUD[a]} active={audience === a} onPress={() => setAudience(a)} />)}
      {audience === 'piso' && <ChipGroup value={floorId} onChange={setFloorId} options={park.floors.map((f) => ({ value: f.id, label: f.name }))} />}
      <Text style={{ fontWeight: '700', marginBottom: 6 }}>Publicação</Text>
      <ChipGroup value={when} onChange={setWhen} scroll={false} options={[{ value: 'agora', label: 'Agora' }, { value: 'amanha', label: 'Agendar · amanhã 06:00' }]} />
      <Text style={{ fontWeight: '700', marginBottom: 6 }}>Notificação no telemóvel do utente</Text>
      <View style={{ backgroundColor: '#1F2A2E', borderRadius: 14, padding: 12, marginBottom: 12 }}>
        <Text style={{ color: '#9FB3B9', fontSize: 11 }}>ParkUPB · {when === 'agora' ? 'agora' : 'Amanhã, 06:00'}</Text>
        <Text style={{ color: '#fff', fontWeight: '800', marginTop: 2 }}>{title || 'Título do aviso'}</Text>
        <Text style={{ color: '#DDE6E8', fontSize: 13 }}>{message || 'Mensagem do aviso'}</Text>
      </View>
    </GestorScreen>
  );
}

const QUICK = ['Luzes do veículo ligadas', 'Veículo fora do lugar atribuído', 'O seu tempo termina em 15 minutos'];

export function IndividualAlertScreen({ route, navigation }: GProps<'IndividualAlert'>) {
  const { state, park, now, dispatch } = useApp();
  const me = useMe();
  const [userId, setUserId] = useState<string | undefined>(route.params?.userId);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');
  const u = userById(state, userId ?? null);
  const live = u && state.bookings.find((b) => b.userId === u.id && b.parkId === park.id && b.status === 'em_curso');
  const plate = u ? vehiclesOf(state, u.id)[0]?.plate : '';
  const results = q.length > 1
    ? state.users.filter((x) => x.role === 'utente' && `${x.name} ${vehiclesOf(state, x.id).map((v) => v.plate).join(' ')}`.toLowerCase().includes(q.toLowerCase())).slice(0, 5)
    : [];

  return (
    <GestorScreen back title="Alerta individual" subtitle="Envie uma mensagem a um utente do parque." hidePark
      footer={<Button title="Enviar alerta" icon="send" disabled={!u || msg.trim().length < 3} onPress={() => { dispatch({ type: 'SEND_ALERT', userId: u!.id, title: `Alerta do parque · ${park.name}`, body: msg.trim(), by: me.id, now }); navigation.goBack(); }} />}>
      {u ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar name={u.name} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800' }}>{u.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 12.5 }}>{plate}{live ? ` · Lugar ${spotLabel(state, live.spotId)?.code} · ${spotLabel(state, live.spotId)?.floor}` : ''}</Text>
            </View>
            <Pressable onPress={() => setUserId(undefined)}><Text style={{ color: colors.primary, fontWeight: '700' }}>Alterar</Text></Pressable>
          </View>
        </Card>
      ) : (
        <>
          <TextField placeholder="Pesquisar utente por nome ou matrícula" icon="search" value={q} onChangeText={setQ} />
          {results.map((r) => <ListItem key={r.id} title={r.name} subtitle={vehiclesOf(state, r.id).map((v) => v.plate).join(' · ')} left={<Avatar name={r.name} size={34} />} onPress={() => { setUserId(r.id); setQ(''); }} />)}
        </>
      )}
      <Text style={{ fontWeight: '700', marginVertical: 6 }}>Mensagens rápidas</Text>
      {QUICK.map((m) => (
        <OptionCard key={m} label={m} active={msg.startsWith(m)} onPress={() => setMsg(m === QUICK[0] && plate ? `As luzes do seu veículo ${plate} estão ligadas.${live ? ` Por favor, dirija-se ao lugar ${spotLabel(state, live.spotId)?.code}.` : ''}` : `${m}.`)} />
      ))}
      <TextField label="Mensagem livre" value={msg} onChangeText={setMsg} multiline style={{ minHeight: 70 }} />
      {u && <InfoBox text={`${u.name} receberá este alerta na app. A mensagem fica registada na ficha do utente.`} />}
    </GestorScreen>
  );
}

// ------------------------------------------------------------------ Incumprimento (RFG6)

export function IncidentsScreen() {
  const nav = useGNav();
  const { state, park, now, dispatch } = useApp();
  const inc = incidents(state, park, now);
  return (
    <GestorScreen back title="Incumprimento" subtitle={`Alertas do sistema · Atualizado às ${time(now)}`} hidePark>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <Badge label={`${inc.total} ativos`} tone="danger" />
        <Badge label={`${inc.overtime.length} tempos excedidos`} tone="warning" />
        <Badge label={`${inc.unknown.length} sem reserva`} tone="neutral" />
      </View>
      {inc.total === 0 && <EmptyState icon="shield-checkmark-outline" title="Sem incumprimentos" text="Todas as viaturas estão dentro do período reservado." />}
      {inc.overtime.map((i) => (
        <Card key={i.id} onPress={() => nav.navigate('IncidentDetail', { bookingId: i.booking.id })}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Ionicons name="alert-circle" size={22} color={colors.danger} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800' }}>{vehicleById(state, i.booking.vehicleId)?.plate} excedeu a saída prevista em {i.minutes} min</Text>
              <Text style={{ color: colors.muted, fontSize: 12.5 }}>{userById(state, i.booking.userId)?.name} · {spotLabel(state, i.booking.spotId)?.code} · {spotLabel(state, i.booking.spotId)?.floor}</Text>
              <Text style={{ color: colors.muted, fontSize: 12.5 }}>Saída prevista {time(i.booking.end)}{i.extra ? ` · Pagamento extra ${euro(i.extra.amount)} emitido` : ''}</Text>
            </View>
          </View>
        </Card>
      ))}
      {inc.unknown.map((i) => (
        <Card key={i.id}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Ionicons name="warning" size={22} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800' }}>Viatura sem reserva válida no lugar {spotLabel(state, i.detection.spotId)?.code}</Text>
              <Text style={{ color: colors.muted, fontSize: 12.5 }}>{i.detection.plate} · Utente por identificar · {spotLabel(state, i.detection.spotId)?.floor}</Text>
              <Text style={{ color: colors.muted, fontSize: 12.5 }}>Detetada às {time(i.detection.detectedAt)}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Button title="Acesso confirmado" small variant="secondary" onPress={() => dispatch({ type: 'RESOLVE_DETECTION', detectionId: i.id, now })} />
                <Button title="Libertar lugar" small variant="secondary" onPress={() => dispatch({ type: 'MARK_FREE', spotId: i.detection.spotId, now })} />
              </View>
            </View>
          </View>
        </Card>
      ))}
      <InfoBox text="Verifique cada ocorrência antes de alterar uma reserva ou emitir um pagamento extra." />
    </GestorScreen>
  );
}

export function IncidentDetailScreen({ route, navigation }: GProps<'IncidentDetail'>) {
  const { state, now, dispatch } = useApp();
  const b = state.bookings.find((x) => x.id === route.params.bookingId)!;
  const park = state.parks.find((p) => p.id === b.parkId)!;
  const v = vehicleById(state, b.vehicleId)!;
  const u = userById(state, b.userId);
  const sp = spotLabel(state, b.spotId)!;
  const minutes = Math.max(0, Math.floor((now - b.end) / MIN));
  const fr = fractions(b.end, now);
  const amount = fr * fractionValue(park, v.type);
  const extra = state.extras.find((e) => e.bookingId === b.id);

  return (
    <GestorScreen back title="Detalhe do incumprimento" subtitle={`Saída prevista excedida em ${minutes} min`} hidePark>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontWeight: '800', fontSize: 16 }}>{u?.name}</Text>
          <Text style={{ fontWeight: '800' }}>{v.plate}</Text>
        </View>
        <Text style={{ color: colors.muted }}>{sp.code} · {sp.floor} · Reserva {b.code}</Text>
        <Divider />
        <InfoRow label="Reserva" value={`${dateShort(b.start)} · ${time(b.start)}–${time(b.end)}`} />
        <InfoRow label="Pagamento da reserva" value={`${euro(b.amount)} · Pago na app`} />
        <Text style={{ color: colors.danger, marginTop: 4 }}>Viatura ainda presente às {time(now)}.</Text>
      </Card>
      <Card tone="warning">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontWeight: '800' }}>Valor em falta</Text>
          <Badge label={extra ? 'Emitido' : 'Por emitir'} tone={extra ? 'success' : 'warning'} />
        </View>
        <InfoRow label={`Período extra · ${dateShort(now)}`} value={`${time(b.end)}–${time(now)}`} />
        <Text style={{ color: colors.text, marginTop: 4 }}>Mesma regra da reserva: {fr} frações de 15 min × {euro(fractionValue(park, v.type))} = <Text style={{ fontWeight: '800' }}>{euro(amount)}</Text></Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>Sem taxas adicionais. Emitir não confirma o pagamento.</Text>
      </Card>
      <Button title={extra ? `Pagamento extra ${extra.code} já emitido` : `Emitir pagamento extra · ${euro(amount)}`} disabled={!!extra || amount === 0}
        onPress={() => {
          dispatch({ type: 'ISSUE_EXTRA', bookingId: b.id, minutes, amount, now });
          navigation.replace('ExtraIssued', { bookingId: b.id });
        }} />
      <View style={{ height: 10 }} />
      <Button title="Prolongar reserva até agora" variant="secondary" onPress={() => { dispatch({ type: 'UPDATE_BOOKING', bookingId: b.id, start: b.start, end: b.end + fr * 15 * MIN, spotId: b.spotId, amount: b.amount + amount, now }); navigation.goBack(); }} />
      <Text style={{ color: colors.muted, fontSize: 12, marginVertical: 6 }}>Alteração administrativa pelo gestor. O utente mantém a regra: alterar/cancelar só até 1 hora antes da entrada.</Text>
      <Button title="Notificar utente" variant="ghost" icon="notifications-outline" onPress={() => navigation.navigate('IndividualAlert', { userId: b.userId ?? undefined })} />
    </GestorScreen>
  );
}

export function ExtraIssuedScreen({ route, navigation }: GProps<'ExtraIssued'>) {
  const { state } = useApp();
  const e = state.extras.find((x) => x.bookingId === route.params.bookingId)!;
  const b = state.bookings.find((x) => x.id === e.bookingId)!;
  const sp = spotLabel(state, b.spotId)!;
  return (
    <GestorScreen back title="Pagamento extra" hidePark>
      <View style={{ alignItems: 'center', marginVertical: 12 }}>
        <Ionicons name="receipt-outline" size={40} color={colors.primary} />
        <Text style={{ fontSize: 20, fontWeight: '800', marginTop: 6 }}>Pagamento extra emitido</Text>
        <Text style={{ color: colors.muted }}>O pedido foi criado. Ainda não foi pago.</Text>
      </View>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ fontSize: 28, fontWeight: '900' }}>{euro(e.amount)}</Text>
          <Badge label="Pendente · Não pago" tone="warning" />
        </View>
        <InfoRow label="Utente" value={userById(state, b.userId)?.name ?? ''} />
        <InfoRow label="Matrícula" value={vehicleById(state, b.vehicleId)?.plate ?? ''} />
        <InfoRow label="Lugar" value={`${sp.code} · ${sp.floor}`} />
        <InfoRow label="Motivo" value={`${e.minutes} min de tempo excedido`} />
        <InfoRow label="Pedido" value={`${e.code} · ${dateTime(e.createdAt)}`} />
      </Card>
      <InfoBox tone="success" text={`${userById(state, b.userId)?.name} foi notificado na app com o motivo, o valor e o pedido de pagamento.`} />
      <Button title="Voltar aos incumprimentos" onPress={() => navigation.navigate('Incidents')} />
    </GestorScreen>
  );
}

// ------------------------------------------------------------------ Perfil do gestor (RFG2b)

export function GestorProfileScreen() {
  const { state, dispatch } = useApp();
  const me = useMe();
  const [name, setName] = useState(me.name);
  const [phone, setPhone] = useState(me.phone);
  const [photo, setPhoto] = useState(me.photoUri);
  const [pass, setPass] = useState('');
  const [saved, setSaved] = useState(false);
  const pick = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6 });
    if (!r.canceled) setPhoto(r.assets[0].uri);
  };
  return (
    <GestorScreen title="O meu perfil" subtitle="Dados e segurança da sua conta de gestor." hidePark>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <Avatar name={name} uri={photo} size={64} />
        <View>
          <Text style={{ fontWeight: '800', fontSize: 17 }}>{name}</Text>
          <Pressable onPress={pick}><Text style={{ color: colors.primary, fontWeight: '700' }}>Alterar foto</Text></Pressable>
        </View>
      </View>
      <TextField label="Nome" value={name} onChangeText={(t) => { setName(t); setSaved(false); }} />
      <TextField label="Telemóvel" value={phone} onChangeText={(t) => { setPhone(t); setSaved(false); }} />
      <TextField label="Nova palavra-passe" value={pass} onChangeText={setPass} secure hint="Deixe em branco para manter." error={pass && pass.length < 8 ? 'Pelo menos 8 caracteres.' : null} />
      <Button title={saved ? 'Alterações guardadas ✓' : 'Guardar alterações'} disabled={!!pass && pass.length < 8} onPress={() => { dispatch({ type: 'UPDATE_USER', userId: me.id, patch: { name, phone, photoUri: photo, ...(pass ? { password: pass } : {}) } }); setPass(''); setSaved(true); }} />
      <SectionTitle title="Parques atribuídos" />
      {state.parks.filter((p) => me.parkIds.includes(p.id)).map((p) => (
        <Card key={p.id}>
          <Text style={{ fontWeight: '800' }}>{p.name}</Text>
          <Text style={{ color: colors.muted }}>{p.floors.map((f) => f.name).join(' · ')} · {euro(p.prices.carHour)}/h</Text>
        </Card>
      ))}
      <Button title="Terminar sessão" variant="secondary" icon="log-out-outline" onPress={() => dispatch({ type: 'LOGOUT' })} />
      <Text style={{ textAlign: 'center', color: colors.faint, fontSize: 12, marginTop: 10 }}>ParkUPB · Área Segurança / Gestor</Text>
    </GestorScreen>
  );
}
