import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Badge, Button, Card, ChipGroup, ConfirmSheet, Divider, EmptyState, GridItem, InfoBox, InfoRow, OptionCard, ParkSelector,
  Period, PeriodFields, PriceSummary, QRCard, Screen, SpotGrid, SpotLegend, Stepper, TextField, periodToTs, statusBadge,
} from '../../components';
import { colors } from '../../theme';
import { useApp, useMe } from '../../store/AppContext';
import { spotLabel, vehicleById, vehiclesOf } from '../../store/selectors';
import { isSpotFree } from '../../store/reducer';
import { BookingDraft, UProps, useUNav } from '../../navigation/types';
import { countdown, date, dateTime, duration, euro, startOfDay, time, uid } from '../../utils/format';
import { bookingCode, canChange, changeDeadline, fractions, fractionValue, hoursError, price, spotStateFor } from '../../utils/rules';
import { PaymentMethod } from '../../types/models';

const STEPS = ['Dados', 'Lugar', 'Pagamento', 'Confirmação'];

/** Passo 1 · Dados: veículo, data e horário escolhidos pelo utente (não automático). */
export function NewBookingScreen() {
  const nav = useUNav();
  const { state, park, now } = useApp();
  const me = useMe();
  const vehicles = vehiclesOf(state, me.id);
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id);
  const [period, setPeriod] = useState<Period>({ day: null, start: null, end: null });
  const v = vehicles.find((x) => x.id === vehicleId);
  const ts = periodToTs(period);
  const error = ts
    ? ts.start < now ? 'A hora de entrada já passou.' : hoursError(park, ts.start, ts.end)
    : null;

  const next = () => {
    if (!ts || !v || error) return;
    const draft: BookingDraft = { parkId: park.id, vehicleId: v.id, start: ts.start, end: ts.end };
    nav.navigate('ChooseSpot', { draft });
  };

  return (
    <Screen title="Nova reserva">
      <ParkSelector onPress={() => nav.navigate('SelectPark')} />
      <Stepper steps={STEPS} current={0} />
      {me.status !== 'ativa' && <InfoBox tone="warning" text="A sua conta ainda não foi validada por um gestor. Não é possível reservar." />}
      <Text style={{ color: colors.muted, marginBottom: 10 }}>Escolha o veículo e o horário.</Text>
      <Text style={{ fontWeight: '600', marginBottom: 6 }}>Veículo</Text>
      {vehicles.map((x) => (
        <OptionCard key={x.id} label={x.plate} sub={`${x.type === 'automovel' ? 'Automóvel' : 'Motociclo'} · ${x.model}`} icon={x.type === 'automovel' ? 'car-outline' : 'bicycle-outline'} active={x.id === vehicleId} onPress={() => setVehicleId(x.id)} />
      ))}
      <Pressable onPress={() => nav.navigate('Vehicles')} style={{ marginBottom: 14 }}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>+ Adicionar veículo</Text>
      </Pressable>
      <PeriodFields value={period} onChange={setPeriod} now={now} error={error} />
      {v && <PriceSummary park={park} type={v.type} start={ts?.start} end={ts?.end} invalid={!!error} />}
      <Button title="Escolher lugar" icon="arrow-forward" onPress={next} disabled={!ts || !!error || !v || me.status !== 'ativa'} />
    </Screen>
  );
}

/** Passo 2 · Lugar: vista virtual do parque com filtro por piso (RFC4). */
export function ChooseSpotScreen({ route, navigation }: UProps<'ChooseSpot'>) {
  const { draft } = route.params;
  const { state, now } = useApp();
  const park = state.parks.find((p) => p.id === draft.parkId)!;
  const v = vehicleById(state, draft.vehicleId)!;
  const [floorId, setFloorId] = useState<string>('todos');
  const [spotId, setSpotId] = useState<string | undefined>(draft.spotId);
  const parkBookings = useMemo(() => state.bookings.filter((b) => b.parkId === park.id), [state.bookings, park.id]);

  const floors = park.floors.map((f) => {
    const items: GridItem[] = f.spots.map((s) => {
      let st = spotStateFor(s, parkBookings, draft.start, draft.end, now);
      if (st === 'bloqueado') st = 'desativado';
      if (st === 'livre' && v.type === 'automovel' && s.kind === 'motociclo') st = 'desativado';
      return { spot: s, state: st, sub: s.kind === 'mobilidade' ? 'Mob. reduzida' : s.kind === 'motociclo' ? 'Motociclo' : undefined };
    });
    return { floor: f, items, free: items.filter((i) => i.state === 'livre').length };
  });
  const totalFree = floors.reduce((a, f) => a + f.free, 0);
  const shown = floorId === 'todos' ? floors : floors.filter((f) => f.floor.id === floorId);
  const chosen = spotId ? spotLabel(state, spotId) : null;
  const amount = price(park, v.type, draft.start, draft.end);

  return (
    <Screen
      title="Escolher lugar"
      back
      footer={
        <>
          {chosen && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontWeight: '800', color: colors.primary }}>{chosen.code} selecionado</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{v.type === 'automovel' ? 'Automóvel' : 'Motociclo'} · {v.plate} · {duration(draft.end - draft.start)}</Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: '900', color: colors.primary }}>{euro(amount)}</Text>
            </View>
          )}
          <Button title={chosen ? `Continuar para pagamento · ${euro(amount)}` : 'Selecione um lugar livre'} disabled={!chosen} onPress={() => navigation.navigate('Payment', { draft: { ...draft, spotId } })} />
        </>
      }
    >
      <Text style={{ fontSize: 13, color: colors.muted }}>{park.name}</Text>
      <Stepper steps={STEPS} current={1} />
      <Text style={{ fontWeight: '800', fontSize: 15 }}>{date(draft.start)} · {time(draft.start)}–{time(draft.end)}</Text>
      <Text style={{ color: colors.muted, marginBottom: 10 }}>Disponibilidade para o período selecionado</Text>
      <ChipGroup
        value={floorId}
        onChange={setFloorId}
        options={[{ value: 'todos', label: 'Todos', sub: `${totalFree} livres` }, ...floors.map((f) => ({ value: f.floor.id, label: f.floor.name, sub: `${f.free} livres` }))]}
      />
      {shown.map(({ floor, items, free }) => (
        <Card key={floor.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontWeight: '800' }}>{floor.name} · Zona {floor.zone}</Text>
            <Badge label={`${free} livres`} tone={free ? 'success' : 'neutral'} />
          </View>
          <SpotGrid items={items} columns={5} selectedId={spotId} onPress={(i) => i.state === 'livre' && setSpotId(i.spot.id)} entrance={`Entrada · ${park.address.split(',')[0]}`} />
        </Card>
      ))}
      <SpotLegend states={['livre', 'ocupado', 'reservado', 'desativado', 'escolhido']} />
      {totalFree === 0 && <InfoBox tone="danger" text="Não há lugares livres para este período. Volte atrás e escolha outro horário." />}
    </Screen>
  );
}

/** Passo 3 · Pagamento na app, no momento da reserva. */
export function PaymentScreen({ route, navigation }: UProps<'Payment'>) {
  const { draft } = route.params;
  const { state, dispatch, now } = useApp();
  const me = useMe();
  const park = state.parks.find((p) => p.id === draft.parkId)!;
  const v = vehicleById(state, draft.vehicleId)!;
  const sp = spotLabel(state, draft.spotId!)!;
  const [method, setMethod] = useState<PaymentMethod>('MB WAY');
  const [phone, setPhone] = useState(me.phone);
  const [error, setError] = useState<string | null>(null);
  const amount = price(park, v.type, draft.start, draft.end);
  const deadline = draft.start - 60 * 60000;

  const pay = () => {
    // Revalida no momento do pagamento: outro utente pode ter reservado entretanto.
    if (!isSpotFree(state, draft.spotId!, draft.start, draft.end, now)) {
      setError(`O lugar ${sp.code} acabou de ficar indisponível. Escolha outro lugar.`);
      return;
    }
    const id = uid('b');
    dispatch({
      type: 'CREATE_BOOKING',
      booking: {
        id, code: bookingCode(draft.start, (state.bookings.length % 900) + 10), parkId: park.id, spotId: draft.spotId!, userId: me.id,
        vehicleId: v.id, type: 'antecipada', start: draft.start, end: draft.end, status: 'confirmada', amount, paid: true, method, createdAt: now,
      },
    });
    navigation.reset({ index: 1, routes: [{ name: 'UtenteTabs' }, { name: 'Booking', params: { id, justCreated: true } }] });
  };

  return (
    <Screen title="Pagamento" back footer={<Button title={`Pagar ${euro(amount)} e concluir reserva`} icon="lock-closed" onPress={pay} />}>
      <Text style={{ fontSize: 13, color: colors.muted }}>{park.name}</Text>
      <Stepper steps={STEPS} current={2} />
      <Card>
        <Text style={{ fontWeight: '800', marginBottom: 6 }}>Resumo da reserva</Text>
        <InfoRow label={`Lugar ${sp.code}`} value={`${sp.floor} · ${sp.zone}`} />
        <InfoRow label="Período" value={`${date(draft.start)} · ${time(draft.start)}–${time(draft.end)}`} />
        <InfoRow label="Veículo" value={`${v.type === 'automovel' ? 'Automóvel' : 'Motociclo'} · ${v.plate}`} />
        <Text style={{ color: colors.muted, fontSize: 12.5, marginTop: 4 }}>
          {duration(draft.end - draft.start)} · {fractions(draft.start, draft.end)} frações de 15 min × {euro(fractionValue(park, v.type))}
        </Text>
        <Divider />
        <InfoRow label="Total a pagar · IVA incluído" value={euro(amount)} strong />
      </Card>
      <Text style={{ fontWeight: '800', marginBottom: 4 }}>Método de pagamento</Text>
      <Text style={{ color: colors.muted, marginBottom: 8 }}>Pagamento na app, no momento da reserva.</Text>
      <ChipGroup value={method} onChange={setMethod} scroll={false} options={[
        { value: 'MB WAY', label: 'MB WAY', icon: 'phone-portrait-outline' },
        { value: 'Cartão', label: 'Cartão', icon: 'card-outline' },
        { value: 'Multibanco', label: 'Multibanco', icon: 'business-outline' },
      ]} />
      {method === 'MB WAY' && <TextField label="Telemóvel MB WAY" value={phone} onChangeText={setPhone} keyboardType="phone-pad" hint="Confirme o pagamento na app MB WAY. Número fictício." />}
      {method === 'Cartão' && <TextField label="Número do cartão" placeholder="4242 4242 4242 4242" keyboardType="number-pad" hint="Ambiente de demonstração: nenhum valor é cobrado." />}
      {method === 'Multibanco' && <InfoBox text="Entidade 12345 · Referência 987 654 321. A referência expira em 30 minutos (demonstração)." />}
      {error && <InfoBox tone="danger" text={error} />}
      <InfoBox tone="warning" text={`Pode alterar ou cancelar sem custos até 1 hora antes da entrada. Depois disso, a reserva já não pode ser alterada nem reembolsada.\nPrazo: ${dateTime(deadline)}`} />
    </Screen>
  );
}

/** Passo 4 · Confirmação e detalhe da reserva (QR, prazo, alterar/cancelar). */
export function BookingScreen({ route, navigation }: UProps<'Booking'>) {
  const { id, justCreated } = route.params;
  const { state, dispatch, now } = useApp();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const b = state.bookings.find((x) => x.id === id);
  if (!b) return <Screen title="Reserva" back><EmptyState icon="alert-circle-outline" title="Reserva não encontrada" text="Pode ter sido removida do histórico." /></Screen>;
  const park = state.parks.find((p) => p.id === b.parkId)!;
  const v = vehicleById(state, b.vehicleId)!;
  const sp = spotLabel(state, b.spotId)!;
  const editable = canChange(b, now);
  const deadline = changeDeadline(b);
  const sb = statusBadge.booking(b.status, b.refunded);
  const cancelled = b.status === 'cancelada';

  const header = cancelled
    ? { icon: 'close-circle' as const, color: colors.danger, title: 'Reserva cancelada', text: b.refunded ? 'O reembolso foi processado com sucesso.' : 'Esta reserva foi cancelada.' }
    : b.status === 'em_curso'
      ? { icon: 'car' as const, color: colors.primary, title: 'Estadia em curso', text: `Entrada às ${time(b.checkIn ?? b.start)}.` }
      : b.status === 'concluida'
        ? { icon: 'checkmark-done-circle' as const, color: colors.muted, title: 'Estadia concluída', text: 'Obrigado por estacionar connosco.' }
        : { icon: 'checkmark-circle' as const, color: colors.success, title: justCreated ? 'Reserva confirmada!' : 'Reserva confirmada', text: 'O seu lugar está garantido.' };

  return (
    <Screen title="A sua reserva" back onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('UtenteTabs'))}>
      <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 10 }}>{park.name}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Ionicons name={header.icon} size={34} color={header.color} />
        <View>
          <Text style={{ fontSize: 18, fontWeight: '800' }}>{header.title}</Text>
          <Text style={{ color: colors.muted }}>{header.text}</Text>
        </View>
      </View>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: '900' }}>Lugar {sp.code}</Text>
          <Badge label={sb.label} tone={sb.tone} />
        </View>
        <Text style={{ color: colors.muted, marginBottom: 8 }}>{sp.floor} · {sp.zone}</Text>
        <InfoRow label="Veículo" value={`${v.type === 'automovel' ? 'Automóvel' : 'Motociclo'} · ${v.plate}`} />
        <InfoRow label="Entrada" value={dateTime(b.start)} />
        <InfoRow label="Saída" value={dateTime(b.end)} />
        <Divider />
        <InfoRow label={cancelled ? 'Valor reembolsado' : 'Total pago'} value={euro(cancelled ? b.refunded ?? 0 : b.amount)} strong />
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          {duration(b.end - b.start)} · {fractions(b.start, b.end)} frações × {euro(fractionValue(park, v.type))} · IVA incluído · {cancelled ? 'Reembolso por' : 'Pago ·'} {b.method ?? 'MB WAY'}
        </Text>
      </Card>

      {!cancelled && b.status !== 'concluida' && (
        <QRCard value={`PARKUPB|${b.code}|${v.plate}|${b.start}|${b.end}`} text="Apresente-o na cancela durante a sua reserva." code={`Reserva ${b.code}`} plate={v.plate} />
      )}

      {b.status === 'confirmada' && (editable ? (
        <InfoBox tone="warning" title={`Alterações e cancelamento até ${dateTime(deadline)}`} text={`Faltam ${countdown(deadline - now)} para o fim do prazo.`} />
      ) : (
        <InfoBox tone="danger" title="Já não é possível alterar ou cancelar." text={`Faltam menos de 60 minutos para a entrada. Entrada às ${time(b.start)} · Faltam ${duration(b.start - now)} · Sem reembolso.`} />
      ))}

      {b.status === 'confirmada' && (
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          <Button title="Alterar reserva" icon="create-outline" variant="secondary" disabled={!editable} onPress={() => navigation.navigate('EditBooking', { id: b.id })} style={{ flex: 1 }} />
          <Button title="Cancelar reserva" icon="close-outline" variant="secondary" disabled={!editable} onPress={() => setConfirmCancel(true)} style={{ flex: 1 }} />
        </View>
      )}
      {b.status === 'confirmada' && now >= b.start - 15 * 60000 && (
        <Button title="Simular entrada (leitura do QR)" variant="accent" icon="qr-code-outline" onPress={() => dispatch({ type: 'CHECK_IN', bookingId: b.id, now })} style={{ marginBottom: 10 }} />
      )}
      {b.status === 'em_curso' && (
        <Button title="Simular saída (leitura do QR)" variant="accent" icon="exit-outline" onPress={() => dispatch({ type: 'END_STAY', bookingId: b.id, now })} style={{ marginBottom: 10 }} />
      )}
      <Button title="Voltar ao início" variant="ghost" onPress={() => navigation.navigate('UtenteTabs', { screen: 'Inicio' })} />

      <ConfirmSheet
        visible={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Cancelar reserva?"
        text={`A reserva ${b.code} será cancelada e o valor será reembolsado por ${b.method ?? 'MB WAY'}.`}
        cancelLabel="Manter reserva"
        confirmLabel="Cancelar reserva"
        onConfirm={() => { dispatch({ type: 'CANCEL_BOOKING', bookingId: b.id, now }); setConfirmCancel(false); }}
      >
        <InfoRow label="Valor a reembolsar" value={euro(b.amount)} strong />
        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>Reembolso integral · Pago por {b.method ?? 'MB WAY'}</Text>
      </ConfirmSheet>
    </Screen>
  );
}

/** Alterar reserva (só até 1 hora antes da entrada). */
export function EditBookingScreen({ route, navigation }: UProps<'EditBooking'>) {
  const { state, now } = useApp();
  const b = state.bookings.find((x) => x.id === route.params.id)!;
  const park = state.parks.find((p) => p.id === b.parkId)!;
  const v = vehicleById(state, b.vehicleId)!;
  const sp = spotLabel(state, b.spotId)!;
  const [period, setPeriod] = useState<Period>({ day: startOfDay(b.start), start: time(b.start), end: time(b.end) });
  const ts = periodToTs(period);
  const error = ts ? (ts.start < now + 60 * 60000 ? 'A nova entrada tem de ser pelo menos 1 hora depois de agora.' : hoursError(park, ts.start, ts.end)) : null;
  const sameSpotFree = ts && !error ? isSpotFree(state, b.spotId, ts.start, ts.end, now, b.id) : true;
  const altSpot = ts && !error && !sameSpotFree
    ? park.floors.flatMap((f) => f.spots).find((s) => s.kind === 'normal' && isSpotFree(state, s.id, ts.start, ts.end, now, b.id))
    : undefined;

  if (!canChange(b, now)) {
    return <Screen title="Alterar reserva" back><InfoBox tone="danger" text="O prazo para alterar esta reserva terminou (1 hora antes da entrada)." /></Screen>;
  }

  return (
    <Screen
      title="Alterar reserva"
      back
      footer={<Button title="Rever alteração" disabled={!ts || !!error || (!sameSpotFree && !altSpot)} onPress={() => ts && navigation.navigate('ReviewChange', { id: b.id, start: ts.start, end: ts.end, spotId: sameSpotFree ? b.spotId : altSpot!.id })} />}
    >
      <Text style={{ color: colors.muted, marginBottom: 12 }}>Estes são os dados atuais da sua reserva. Ajuste o que precisar antes de confirmar.</Text>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontWeight: '800', fontSize: 16 }}>Lugar {sp.code}</Text>
          <Badge label="Atual" />
        </View>
        <Text style={{ color: colors.muted }}>{sp.floor} · {sp.zone} · {v.plate}</Text>
      </Card>
      <PeriodFields value={period} onChange={setPeriod} now={now} error={error} />
      {!sameSpotFree && altSpot && <InfoBox tone="warning" text={`O lugar ${sp.code} já está ocupado no novo período. Será mudado para ${spotLabel(state, altSpot.id)?.code}.`} />}
      {!sameSpotFree && !altSpot && <InfoBox tone="danger" text="Não há lugares livres para o novo período." />}
      <PriceSummary park={park} type={v.type} start={ts?.start} end={ts?.end} invalid={!!error} />
      <InfoBox text={`Alterações e cancelamento até ${dateTime(changeDeadline(b))}. Sem taxas dentro do prazo. A diferença será paga ou reembolsada por ${b.method ?? 'MB WAY'}.`} />
    </Screen>
  );
}

export function ReviewChangeScreen({ route, navigation }: UProps<'ReviewChange'>) {
  const { id, start, end, spotId } = route.params;
  const { state, dispatch, now } = useApp();
  const b = state.bookings.find((x) => x.id === id)!;
  const park = state.parks.find((p) => p.id === b.parkId)!;
  const v = vehicleById(state, b.vehicleId)!;
  const newAmount = price(park, v.type, start, end);
  const diff = newAmount - b.amount;
  const sp = spotLabel(state, spotId)!;

  const confirm = () => {
    dispatch({ type: 'UPDATE_BOOKING', bookingId: id, start, end, spotId, amount: newAmount, now });
    navigation.pop(2);
  };

  return (
    <Screen
      title="Rever alteração"
      back
      footer={<>
        <Button title={diff > 0 ? `Pagar ${euro(diff)} e confirmar` : diff < 0 ? 'Confirmar alteração e reembolso' : 'Confirmar alteração'} onPress={confirm} />
        <Button title="Cancelar alteração" variant="ghost" onPress={() => navigation.pop(2)} />
      </>}
    >
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontWeight: '800' }}>Reserva atual · {spotLabel(state, b.spotId)?.code}</Text>
          <Badge label="Confirmada" tone="success" />
        </View>
        <InfoRow label={date(b.start)} value={`${time(b.start)}–${time(b.end)} · ${duration(b.end - b.start)}`} />
        <InfoRow label={`Já pago · ${b.method}`} value={euro(b.amount)} />
      </Card>
      <Card tone="info">
        <InfoRow label="Novo período" value={`${date(start)} · ${time(start)}–${time(end)}`} />
        <InfoRow label="Lugar" value={`${sp.code} · ${sp.floor}`} />
        <InfoRow label="Novo total" value={euro(newAmount)} strong />
        <Divider />
        {diff > 0 && <InfoRow label="Valor a pagar a mais" value={`+${euro(diff)}`} strong valueColor={colors.warning} />}
        {diff < 0 && <InfoRow label="Valor a reembolsar" value={euro(-diff)} strong valueColor={colors.success} />}
        {diff === 0 && <InfoRow label="Diferença" value="Sem custos" />}
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>Tarifa {euro(park.prices.carHour)}/hora · frações de 15 min a {euro(fractionValue(park, v.type))}.</Text>
      </Card>
      <InfoBox text="A reserva atual mantém-se até confirmar. O QR Code é atualizado após confirmar a alteração." />
    </Screen>
  );
}
