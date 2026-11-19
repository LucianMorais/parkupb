import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Badge, Button, Card, ChipGroup, Divider, EmptyState, InfoBox, InfoRow, OptionCard, ParkSelector, QRCard, Screen, SectionTitle,
} from '../../components';
import { colors } from '../../theme';
import { useApp, useMe } from '../../store/AppContext';
import { activePasses, spotLabel, vehicleById, vehiclePass, vehiclesOf } from '../../store/selectors';
import { UProps, useUNav } from '../../navigation/types';
import { DAY, date, dateTime, duration, euro, time } from '../../utils/format';
import { freeSpotsFor, hoursError, price } from '../../utils/rules';
import { PassPlan, PaymentMethod } from '../../types/models';

/** RFC2: pedir lugar no momento da entrada (lugar atribuído, sem alteração). */
export function ImmediateScreen({ navigation }: UProps<'Immediate'>) {
  const { state, park, now, dispatch } = useApp();
  const me = useMe();
  const vehicles = vehiclesOf(state, me.id);
  // Só pode haver uma estadia em curso por veículo (veículos diferentes podem estar no parque ao mesmo tempo).
  const liveOf = (vid: string) => state.bookings.find((b) => b.userId === me.id && b.vehicleId === vid && b.status === 'em_curso');
  const [vehicleId, setVehicleId] = useState((vehicles.find((x) => !liveOf(x.id)) ?? vehicles[0])?.id);
  const v = vehicles.find((x) => x.id === vehicleId);
  const free = v ? freeSpotsFor(state, park, now, now + 60 * 60000, now, v.type).length : 0;
  const closed = hoursError(park, now, now + 15 * 60000);
  const active = v ? liveOf(v.id) : undefined;

  const request = () => {
    if (!v) return;
    dispatch({ type: 'START_IMMEDIATE', userId: me.id, parkId: park.id, vehicleId: v.id, now });
    navigation.replace('Stay', {});
  };

  return (
    <Screen title="Entrar agora" back footer={<Button title="Pedir lugar agora" icon="enter-outline" onPress={request} disabled={!v || !free || !!closed || !!active} />}>
      <ParkSelector />
      <Card tone="info">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="flash-outline" size={22} color={colors.primary} />
          <Text style={{ flex: 1, color: colors.text }}>O sistema atribui-lhe um lugar livre e um QR Code de entrada e saída. O lugar não pode ser alterado.</Text>
        </View>
      </Card>
      <Text style={{ fontWeight: '600', marginBottom: 6 }}>Veículo</Text>
      {vehicles.map((x) => (
        <OptionCard key={x.id} label={x.plate} sub={`${x.type === 'automovel' ? 'Automóvel' : 'Motociclo'} · ${x.model}${liveOf(x.id) ? ' · Estadia em curso' : ''}`} icon={x.type === 'automovel' ? 'car-outline' : 'bicycle-outline'} active={x.id === vehicleId} onPress={() => setVehicleId(x.id)} />
      ))}
      <Card>
        <InfoRow label="Lugares livres agora" value={String(free)} strong />
        <InfoRow label="Tarifa" value={`${euro(v?.type === 'motociclo' ? park.prices.motoHour : park.prices.carHour)}/hora · frações de 15 min`} />
        <InfoRow label="Pagamento" value="À saída, por MB WAY" />
      </Card>
      {closed && <InfoBox tone="danger" text={closed} />}
      {active && v && <InfoBox tone="warning" text={`O veículo ${v.plate} já tem uma estadia em curso (lugar ${spotLabel(state, active.spotId)?.code}). Termine-a ou escolha outro veículo.`} />}
      <InfoBox text="Será notificado do valor a pagar quando sair do parque." />
    </Screen>
  );
}

export function StayScreen({ route, navigation }: UProps<'Stay'>) {
  const { state, now, dispatch } = useApp();
  const me = useMe();
  const id = route.params?.id;
  const b = id
    ? state.bookings.find((x) => x.id === id)
    : state.bookings.filter((x) => x.userId === me.id && x.type === 'imediata').sort((a, c) => c.createdAt - a.createdAt)[0];
  if (!b) return <Screen title="Estadia" back><EmptyState icon="car-outline" title="Sem estadia" text="Não foi possível atribuir lugar." /></Screen>;
  const park = state.parks.find((p) => p.id === b.parkId)!;
  const v = vehicleById(state, b.vehicleId)!;
  const sp = spotLabel(state, b.spotId)!;
  const live = b.status === 'em_curso';
  const sofar = price(park, v.type, b.checkIn ?? b.start, Math.max(now, (b.checkIn ?? b.start) + 60000));

  return (
    <Screen title={live ? 'Lugar atribuído' : 'Estadia concluída'} back onBack={() => navigation.navigate('UtenteTabs', { screen: 'Inicio' })}>
      <Card tone={live ? 'primary' : undefined}>
        <Text style={{ color: live ? '#D7EAEE' : colors.muted }}>{park.name}</Text>
        <Text style={{ fontSize: 44, fontWeight: '900', color: live ? '#fff' : colors.text }}>{sp.code}</Text>
        <Text style={{ color: live ? '#D7EAEE' : colors.muted }}>{sp.floor} · {sp.zone} · {v.plate}</Text>
        <View style={{ marginTop: 8 }}><Badge label={live ? 'Entrada imediata · sem alteração' : 'Concluída'} tone={live ? 'warning' : 'neutral'} /></View>
      </Card>
      {live ? (
        <>
          <QRCard value={`PARKUPB|${b.code}|${v.plate}|${b.checkIn}`} text="Use-o na entrada e na saída." code={b.code} plate={v.plate} />
          <Card>
            <InfoRow label="Entrada" value={dateTime(b.checkIn ?? b.start)} />
            <InfoRow label="Tempo decorrido" value={duration(now - (b.checkIn ?? b.start))} />
            <InfoRow label="Valor até agora" value={euro(sofar)} strong />
          </Card>
          <InfoBox text="O valor final é calculado e notificado à saída." />
          <Button title="Simular saída (leitura do QR)" icon="exit-outline" variant="accent" onPress={() => dispatch({ type: 'END_STAY', bookingId: b.id, now })} />
        </>
      ) : (
        <Card>
          <InfoRow label="Entrada" value={dateTime(b.checkIn ?? b.start)} />
          <InfoRow label="Saída" value={dateTime(b.checkOut ?? b.end)} />
          <InfoRow label="Duração" value={duration((b.checkOut ?? b.end) - (b.checkIn ?? b.start))} />
          <Divider />
          <InfoRow label="Valor pago à saída" value={euro(b.amount)} strong />
          <Text style={{ color: colors.muted, fontSize: 12 }}>Cobrado por MB WAY · IVA incluído</Text>
        </Card>
      )}
    </Screen>
  );
}

const PLAN_INFO: Record<PassPlan, { title: string; tag: string; text: string }> = {
  '24h': { title: 'Mensal 24 horas', tag: 'Todos os dias', text: 'Acesso ilimitado, 24 horas por dia, incluindo fins de semana e feriados.' },
  diurna: { title: 'Mensal diurna', tag: 'Dias úteis', text: 'Acesso das 08:00 às 20:00, de segunda a sexta-feira. Ideal para o trabalho.' },
};

/** RFC3: comprar e renovar avença mensal (mesmo QR durante a vigência). */
export function PassesScreen() {
  const nav = useUNav();
  const { state, park, now, dispatch } = useApp();
  const me = useMe();
  const passes = activePasses(state, me.id, park.id, now);
  const ids = new Set(passes.map((p) => p.id));
  const others = state.passes.filter((p) => p.userId === me.id && !ids.has(p.id)).sort((a, b) => b.to - a.to);
  // Uma avença por veículo: só se pode pedir outra se houver um veículo sem avença ativa neste parque.
  const freeVehicles = vehiclesOf(state, me.id).filter((v) => !vehiclePass(state, v.id, park.id, now));

  return (
    <Screen title="Avenças">
      <ParkSelector onPress={() => nav.navigate('SelectPark')} />
      {passes.length > 1 && <SectionTitle title={`Avenças ativas (${passes.length})`} />}
      {passes.map((pass) => (
        <View key={pass.id}>
          <Card tone="success">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontWeight: '800', fontSize: 16 }}>Avença {PLAN_INFO[pass.plan].title.toLowerCase()}</Text>
              <Badge label="Ativa" tone="success" />
            </View>
            <InfoRow label="Veículo" value={vehicleById(state, pass.vehicleId)?.plate ?? ''} />
            <InfoRow label="Vigência" value={`${date(pass.from)} a ${date(pass.to)}`} />
            <InfoRow label="Dias restantes" value={String(Math.ceil((pass.to - now) / DAY))} />
          </Card>
          <QRCard value={`PARKUPB|AVENCA|${pass.code}|${pass.to}`} title="QR da avença" text="Entre e saia quantas vezes precisar. Ativo apenas durante a vigência." code={pass.code} plate={vehicleById(state, pass.vehicleId)?.plate} />
          <Button title={`Renovar por mais 30 dias · ${euro(pass.plan === '24h' ? park.prices.pass24 : park.prices.passDay)}`} icon="refresh" onPress={() => dispatch({ type: 'RENEW_PASS', passId: pass.id, now })} />
          <View style={{ height: 16 }} />
        </View>
      ))}
      {passes.length === 0 && (
        <EmptyState icon="card-outline" title="Sem avença ativa neste parque" text="Estaciona com frequência? Escolha um plano à sua medida." />
      )}
      {passes.length > 0 && freeVehicles.length === 0 && (
        <InfoBox text="Todos os seus veículos já têm avença ativa neste parque. Adicione outro veículo para pedir uma nova avença." />
      )}
      <SectionTitle title="Planos disponíveis" />
      {(['24h', 'diurna'] as PassPlan[]).map((plan) => (
        <Card key={plan}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '800', fontSize: 15 }}>{PLAN_INFO[plan].title}</Text>
            <Badge label={PLAN_INFO[plan].tag} tone="neutral" />
          </View>
          <Text style={{ fontSize: 22, fontWeight: '900', color: colors.primary, marginVertical: 6 }}>{euro(plan === '24h' ? park.prices.pass24 : park.prices.passDay)} / mês</Text>
          <Text style={{ color: colors.muted, marginBottom: 10 }}>{PLAN_INFO[plan].text}</Text>
          <Button title="Pedir avença" small variant="secondary" disabled={freeVehicles.length === 0 || me.status !== 'ativa'} onPress={() => nav.navigate('BuyPass', { plan })} />
        </Card>
      ))}
      {others.length > 0 && <SectionTitle title="Avenças anteriores ou de outros parques" />}
      {others.map((p) => (
        <Card key={p.id}>
          <Text style={{ fontWeight: '700' }}>{state.parks.find((x) => x.id === p.parkId)?.name}</Text>
          <Text style={{ color: colors.muted }}>{PLAN_INFO[p.plan].title} · {date(p.from)} a {date(p.to)} · {p.to > now ? 'Ativa' : 'Expirada'}</Text>
        </Card>
      ))}
      <Text style={{ color: colors.muted, fontSize: 12 }}>Preços com IVA. A avença está associada a uma matrícula e a este parque.</Text>
    </Screen>
  );
}

export function BuyPassScreen({ route, navigation }: UProps<'BuyPass'>) {
  const { plan } = route.params;
  const { state, park, now, dispatch } = useApp();
  const me = useMe();
  const vehicles = vehiclesOf(state, me.id);
  const hasPass = (vid: string) => !!vehiclePass(state, vid, park.id, now);
  const [vehicleId, setVehicleId] = useState(vehicles.find((x) => !hasPass(x.id))?.id);
  const [method, setMethod] = useState<PaymentMethod>('MB WAY');
  const amount = plan === '24h' ? park.prices.pass24 : park.prices.passDay;

  const buy = () => {
    if (!vehicleId || hasPass(vehicleId)) return;
    dispatch({ type: 'BUY_PASS', userId: me.id, parkId: park.id, vehicleId, plan, method, now });
    navigation.goBack();
  };

  return (
    <Screen title="Pedir avença" back footer={<Button title={`Pagar ${euro(amount)} e ativar`} icon="lock-closed" onPress={buy} disabled={!vehicleId} />}>
      <ParkSelector />
      <Card tone="info">
        <Text style={{ fontWeight: '800', fontSize: 16 }}>{PLAN_INFO[plan].title}</Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>{PLAN_INFO[plan].text}</Text>
      </Card>
      <Text style={{ fontWeight: '600', marginBottom: 6 }}>Matrícula associada</Text>
      {vehicles.map((x) => (
        <OptionCard key={x.id} label={x.plate} sub={hasPass(x.id) ? `${x.model} · Já tem avença ativa neste parque` : x.model} icon={x.type === 'automovel' ? 'car-outline' : 'bicycle-outline'} active={x.id === vehicleId} disabled={hasPass(x.id)} onPress={() => setVehicleId(x.id)} />
      ))}
      <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 10 }}>Cada veículo pode ter uma avença ativa por parque.</Text>
      <Card>
        <InfoRow label="Início" value={`${date(now)} · ${time(now)}`} />
        <InfoRow label="Fim" value={date(now + 30 * DAY)} />
        <InfoRow label="Total" value={euro(amount)} strong />
      </Card>
      <Text style={{ fontWeight: '600', marginBottom: 6 }}>Método de pagamento</Text>
      <ChipGroup value={method} onChange={setMethod} scroll={false} options={[
        { value: 'MB WAY', label: 'MB WAY' }, { value: 'Cartão', label: 'Cartão' }, { value: 'Multibanco', label: 'Multibanco' },
      ]} />
      <InfoBox text="O QR Code da avença fica ativo apenas durante o período de vigência." />
    </Screen>
  );
}
