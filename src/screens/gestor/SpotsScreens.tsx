import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Badge, Button, Card, ChipGroup, GridItem, InfoBox, InfoRow, OptionCard, Sheet, SpotGrid, SpotLegend, TextField,
} from '../../components';
import { colors } from '../../theme';
import { useApp, useMe } from '../../store/AppContext';
import { spotLabel, userById, vehicleById } from '../../store/selectors';
import { GProps, useGNav } from '../../navigation/types';
import { HOUR, at, dateTime, euro, isValidPlate, normalizePlate, time } from '../../utils/format';
import { freeSpotsFor, spotStateNow } from '../../utils/rules';
import { Spot, SpotState } from '../../types/models';
import { GestorScreen } from './GestorScreen';

type Filter = 'todos' | SpotState;

/** RFG1a/RFG1b/RFG4: vista virtual do parque com gestão do estado de cada lugar. */
export function SpotsScreen() {
  const nav = useGNav();
  const { state, park, now, dispatch } = useApp();
  const [floorId, setFloorId] = useState(park.floors[0]?.id);
  const [filter, setFilter] = useState<Filter>('todos');
  const [selected, setSelected] = useState<Spot | null>(null);
  const [blocking, setBlocking] = useState<Spot | null>(null);
  const [occupying, setOccupying] = useState<Spot | null>(null);
  const floor = park.floors.find((f) => f.id === floorId) ?? park.floors[0];
  const parkBookings = useMemo(() => state.bookings.filter((b) => b.parkId === park.id), [state.bookings, park.id]);

  const items: GridItem[] = floor.spots.map((s) => {
    const st = spotStateNow(s, parkBookings, now);
    const sub = st.state === 'ocupado' ? (st.booking!.type === 'imediata' && !st.booking!.userId ? 'Sem reserva' : `Até ${time(st.booking!.end)}`)
      : st.state === 'reservado' ? `${time(st.next!.start)}–${time(st.next!.end)}`
        : st.state === 'bloqueado' ? 'Sem acesso' : st.state === 'desativado' ? 'Inativo' : 'Disponível';
    return { spot: s, state: st.state, sub };
  });
  const shown = filter === 'todos' ? items : items.filter((i) => i.state === filter);
  const count = (s: SpotState) => items.filter((i) => i.state === s).length;

  return (
    <GestorScreen title="Lugares" subtitle="Toque num lugar para gerir o seu estado.">
      <ChipGroup value={floor.id} onChange={setFloorId} options={park.floors.map((f) => ({ value: f.id, label: f.name }))} />
      <ChipGroup value={filter} onChange={setFilter} options={[
        { value: 'todos', label: 'Todos' }, { value: 'livre', label: 'Livres' }, { value: 'ocupado', label: 'Ocupados' },
        { value: 'reservado', label: 'Reservados' }, { value: 'bloqueado', label: 'Bloqueados' }, { value: 'desativado', label: 'Desativados' },
      ]} />
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ fontWeight: '800' }}>{floor.name} · {floor.spots.length} lugares</Text>
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>↘ Entrada / Saída</Text>
        </View>
        <SpotGrid items={shown} columns={4} aisleEvery={2} onPress={(i) => setSelected(i.spot)} />
      </Card>
      <SpotLegend states={['livre', 'ocupado', 'reservado', 'bloqueado', 'desativado']} />
      <Text style={{ color: colors.muted, fontSize: 12.5 }}>
        {count('livre')} livres · {count('ocupado')} ocupados · {count('reservado')} reservados · {count('bloqueado')} bloqueados
      </Text>

      {selected && (
        <SpotDetailSheet
          spot={selected}
          onClose={() => setSelected(null)}
          onBlock={() => { setBlocking(selected); setSelected(null); }}
          onOccupy={() => { setOccupying(selected); setSelected(null); }}
          onUser={(id) => { setSelected(null); nav.navigate('UserDetail', { id }); }}
        />
      )}
      {blocking && (
        <BlockSheet
          spot={blocking}
          onClose={() => setBlocking(null)}
          onDone={(affected) => { setBlocking(null); nav.navigate('BlockDone', { spotId: blocking.id, affected }); }}
        />
      )}
      <OccupySheet spot={occupying} onClose={() => setOccupying(null)} onConfirm={(plate) => { dispatch({ type: 'MARK_OCCUPIED', spotId: occupying!.id, plate, now }); setOccupying(null); }} />
    </GestorScreen>
  );
}

function SpotDetailSheet({ spot, onClose, onBlock, onOccupy, onUser }: {
  spot: Spot; onClose: () => void; onBlock: () => void; onOccupy: () => void; onUser: (id: string) => void;
}) {
  const { state, now, dispatch } = useApp();
  const info = spotLabel(state, spot.id)!;
  const live = info.park.floors.flatMap((f) => f.spots).find((s) => s.id === spot.id)!; // versão atual do lugar
  const st = spotStateNow(live, state.bookings.filter((b) => b.parkId === info.park.id), now);
  const b = st.booking ?? st.next;
  const v = b ? vehicleById(state, b.vehicleId) : undefined;
  const u = b ? userById(state, b.userId) : undefined;
  const kind = live.kind === 'mobilidade' ? ' · Mobilidade reduzida' : live.kind === 'motociclo' ? ' · Motociclo' : '';

  return (
    <Sheet visible onClose={onClose} title={`Lugar ${live.code}`} subtitle={`${info.floor} · ${info.zone}${kind}`}>
      <View style={{ marginBottom: 10 }}>
        <Badge label={{ livre: 'Livre', ocupado: 'Ocupado', reservado: 'Reservado', bloqueado: `Bloqueado · ${live.block?.reason}`, desativado: 'Desativado' }[st.state]}
          tone={{ livre: 'success', ocupado: 'danger', reservado: 'warning', bloqueado: 'neutral', desativado: 'neutral' }[st.state] as 'success'} />
      </View>
      {b && v && (
        <Card>
          <InfoRow label="Matrícula" value={v.plate} />
          <InfoRow label="Utente" value={u?.name ?? 'Por identificar'} />
          <InfoRow label={st.state === 'ocupado' ? 'Entrada' : 'Início'} value={dateTime(b.checkIn ?? b.start)} />
          <InfoRow label="Saída prevista" value={dateTime(b.end)} />
          <InfoRow label="Pagamento" value={b.type === 'avenca' ? 'Avença' : b.paid ? `${euro(b.amount)} · Pago na app` : 'À saída'} />
          {u && <Pressable onPress={() => onUser(u.id)}><Text style={{ color: colors.primary, fontWeight: '700', marginTop: 6 }}>Ver ficha do utente →</Text></Pressable>}
        </Card>
      )}
      {st.state === 'bloqueado' && live.block && (
        <Card>
          <InfoRow label="Bloqueado por" value={live.block.by} />
          <InfoRow label="Início" value={dateTime(live.block.from)} />
          <InfoRow label="Fim previsto" value={dateTime(live.block.to)} />
          <InfoRow label="Motivo" value={live.block.note ?? live.block.reason} />
        </Card>
      )}
      <View style={{ gap: 8 }}>
        {st.state === 'bloqueado' && <Button title="Desbloquear lugar" icon="lock-open-outline" onPress={() => { dispatch({ type: 'UNBLOCK_SPOT', spotId: live.id }); onClose(); }} />}
        {st.state === 'bloqueado' && <Button title="Editar bloqueio" variant="secondary" onPress={onBlock} />}
        {(st.state === 'livre' || st.state === 'reservado' || st.state === 'ocupado') && <Button title="Bloquear lugar" icon="lock-closed-outline" variant="secondary" onPress={onBlock} />}
        {st.state === 'ocupado' && <Button title="Marcar como desocupado" icon="exit-outline" onPress={() => { dispatch({ type: 'MARK_FREE', spotId: live.id, now }); onClose(); }} />}
        {st.state === 'livre' && <Button title="Marcar como ocupado" icon="car-outline" onPress={onOccupy} />}
        {st.state === 'livre' && <Button title="Desativar lugar" variant="ghost" onPress={() => { dispatch({ type: 'SET_SPOT_ACTIVE', spotId: live.id, active: false }); onClose(); }} />}
        {st.state === 'desativado' && <Button title="Ativar lugar" icon="power-outline" onPress={() => { dispatch({ type: 'SET_SPOT_ACTIVE', spotId: live.id, active: true }); onClose(); }} />}
      </View>
      {st.state === 'bloqueado' && <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>Ao desbloquear, o lugar volta a ficar disponível para reservas.</Text>}
    </Sheet>
  );
}

const REASONS = ['Manutenção', 'Obras', 'Reserva interna', 'Outro'];

function BlockSheet({ spot, onClose, onDone }: { spot: Spot; onClose: () => void; onDone: (a: { name: string; plate: string; outcome: string }[]) => void }) {
  const { state, now, dispatch } = useApp();
  const me = useMe();
  const info = spotLabel(state, spot.id)!;
  const [reason, setReason] = useState('Manutenção');
  const endOptions = [
    { value: String(now + 2 * HOUR), label: '+2 horas' },
    ...(at(now, '18:00') > now + HOUR ? [{ value: String(at(now, '18:00')), label: 'Hoje · 18:00' }] : []),
    { value: String(at(now + 24 * HOUR, '08:00')), label: 'Amanhã · 08:00' },
    { value: String(now + 7 * 24 * HOUR), label: '7 dias' },
  ];
  const [end, setEnd] = useState(endOptions[0].value);
  const [resolution, setResolution] = useState<'mover' | 'reembolsar'>('mover');
  const [notify, setNotify] = useState(true);
  const to = Number(end);
  const affected = state.bookings.filter((b) => b.spotId === spot.id && b.status === 'confirmada' && b.start < to && now < b.end);
  const alt = (bId: string) => {
    const b = state.bookings.find((x) => x.id === bId)!;
    const v = vehicleById(state, b.vehicleId)!;
    return freeSpotsFor(state, info.park, b.start, b.end, now, v.type).find((s) => s.id !== spot.id && s.kind === 'normal');
  };

  const confirm = () => {
    const summary = affected.map((b) => {
      const a = alt(b.id);
      return {
        name: userById(state, b.userId)?.name ?? 'Utente', plate: vehicleById(state, b.vehicleId)?.plate ?? '',
        outcome: resolution === 'mover' && a ? `Mudou para o lugar ${a.code} · ${time(b.start)}–${time(b.end)} mantido` : `Reserva cancelada · Reembolso de ${euro(b.amount)}`,
      };
    });
    dispatch({ type: 'BLOCK_SPOT', spotId: spot.id, reason, from: now, to, by: me.name, resolution, notify, now });
    onDone(summary);
  };

  return (
    <Sheet visible onClose={onClose} title="Bloquear lugar" subtitle={`${spot.code} · ${info.floor} · ${info.zone}`}
      footer={<><Button title="Confirmar bloqueio" icon="lock-closed" onPress={confirm} /><Button title="Cancelar" variant="ghost" onPress={onClose} /></>}>
      <Text style={{ fontWeight: '700', marginBottom: 6 }}>Motivo</Text>
      <ChipGroup value={reason} onChange={setReason} scroll={false} options={REASONS.map((r) => ({ value: r, label: r }))} />
      <Text style={{ fontWeight: '700', marginBottom: 6 }}>Período · início agora ({time(now)})</Text>
      <ChipGroup value={end} onChange={setEnd} scroll={false} options={endOptions} />
      <Text style={{ color: colors.muted, marginBottom: 10 }}>Fim: {dateTime(to)}</Text>
      {affected.length > 0 ? (
        <>
          <InfoBox tone="warning" title={`${affected.length} ${affected.length === 1 ? 'reserva afetada' : 'reservas afetadas'}`}
            text={affected.map((b) => `${userById(state, b.userId)?.name} · ${vehicleById(state, b.vehicleId)?.plate} · ${time(b.start)}–${time(b.end)} · ${euro(b.amount)} pago na app`).join('\n')} />
          <Text style={{ fontWeight: '700', marginBottom: 6 }}>Solução para o utente · obrigatório</Text>
          <OptionCard label="Mudar para outro lugar livre" sub={affected[0] && alt(affected[0].id) ? `Sugestão automática: ${alt(affected[0].id)!.code} · livre no mesmo período` : 'Sem lugar livre: será reembolsado'} active={resolution === 'mover'} onPress={() => setResolution('mover')} icon="swap-horizontal" />
          <OptionCard label="Cancelar e reembolsar" sub="Reembolso integral por MB WAY" active={resolution === 'reembolsar'} onPress={() => setResolution('reembolsar')} icon="cash-outline" />
          <Pressable onPress={() => setNotify((n) => !n)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 6 }}>
            <Ionicons name={notify ? 'checkbox' : 'square-outline'} size={22} color={colors.primary} />
            <Text>Notificar o utente afetado</Text>
          </Pressable>
        </>
      ) : (
        <InfoBox tone="success" text="Nenhuma reserva é afetada por este bloqueio." />
      )}
    </Sheet>
  );
}

function OccupySheet({ spot, onClose, onConfirm }: { spot: Spot | null; onClose: () => void; onConfirm: (plate: string) => void }) {
  const [plate, setPlate] = useState('');
  const valid = isValidPlate(plate);
  return (
    <Sheet visible={!!spot} onClose={onClose} title={`Marcar ${spot?.code ?? ''} como ocupado`} subtitle="Registo manual de uma viatura no lugar."
      footer={<Button title="Confirmar ocupação" disabled={!valid} onPress={() => { onConfirm(normalizePlate(plate)); setPlate(''); }} />}>
      <TextField label="Matrícula" placeholder="AA-12-BC" value={plate} onChangeText={(t) => setPlate(normalizePlate(t))} autoCapitalize="characters" />
    </Sheet>
  );
}

export function BlockDoneScreen({ route, navigation }: GProps<'BlockDone'>) {
  const { state } = useApp();
  const { spotId, affected } = route.params;
  const info = spotLabel(state, spotId)!;
  const block = info.park.floors.flatMap((f) => f.spots).find((s) => s.id === spotId)?.block;
  return (
    <GestorScreen hidePark>
      <View style={{ alignItems: 'center', marginVertical: 18 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="lock-closed" size={30} color={colors.success} />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '800', marginTop: 10 }}>Lugar {info.code} bloqueado</Text>
        {block && <Text style={{ color: colors.muted }}>Indisponível até {dateTime(block.to)}</Text>}
      </View>
      {block && (
        <Card>
          <InfoRow label="Motivo" value={block.reason} />
          <InfoRow label="Período" value={`${time(block.from)}–${time(block.to)}`} />
          <InfoRow label="Bloqueado por" value={block.by} />
        </Card>
      )}
      {affected.map((a) => (
        <Card key={a.plate} tone="success">
          <Text style={{ fontWeight: '800' }}>Reserva afetada resolvida</Text>
          <Text>{a.name} · {a.plate}</Text>
          <Text style={{ color: colors.muted }}>{a.outcome}</Text>
          <View style={{ marginTop: 6 }}><Badge label="Notificação enviada" tone="success" /></View>
        </Card>
      ))}
      {affected.length === 0 && <InfoBox tone="success" text="Nenhuma reserva foi afetada." />}
      <Button title="Ver mapa de lugares" onPress={() => navigation.goBack()} />
      <Button title="Voltar ao painel" variant="ghost" onPress={() => navigation.navigate('GestorTabs', { screen: 'Painel' })} />
    </GestorScreen>
  );
}
