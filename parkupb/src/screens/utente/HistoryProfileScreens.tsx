import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import {
  Avatar, Badge, Button, Card, ChipGroup, ConfirmSheet, EmptyState, InfoBox, ListItem, OptionCard, Screen, SectionTitle, TextField, statusBadge,
} from '../../components';
import { colors } from '../../theme';
import { useApp, useMe } from '../../store/AppContext';
import { bookingsOf, spotLabel, vehicleById, vehiclesOf } from '../../store/selectors';
import { useUNav } from '../../navigation/types';
import { date, euro, isValidPlate, monthYear, normalizePlate, time, uid } from '../../utils/format';
import { VehicleType } from '../../types/models';

type Filter = 'todas' | 'proximas' | 'concluidas' | 'canceladas';

/** RFC0: histórico por veículo, com valores pagos. */
export function HistoryScreen() {
  const nav = useUNav();
  const { state } = useApp();
  const me = useMe();
  const [filter, setFilter] = useState<Filter>('todas');
  const [vehicle, setVehicle] = useState<string>('todos');
  const all = bookingsOf(state, me.id);
  const myVehicles = state.vehicles.filter((v) => v.ownerId === me.id);
  const list = all.filter((b) =>
    (vehicle === 'todos' || b.vehicleId === vehicle) &&
    (filter === 'todas' ||
      (filter === 'proximas' && (b.status === 'confirmada' || b.status === 'em_curso')) ||
      (filter === 'concluidas' && b.status === 'concluida') ||
      (filter === 'canceladas' && b.status === 'cancelada')));
  const paid = list.filter((b) => b.status === 'concluida' || b.status === 'confirmada' || b.status === 'em_curso').reduce((a, b) => a + b.amount, 0);

  // Agrupa por mês
  const groups: { key: string; items: typeof list }[] = [];
  list.forEach((b) => {
    const key = monthYear(b.start);
    const g = groups.find((x) => x.key === key);
    if (g) g.items.push(b); else groups.push({ key, items: [b] });
  });

  return (
    <Screen title="Histórico">
      <ChipGroup value={filter} onChange={setFilter} options={[
        { value: 'todas', label: 'Todas' }, { value: 'proximas', label: 'Próximas' }, { value: 'concluidas', label: 'Concluídas' }, { value: 'canceladas', label: 'Canceladas' },
      ]} />
      <ChipGroup value={vehicle} onChange={setVehicle} options={[
        { value: 'todos', label: 'Todos os veículos', icon: 'car-sport-outline' },
        ...myVehicles.map((v) => ({ value: v.id, label: v.plate, icon: (v.type === 'automovel' ? 'car-outline' : 'bicycle-outline') as 'car-outline' })),
      ]} />
      <Card tone="info">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontWeight: '700' }}>{list.length} {list.length === 1 ? 'registo' : 'registos'}</Text>
          <Text style={{ fontWeight: '900', color: colors.primary, fontSize: 18 }}>{euro(paid)}</Text>
        </View>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Total pago no filtro selecionado (exclui reembolsos)</Text>
      </Card>
      {list.length === 0 && <EmptyState icon="time-outline" title="Sem registos" text="Ainda não há reservas para este filtro." />}
      {groups.map((g) => (
        <View key={g.key}>
          <SectionTitle title={g.key} />
          {g.items.map((b) => {
            const sb = statusBadge.booking(b.status, b.refunded);
            const sp = spotLabel(state, b.spotId);
            const v = vehicleById(state, b.vehicleId);
            return (
              <Card key={b.id} onPress={() => (b.type === 'imediata' ? nav.navigate('Stay', { id: b.id }) : nav.navigate('Booking', { id: b.id }))}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontWeight: '800' }}>{date(b.start)}</Text>
                  <Badge label={sb.label} tone={sb.tone} />
                </View>
                <Text style={{ color: colors.text, marginTop: 4 }}>{time(b.start)}–{time(b.end)} · Lugar {sp?.code} · {sp?.park.name.replace('Parque ', '')}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={{ color: colors.muted, fontSize: 12.5 }}>{v?.plate} · {b.type === 'imediata' ? 'Entrada imediata' : b.type === 'avenca' ? 'Avença' : 'Antecipada'}</Text>
                  <Text style={{ fontWeight: '800' }}>{b.status === 'cancelada' ? `Reemb. ${euro(b.refunded ?? 0)}` : b.type === 'imediata' && b.status === 'em_curso' ? 'À saída' : euro(b.amount)}</Text>
                </View>
              </Card>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}

export function ProfileScreen() {
  const nav = useUNav();
  const { state, dispatch, resetDemo } = useApp();
  const me = useMe();
  const vehicles = vehiclesOf(state, me.id);
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <Screen title="Perfil">
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Avatar name={me.name} uri={me.photoUri} size={60} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '800' }}>{me.name}</Text>
            <Text style={{ color: colors.muted }}>{me.email}</Text>
            <Text style={{ color: colors.muted }}>{me.phone}</Text>
          </View>
        </View>
        <View style={{ marginTop: 10 }}><Badge {...statusBadge.account(me.status)} /></View>
      </Card>
      <SectionTitle title="Os meus veículos" action="Gerir" onAction={() => nav.navigate('Vehicles')} />
      <Card>
        {vehicles.map((v, i) => (
          <ListItem key={v.id} title={v.plate} subtitle={`${v.type === 'automovel' ? 'Automóvel' : 'Motociclo'} · ${v.model}${i === 0 ? ' · Veículo principal' : ''}`}
            left={<Ionicons name={v.type === 'automovel' ? 'car-outline' : 'bicycle-outline'} size={22} color={colors.primary} />} />
        ))}
      </Card>
      <Card>
        <ListItem title="Dados pessoais" subtitle="Nome, telemóvel, foto e palavra-passe" left={<Ionicons name="person-outline" size={20} color={colors.primary} />} onPress={() => nav.navigate('EditProfile')} />
        <ListItem title="Notificações" left={<Ionicons name="notifications-outline" size={20} color={colors.primary} />} onPress={() => nav.navigate('Notifications')} />
        <ListItem title="Alterar parque" left={<Ionicons name="location-outline" size={20} color={colors.primary} />} onPress={() => nav.navigate('SelectPark')} />
        <ListItem title="Repor dados de demonstração" left={<Ionicons name="refresh-outline" size={20} color={colors.primary} />} onPress={() => setConfirmReset(true)} />
      </Card>
      <InfoBox icon="shield-checkmark-outline" text="A sua conta funciona em todos os parques ParkUPB. Os seus dados ficam consigo." />
      <Button title="Terminar sessão" variant="secondary" icon="log-out-outline" onPress={() => dispatch({ type: 'LOGOUT' })} />
      <Text style={{ textAlign: 'center', color: colors.faint, fontSize: 12, marginTop: 12 }}>ParkUPB · Versão 1.0.0 · Etapa Componentes</Text>
      <ConfirmSheet visible={confirmReset} onClose={() => setConfirmReset(false)} title="Repor dados?" text="Todas as alterações feitas nesta demonstração (em todos os perfis) são apagadas e os dados iniciais são repostos." confirmLabel="Repor" onConfirm={() => { resetDemo(); setConfirmReset(false); }} />
    </Screen>
  );
}

/** RFC5: modificar nome, telemóvel, foto e palavra-passe. */
export function EditProfileScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { dispatch } = useApp();
  const me = useMe();
  const [name, setName] = useState(me.name);
  const [phone, setPhone] = useState(me.phone);
  const [photoUri, setPhotoUri] = useState(me.photoUri);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6 });
    if (!res.canceled) setPhotoUri(res.assets[0].uri);
  };

  const save = () => {
    const e: Record<string, string | null> = {
      name: name.trim().split(' ').length < 2 ? 'Indique o nome completo.' : null,
      phone: phone.replace(/\D/g, '').length < 9 ? 'Telemóvel inválido.' : null,
      current: next && current !== me.password ? 'Palavra-passe atual incorreta.' : null,
      next: next && !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(next) ? 'Pelo menos 8 caracteres, uma letra e um número.' : null,
    };
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;
    dispatch({ type: 'UPDATE_USER', userId: me.id, patch: { name: name.trim(), phone, photoUri, ...(next ? { password: next } : {}) } });
    navigation.goBack();
  };

  return (
    <Screen title="Dados pessoais" back footer={<Button title="Guardar alterações" onPress={save} />}>
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <Avatar name={name} uri={photoUri} size={88} />
        <Pressable onPress={pickPhoto} style={{ marginTop: 8 }}><Text style={{ color: colors.primary, fontWeight: '700' }}>Alterar foto</Text></Pressable>
      </View>
      <TextField label="Nome" value={name} onChangeText={setName} error={errors.name} />
      <TextField label="Email" value={me.email} editable={false} hint="O email identifica a conta e não pode ser alterado." />
      <TextField label="Telemóvel" value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={errors.phone} />
      <SectionTitle title="Alterar palavra-passe" />
      <TextField label="Palavra-passe atual" value={current} onChangeText={setCurrent} secure error={errors.current} />
      <TextField label="Nova palavra-passe" value={next} onChangeText={setNext} secure error={errors.next} hint="Deixe em branco para manter a atual." />
    </Screen>
  );
}

export function VehiclesScreen() {
  const { state, dispatch } = useApp();
  const me = useMe();
  const vehicles = vehiclesOf(state, me.id);
  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState<VehicleType>('automovel');
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const p = normalizePlate(plate);
    if (!isValidPlate(p)) return setError('Matrícula no formato AA-12-BC.');
    if (state.vehicles.some((v) => v.plate === p && v.ownerId && !v.archived)) return setError('Esta matrícula já está associada a uma conta.');
    dispatch({ type: 'ADD_VEHICLE', vehicle: { id: uid('v'), ownerId: me.id, plate: p, type, model: model.trim() || (type === 'automovel' ? 'Automóvel' : 'Motociclo') } });
    setPlate(''); setModel(''); setError(null);
  };

  return (
    <Screen title="Os meus veículos" back>
      {vehicles.map((v) => (
        <Card key={v.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name={v.type === 'automovel' ? 'car-outline' : 'bicycle-outline'} size={24} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', fontSize: 16 }}>{v.plate}</Text>
              <Text style={{ color: colors.muted }}>{v.model} · {state.bookings.filter((b) => b.vehicleId === v.id).length} reservas</Text>
            </View>
            {vehicles.length > 1 && (
              <Pressable onPress={() => dispatch({ type: 'REMOVE_VEHICLE', vehicleId: v.id })} hitSlop={10} accessibilityLabel={`Remover ${v.plate}`}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </Pressable>
            )}
          </View>
        </Card>
      ))}
      <SectionTitle title="Adicionar veículo" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <OptionCard label="Automóvel" icon="car-outline" active={type === 'automovel'} onPress={() => setType('automovel')} />
        <OptionCard label="Motociclo" icon="bicycle-outline" active={type === 'motociclo'} onPress={() => setType('motociclo')} />
      </View>
      <TextField label="Matrícula" placeholder="AA-12-BC" value={plate} onChangeText={(t) => setPlate(normalizePlate(t))} autoCapitalize="characters" error={error} />
      <TextField label="Marca e modelo" placeholder="Renault Clio" value={model} onChangeText={setModel} />
      <Button title="Adicionar veículo" icon="add" onPress={add} />
      <InfoBox text="Ao remover um veículo, o histórico de reservas associado mantém-se." />
    </Screen>
  );
}
