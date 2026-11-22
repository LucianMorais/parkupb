import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, BarChart, Card, ChipGroup, EmptyState, InfoBox, ListItem, ProgressBar, SectionTitle, StatCard, TextField } from '../../components';
import { colors } from '../../theme';
import { useApp } from '../../store/AppContext';
import { incidents, parkStatsBetween, spotLabel, userById, vehicleById } from '../../store/selectors';
import { useGNav } from '../../navigation/types';
import { DAY, HOUR, at, dateShort, euro, longDate, startOfDay, time } from '../../utils/format';
import { overtimeMinutes, parkOccupancy, spotStateNow } from '../../utils/rules';
import { GestorScreen, QuickAction } from './GestorScreen';

export function DashboardScreen() {
  const nav = useGNav();
  const { state, park, now } = useApp();
  const occ = parkOccupancy(state, park, now);
  const inc = incidents(state, park, now);
  const parkBookings = state.bookings.filter((b) => b.parkId === park.id);
  const nextExits = parkBookings
    .filter((b) => b.status === 'em_curso' && b.end > now && b.type !== 'avenca')
    .sort((a, b) => a.end - b.end)
    .slice(0, 4);

  return (
    <GestorScreen title="O seu parque, em direto" subtitle={`${longDate(now)} · Atualizado às ${time(now)}`}>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <StatCard value={occ.livre} label="Livres" icon="checkmark-circle-outline" tone="success" />
        <StatCard value={occ.ocupado} label="Ocupados" icon="car-outline" tone="danger" />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        <StatCard value={occ.reservado} label="Reservados" icon="time-outline" tone="warning" />
        <StatCard value={occ.bloqueado + occ.desativado} label="Bloq./desativados" icon="lock-closed-outline" tone="neutral" />
      </View>
      <Card tone="primary" onPress={() => nav.navigate('Stats')}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: '#D7EAEE' }}>Ocupação atual</Text>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Estatísticas →</Text>
        </View>
        <Text style={{ color: '#fff', fontSize: 32, fontWeight: '900', marginVertical: 4 }}>{(occ.rate * 100).toFixed(1).replace('.', ',')}%</Text>
        <ProgressBar value={occ.rate} color={colors.accent} />
        <Text style={{ color: '#D7EAEE', fontSize: 12, marginTop: 6 }}>{occ.ocupado} de {occ.total} lugares ocupados · {park.floors.length} pisos</Text>
      </Card>

      <SectionTitle title="Próximas saídas" action="Ver viaturas" onAction={() => nav.navigate('ParkVehicles')} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {nextExits.map((b) => (
          <View key={b.id} style={{ width: '48%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 10 }}>
            <Text style={{ fontWeight: '800', fontSize: 16 }}>{time(b.end)}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{spotLabel(state, b.spotId)?.code} liberta às {time(b.end)}</Text>
          </View>
        ))}
        {nextExits.length === 0 && <Text style={{ color: colors.muted }}>Sem saídas previstas.</Text>}
      </View>

      <SectionTitle title="Alertas de incumprimento" action={`${inc.total} ativos →`} onAction={() => nav.navigate('Incidents')} />
      <Card>
        {inc.overtime.slice(0, 2).map((i) => (
          <ListItem key={i.id} title={`${spotLabel(state, i.booking.spotId)?.code} · Tempo excedido em ${i.minutes} min`} subtitle={`${vehicleById(state, i.booking.vehicleId)?.plate} · Saída prevista às ${time(i.booking.end)}`}
            left={<Ionicons name="alert-circle" size={20} color={colors.danger} />} onPress={() => nav.navigate('IncidentDetail', { bookingId: i.booking.id })} />
        ))}
        {inc.unknown.slice(0, 2).map((i) => (
          <ListItem key={i.id} title={`${spotLabel(state, i.detection.spotId)?.code} · Viatura sem reserva válida`} subtitle={`${i.detection.plate} · Detetada às ${time(i.detection.detectedAt)}`}
            left={<Ionicons name="warning" size={20} color={colors.warning} />} onPress={() => nav.navigate('Incidents')} />
        ))}
        {inc.total === 0 && <Text style={{ color: colors.muted }}>Sem ocorrências. 👍</Text>}
      </Card>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <QuickAction icon="lock-closed-outline" label="Bloquear lugar" onPress={() => nav.navigate('GestorTabs', { screen: 'Lugares' })} />
        <QuickAction icon="megaphone-outline" label="Enviar aviso" onPress={() => nav.navigate('NewNotice')} />
        <QuickAction icon="car-sport-outline" label="Viaturas no parque" onPress={() => nav.navigate('ParkVehicles')} />
      </View>
    </GestorScreen>
  );
}

/** RFG3: lugares reservados e viaturas no parque num dado momento. */
export function ParkVehiclesScreen() {
  const nav = useGNav();
  const { state, park, now } = useApp();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'agora' | 'reservas'>('agora');
  const inPark = state.bookings.filter((b) => b.parkId === park.id && b.status === 'em_curso');
  const reserved = state.bookings.filter((b) => b.parkId === park.id && b.status === 'confirmada' && b.end > now).sort((a, b) => a.start - b.start);
  const list = (tab === 'agora' ? inPark : reserved).filter((b) => (vehicleById(state, b.vehicleId)?.plate ?? '').replace(/-/g, '').includes(q.toUpperCase().replace(/-/g, '')));
  const typeLabel = (t: string, unknown: boolean) => (unknown ? 'Sem reserva válida' : t === 'imediata' ? 'Entrada imediata' : t === 'avenca' ? 'Avença' : 'Reserva');

  return (
    <GestorScreen title="Viaturas no parque" back subtitle={`${inPark.length} viaturas · ${reserved.length} reservas futuras`}>
      <ChipGroup value={tab} onChange={setTab} options={[{ value: 'agora', label: `No parque agora · ${inPark.length}` }, { value: 'reservas', label: `Lugares reservados · ${reserved.length}` }]} />
      <TextField placeholder="Pesquisar por matrícula" icon="search" value={q} onChangeText={setQ} autoCapitalize="characters" />
      {list.length === 0 && <EmptyState icon="car-outline" title="Sem resultados" text="Nenhuma viatura corresponde à pesquisa." />}
      {list.map((b) => {
        const sp = spotLabel(state, b.spotId)!;
        const v = vehicleById(state, b.vehicleId)!;
        const u = userById(state, b.userId);
        const over = overtimeMinutes(b, now);
        const unknown = !b.userId;
        return (
          <Card key={b.id} onPress={u ? () => nav.navigate('UserDetail', { id: u.id }) : undefined}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ alignItems: 'center', width: 54 }}>
                <Text style={{ fontWeight: '900', fontSize: 17, color: colors.primary }}>{sp.code}</Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>{sp.floor}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800' }}>{v.plate}</Text>
                <Text style={{ color: colors.muted, fontSize: 12.5 }}>
                  {u?.name ?? 'Utente por identificar'} · {tab === 'agora' ? `Entrada ${time(b.checkIn ?? b.start)}` : `${dateShort(b.start)} ${time(b.start)}–${time(b.end)}`}
                </Text>
                {tab === 'agora' && <Text style={{ color: over ? colors.danger : colors.muted, fontSize: 12.5 }}>{unknown ? 'Verificar acesso · Sem reserva associada' : `Saída prevista ${time(b.end)}${over ? ` · Tempo excedido (${over} min)` : ''}`}</Text>}
              </View>
              <Badge label={typeLabel(b.type, unknown)} tone={unknown ? 'danger' : over ? 'warning' : 'primary'} />
            </View>
          </Card>
        );
      })}
      <InfoBox text="O utente paga na app ao reservar. Pode alterar ou cancelar até 1 hora antes da entrada." />
    </GestorScreen>
  );
}

/** RFG1c/RFG4: estatísticas de ocupação e funcionamento. */
export function StatsScreen() {
  const { state, park, now } = useApp();
  const [period, setPeriod] = useState<'hoje' | '7' | '30'>('hoje');
  const today = startOfDay(now);
  const from = period === 'hoje' ? today : today - (Number(period) - 1) * DAY;
  const s = parkStatsBetween(state, park.id, from, now + DAY);
  const week = parkStatsBetween(state, park.id, today - 6 * DAY, now + DAY);
  const parkBookings = state.bookings.filter((b) => b.parkId === park.id && b.status !== 'cancelada');
  const total = park.floors.reduce((a, f) => a + f.spots.length, 0);

  // Ocupação por hora (hoje): viaturas presentes no início de cada hora.
  const curHour = new Date(now).getHours();
  const hours = Array.from({ length: 8 }, (_, i) => curHour - 7 + i).filter((h) => h >= 0);
  const data = hours.map((h) => {
    // Na hora atual usa o momento presente; nas anteriores, o início da hora.
    const t = h === curHour ? now : at(now, `${String(h).padStart(2, '0')}:00`);
    const v = parkBookings.filter((b) => (b.checkIn ?? b.start) <= t && (b.checkOut ?? (b.status === 'em_curso' ? now + HOUR : b.end)) > t && b.status !== 'confirmada').length;
    return { label: `${h}h`, value: v as number | null };
  });
  const peak = data.reduce((m, d, i) => (d.value !== null && d.value > (data[m].value ?? -1) ? i : m), 0);

  return (
    <GestorScreen title="Estatísticas" back subtitle={`${dateShort(now)} · Dados até às ${time(now)}`}>
      <ChipGroup value={period} onChange={setPeriod} options={[{ value: 'hoje', label: 'Hoje' }, { value: '7', label: '7 dias' }, { value: '30', label: '30 dias' }]} />
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        <StatCard value={euro(s.revenue)} label={`Receita · ${period === 'hoje' ? 'hoje' : `${period} dias`} · ${s.hours} h pagas`} />
        <StatCard value={euro(week.revenue)} label={`Receita da semana · ${week.count} estadias`} />
      </View>
      <Card>
        <Text style={{ fontWeight: '800' }}>Ocupação por hora (hoje)</Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 10 }}>Viaturas / {total} lugares · Agora: {parkOccupancy(state, park, now).ocupado}</Text>
        <BarChart data={data} max={total} highlight={hours.indexOf(curHour)} />
        {data[peak]?.value !== null && <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>Pico às {data[peak].label}: {(((data[peak].value ?? 0) / total) * 100).toFixed(1).replace('.', ',')}%</Text>}
      </Card>
      <Card>
        <Text style={{ fontWeight: '800', marginBottom: 10 }}>Ocupação por piso · agora</Text>
        {park.floors.map((f) => {
          const occ = f.spots.filter((sp) => spotStateNow(sp, parkBookings, now).state === 'ocupado').length;
          return (
            <View key={f.id} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text>{f.name}</Text>
                <Text style={{ fontWeight: '700' }}>{occ}/{f.spots.length} · {Math.round((occ / f.spots.length) * 100)}%</Text>
              </View>
              <ProgressBar value={occ / f.spots.length} />
            </View>
          );
        })}
      </Card>
      <InfoBox text={`Tarifa: ${euro(park.prices.carHour)}/h. Receita de pagamentos na app; não corresponde apenas às viaturas presentes.`} />
    </GestorScreen>
  );
}
