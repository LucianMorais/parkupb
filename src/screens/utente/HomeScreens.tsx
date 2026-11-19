import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, EmptyState, InfoBox, InfoRow, ParkSelector, Screen, SectionTitle, TextField } from '../../components';
import { colors, radius } from '../../theme';
import { useApp, useMe } from '../../store/AppContext';
import { activePasses, spotLabel, unread, vehicleById } from '../../store/selectors';
import { UProps, useUNav } from '../../navigation/types';
import { date, dateTime, duration, euro, longDate, time } from '../../utils/format';
import { parkOccupancy, freeSpotsFor } from '../../utils/rules';

export function HomeScreen() {
  const nav = useUNav();
  const { state, park, now } = useApp();
  const me = useMe();
  const occ = parkOccupancy(state, park, now);
  // Pode haver várias estadias em curso (uma por veículo); a próxima reserva é a confirmada mais próxima.
  const live = state.bookings.filter((b) => b.userId === me.id && b.status === 'em_curso').sort((a, b) => (b.checkIn ?? b.start) - (a.checkIn ?? a.start));
  const next = state.bookings
    .filter((b) => b.userId === me.id && b.status === 'confirmada' && b.end > now)
    .sort((a, b) => a.start - b.start)[0];
  const passes = activePasses(state, me.id, park.id, now);
  const unreadCount = unread(state, me.id);
  const first = me.name.split(' ')[0];

  return (
    <Screen
      title={`Olá, ${first} 👋`}
      right={
        <Pressable onPress={() => nav.navigate('Notifications')} style={styles.bell} accessibilityLabel={`Notificações, ${unreadCount} por ler`}>
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
          {unreadCount > 0 && <View style={styles.dot}><Text style={styles.dotText}>{unreadCount}</Text></View>}
        </Pressable>
      }
    >
      <ParkSelector onPress={() => nav.navigate('SelectPark')} />
      <Text style={{ color: colors.muted, marginBottom: 10 }}>{longDate(now)}</Text>

      {me.status === 'por_validar' && (
        <InfoBox tone="warning" title="Conta a aguardar validação" text="Um gestor do parque vai validar o seu registo. Até lá pode explorar a app, mas ainda não pode reservar." />
      )}

      <Card tone="primary">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={styles.freeBig}>{occ.livre}</Text>
            <Text style={styles.freeText}>lugares livres de {occ.total}</Text>
          </View>
          <View style={styles.pBadge}><Ionicons name="car-outline" size={22} color="#fff" /></View>
        </View>
        <Text style={styles.freeSmall}>Atualizado às {time(now)} · {park.open24 ? 'Aberto 24 horas' : `Aberto das ${park.openTime} às ${park.closeTime}`}</Text>
      </Card>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
        <Button title="Nova reserva" icon="calendar-outline" onPress={() => nav.navigate('UtenteTabs', { screen: 'Reservar' })} style={{ flex: 1 }} disabled={me.status !== 'ativa'} />
        <Button title="Entrar agora" icon="enter-outline" variant="accent" onPress={() => nav.navigate('Immediate')} style={{ flex: 1 }} disabled={me.status !== 'ativa'} />
      </View>

      {live.length > 0 && (
        <>
          <SectionTitle title={live.length > 1 ? `Estadias em curso (${live.length})` : 'Estadia em curso'} />
          {live.map((b) => <NextBookingCard key={b.id} id={b.id} />)}
        </>
      )}
      {(next || !live.length) && <SectionTitle title="A sua próxima reserva" />}
      {next ? (
        <NextBookingCard id={next.id} />
      ) : !live.length && (
        <EmptyState icon="calendar-clear-outline" title="Sem reservas futuras" text="Reserve com antecedência e garanta o seu lugar." />
      )}

      {passes.map((pass) => (
        <Card key={pass.id} onPress={() => nav.navigate('UtenteTabs', { screen: 'Avencas' })}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '800', fontSize: 15 }}>Avença {pass.plan === '24h' ? 'mensal 24 horas' : 'mensal diurna'}</Text>
            <Badge label="Ativa" tone="success" />
          </View>
          <Text style={{ color: colors.muted, marginTop: 4 }}>Válida até {date(pass.to)} · {vehicleById(state, pass.vehicleId)?.plate}</Text>
        </Card>
      ))}

      <InfoBox tone="warning" icon="qr-code-outline" title="Entrada e saída sem complicações" text="Tenha o QR Code da reserva pronto junto à cancela." />
    </Screen>
  );
}

function NextBookingCard({ id }: { id: string }) {
  const nav = useUNav();
  const { state, now } = useApp();
  const b = state.bookings.find((x) => x.id === id)!;
  const sp = spotLabel(state, b.spotId);
  const v = vehicleById(state, b.vehicleId);
  const live = b.status === 'em_curso';
  return (
    <Card onPress={() => (b.type === 'imediata' ? nav.navigate('Stay', { id: b.id }) : nav.navigate('Booking', { id: b.id }))}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>Lugar {sp?.code}</Text>
        <Badge label={live ? 'Em curso' : 'Confirmada'} tone={live ? 'primary' : 'success'} />
      </View>
      <Text style={{ color: colors.muted, marginBottom: 8 }}>{sp?.park.name} · {sp?.floor} · {sp?.zone}</Text>
      <InfoRow label="Entrada" value={dateTime(b.checkIn ?? b.start)} />
      {b.type !== 'imediata' && <InfoRow label="Saída" value={dateTime(b.end)} />}
      {live && <InfoRow label="Tempo decorrido" value={duration(now - (b.checkIn ?? b.start))} />}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <Text style={{ color: colors.muted, fontSize: 12.5 }}>{v?.plate} · {b.type === 'imediata' ? 'Valor calculado à saída' : `${euro(b.amount)} · Pago · ${b.method}`}</Text>
        <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Ver QR Code →</Text>
      </View>
    </Card>
  );
}

export function SelectParkScreen({ navigation }: UProps<'SelectPark'>) {
  const { state, park, now, dispatch } = useApp();
  const [q, setQ] = React.useState('');
  const [sel, setSel] = React.useState(park.id);
  const list = state.parks.filter((p) => p.active && (p.name + p.area).toLowerCase().includes(q.toLowerCase()));
  return (
    <Screen
      title="Selecionar parque"
      back
      footer={<Button title="Confirmar parque" onPress={() => { dispatch({ type: 'SELECT_PARK', parkId: sel }); navigation.goBack(); }} />}
    >
      <Text style={{ color: colors.muted, marginBottom: 12 }}>Escolha onde pretende estacionar em Bragança.</Text>
      <TextField label="Procurar parque" placeholder="Bragança" value={q} onChangeText={setQ} icon="search" />
      {list.map((p) => {
        const free = freeSpotsFor(state, p, now, now + 15 * 60000, now, 'automovel').length;
        const on = p.id === sel;
        return (
          <Card key={p.id} onPress={() => setSel(p.id)} style={on ? { borderColor: colors.primary, backgroundColor: colors.primarySoft } : undefined}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.pIcon}><Text style={{ color: colors.primary, fontWeight: '900' }}>P</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', color: colors.text }}>{p.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 12.5 }}>{p.address} · {p.open24 ? '24 horas' : `${p.openTime}–${p.closeTime}`}</Text>
              </View>
              <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={on ? colors.primary : colors.faint} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <Badge label={`${free} livres`} tone={free > 5 ? 'success' : free > 0 ? 'warning' : 'danger'} />
              <Text style={{ fontWeight: '800' }}>{euro(p.prices.carHour)} / hora</Text>
            </View>
          </Card>
        );
      })}
      <Text style={{ color: colors.muted, fontSize: 12 }}>A disponibilidade apresentada é atual. Os lugares para a sua reserva dependem do período escolhido.</Text>
    </Screen>
  );
}

export function NotificationsScreen() {
  const { state, dispatch } = useApp();
  const me = useMe();
  const list = state.notifications.filter((n) => n.userId === me.id).sort((a, b) => b.createdAt - a.createdAt);
  useEffect(() => {
    const t = setTimeout(() => dispatch({ type: 'READ_NOTIFICATIONS', userId: me.id }), 1200);
    return () => clearTimeout(t);
  }, [dispatch, me.id]);
  return (
    <Screen title="Notificações" back>
      {list.length === 0 && <EmptyState icon="notifications-off-outline" title="Sem notificações" text="Os avisos do parque e o estado das reservas aparecem aqui." />}
      {list.map((n) => (
        <Card key={n.id} style={!n.read ? { borderColor: colors.primary } : undefined}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ fontWeight: '800', flex: 1 }}>{n.title}</Text>
            {!n.read && <Badge label="Nova" />}
          </View>
          <Text style={{ color: colors.text, marginTop: 4 }}>{n.body}</Text>
          <Text style={{ color: colors.faint, fontSize: 12, marginTop: 6 }}>{dateTime(n.createdAt)}</Text>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bell: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  dotText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  freeBig: { fontSize: 40, fontWeight: '900', color: '#fff' },
  freeText: { color: '#D7EAEE', fontSize: 14 },
  freeSmall: { color: '#D7EAEE', fontSize: 12, marginTop: 10 },
  pBadge: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  pIcon: { width: 36, height: 36, borderRadius: 9, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
