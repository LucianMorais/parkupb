import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Avatar, Badge, Button, Card, ChipGroup, ConfirmSheet, Divider, GridItem, InfoBox, InfoRow, OptionCard, ProgressBar, SectionTitle, Sheet,
  SpotGrid, SpotLegend, StatCard, Stepper, TextField,
} from '../../components';
import { colors } from '../../theme';
import { useApp } from '../../store/AppContext';
import { parkStatsBetween } from '../../store/selectors';
import { AProps, useANav } from '../../navigation/types';
import { DAY, euro, longDate, time, uid } from '../../utils/format';
import { allSpots, parkOccupancy } from '../../utils/rules';
import { Floor, Park, Prices, Spot, SpotKind } from '../../types/models';
import { AdminScreen } from './AdminScreen';

const pct = (v: number) => `${(v * 100).toFixed(1).replace('.', ',')}%`;

export function OverviewScreen() {
  const nav = useANav();
  const { state, now } = useApp();
  const parks = state.parks;
  const totals = parks.map((p) => parkOccupancy(state, p, now));
  const totalSpots = totals.reduce((a, o) => a + o.total, 0);
  const avg = totals.reduce((a, o) => a + o.rate, 0) / Math.max(1, totals.length);
  const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const revenue = parks.reduce((a, p) => a + parkStatsBetween(state, p.id, monthStart.getTime(), now + DAY).revenue, 0);
  const pending = state.users.filter((u) => u.status === 'por_validar').length;

  return (
    <AdminScreen title="Visão geral" subtitle={`${longDate(now)} · Atualizado às ${time(now)}`}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
        <StatCard value={parks.length} label="Parques" />
        <StatCard value={totalSpots} label="Lugares totais" />
        <StatCard value={pct(avg)} label="Ocupação média" />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <StatCard value={euro(revenue)} label="Receita do mês" icon="trending-up" tone="success" />
        <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => nav.navigate('AdminDrawer', { screen: 'Contas', params: { tab: 'validar' } })}>
          <StatCard value={pending} label="Por validar · Rever →" icon="person-add-outline" tone="warning" />
        </Pressable>
      </View>
      <SectionTitle title="Os seus parques" action="Ver parques →" onAction={() => nav.navigate('AdminDrawer', { screen: 'Parques' })} />
      {parks.map((p, i) => (
        <Card key={p.id} onPress={() => nav.navigate('ParkDetail', { id: p.id })}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '800', flex: 1 }}>{p.name}</Text>
            <Text style={{ fontWeight: '800', color: colors.primary }}>{pct(totals[i].rate)}</Text>
          </View>
          <Text style={{ color: colors.muted, fontSize: 12.5, marginBottom: 6 }}>{totals[i].ocupado}/{totals[i].total} ocupados · {p.floors.length} pisos {p.active ? '' : '· Inativo'}</Text>
          <ProgressBar value={totals[i].rate} />
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>{totals[i].livre} livres · {totals[i].reservado} reservados · {totals[i].desativado + totals[i].bloqueado} desativados</Text>
        </Card>
      ))}
    </AdminScreen>
  );
}

export function ParksScreen() {
  const nav = useANav();
  const { state } = useApp();
  const active = state.parks.filter((p) => p.active);
  return (
    <AdminScreen title="Parques" subtitle={`${active.length} parques ativos · ${active.reduce((a, p) => a + allSpots(p).length, 0)} lugares em Bragança`}>
      {state.parks.map((p) => (
        <Card key={p.id} onPress={() => nav.navigate('ParkDetail', { id: p.id })}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '800', flex: 1 }}>{p.name}</Text>
            <Badge label={p.active ? 'Ativo' : 'Inativo'} tone={p.active ? 'success' : 'neutral'} />
          </View>
          <Text style={{ color: colors.muted, marginVertical: 4 }}>{p.address}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text>{p.floors.length} pisos · {allSpots(p).length} lugares · {p.open24 ? 'Aberto 24 horas' : `${p.openTime}–${p.closeTime}`}</Text>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Ver →</Text>
          </View>
        </Card>
      ))}
      <Button title="Criar parque" icon="add" onPress={() => nav.navigate('CreatePark')} />
    </AdminScreen>
  );
}

export function ParkDetailScreen({ route, navigation }: AProps<'ParkDetail'>) {
  const { state, now, dispatch } = useApp();
  const p = state.parks.find((x) => x.id === route.params.id)!;
  const occ = parkOccupancy(state, p, now);
  const managers = state.users.filter((u) => u.role === 'gestor' && u.parkIds.includes(p.id));
  const [confirm, setConfirm] = useState(false);
  const [notify, setNotify] = useState(true);
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ name: p.name, address: p.address, open24: p.open24, openTime: p.openTime, closeTime: p.closeTime });
  const future = state.bookings.filter((b) => b.parkId === p.id && b.status === 'confirmada').length;
  const passes = state.passes.filter((x) => x.parkId === p.id && x.to > now).length;

  return (
    <AdminScreen back title="Detalhe do parque">
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontWeight: '800', fontSize: 17, flex: 1 }}>{p.name}</Text>
          <Badge label={p.active ? 'Ativo' : 'Inativo'} tone={p.active ? 'success' : 'neutral'} />
        </View>
        <Text style={{ color: colors.muted }}>{p.address}</Text>
        <Text style={{ marginTop: 4 }}>{allSpots(p).length} lugares · {p.floors.length} pisos · {p.open24 ? 'Aberto 24 horas' : `${p.openTime}–${p.closeTime}`}</Text>
        <Divider />
        <InfoRow label={`${occ.ocupado}/${occ.total} ocupados`} value={pct(occ.rate)} />
        <ProgressBar value={occ.rate} />
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>{occ.livre} livres · {occ.reservado} reservados · {occ.desativado} desativados</Text>
      </Card>
      <SectionTitle title="Pisos e lugares" />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {p.floors.map((fl) => <StatCard key={fl.id} value={fl.spots.length} label={`${fl.name} · Zona ${fl.zone}`} />)}
      </View>
      <SectionTitle title="Gestores atribuídos" action={`${managers.length} gestores`} />
      <Card>
        {managers.map((m) => (
          <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
            <Avatar name={m.name} size={34} />
            <Text style={{ fontWeight: '700' }}>{m.name}</Text>
          </View>
        ))}
        {managers.length === 0 && <Text style={{ color: colors.muted }}>Sem gestores atribuídos.</Text>}
      </Card>
      <View style={{ gap: 8 }}>
        <Button title="Editar parque" icon="create-outline" variant="secondary" onPress={() => setEdit(true)} />
        <Button title="Editar pisos e lugares" icon="grid-outline" variant="secondary" onPress={() => navigation.navigate('EditFloors', { id: p.id })} />
        {p.active
          ? <Button title="Desativar parque" variant="ghost" onPress={() => setConfirm(true)} />
          : <Button title="Reativar parque" onPress={() => dispatch({ type: 'SET_PARK_ACTIVE', parkId: p.id, active: true, notify: false, now })} />}
      </View>

      <ConfirmSheet visible={confirm} onClose={() => setConfirm(false)} title={`Desativar ${p.name}?`} cancelLabel="Manter ativo" confirmLabel="Desativar parque"
        text="O parque deixa de aceitar novas reservas e avenças. As reservas e avenças ativas mantêm-se até ao fim."
        onConfirm={() => { dispatch({ type: 'SET_PARK_ACTIVE', parkId: p.id, active: false, notify, now }); setConfirm(false); }}>
        <Card>
          <InfoRow label="Reservas futuras" value={String(future)} />
          <InfoRow label="Avenças ativas" value={String(passes)} />
          <InfoRow label="Gestores atribuídos" value={String(managers.length)} />
        </Card>
        <Pressable onPress={() => setNotify((n) => !n)} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Ionicons name={notify ? 'checkbox' : 'square-outline'} size={22} color={colors.primary} />
          <Text>Notificar utentes com reservas e avenças</Text>
        </Pressable>
      </ConfirmSheet>

      <Sheet visible={edit} onClose={() => setEdit(false)} title="Editar parque" footer={<Button title="Guardar" onPress={() => { dispatch({ type: 'UPDATE_PARK', parkId: p.id, patch: f }); setEdit(false); }} />}>
        <TextField label="Nome do parque" value={f.name} onChangeText={(t) => setF({ ...f, name: t })} />
        <TextField label="Morada" value={f.address} onChangeText={(t) => setF({ ...f, address: t })} />
        <HoursFields value={f} onChange={(h) => setF({ ...f, ...h })} />
      </Sheet>
    </AdminScreen>
  );
}

/** RFA1: horário de funcionamento (limita as horas das reservas). */
function HoursFields({ value, onChange }: { value: { open24: boolean; openTime: string; closeTime: string }; onChange: (v: { open24: boolean; openTime: string; closeTime: string }) => void }) {
  const opts = ['06:00', '07:00', '08:00', '09:00'];
  const close = ['20:00', '21:00', '22:00', '23:00'];
  return (
    <View>
      <OptionCard label="Aberto 24 horas" active={value.open24} onPress={() => onChange({ ...value, open24: !value.open24 })} icon="time-outline" />
      {!value.open24 && (
        <>
          <Text style={{ fontWeight: '600', marginVertical: 6 }}>Abertura</Text>
          <ChipGroup value={value.openTime} onChange={(t) => onChange({ ...value, openTime: t })} scroll={false} options={opts.map((o) => ({ value: o, label: o }))} />
          <Text style={{ fontWeight: '600', marginBottom: 6 }}>Fecho</Text>
          <ChipGroup value={value.closeTime} onChange={(t) => onChange({ ...value, closeTime: t })} scroll={false} options={close.map((o) => ({ value: o, label: o }))} />
          <InfoBox tone="warning" text="As reservas ficam limitadas a este horário." />
        </>
      )}
    </View>
  );
}

interface FloorDraft { name: string; zone: string; count: number; mobility: number; moto: number }

function buildFloors(parkId: string, drafts: FloorDraft[]): Floor[] {
  return drafts.map((d) => {
    const id = `${parkId}_${d.zone}`;
    const spots: Spot[] = Array.from({ length: d.count }, (_, i) => {
      const n = i + 1;
      const kind: SpotKind = n <= d.mobility ? 'mobilidade' : n > d.count - d.moto ? 'motociclo' : 'normal';
      return { id: `${id}${String(n).padStart(2, '0')}`, code: `${d.zone}${String(n).padStart(2, '0')}`, floorId: id, kind, active: true };
    });
    return { id, name: d.name, zone: d.zone, spots };
  });
}

function Counter({ label, value, onChange, min = 0, max = 99 }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable onPress={() => onChange(Math.max(min, value - 1))} style={{ padding: 4 }}><Ionicons name="remove-circle-outline" size={24} color={colors.primary} /></Pressable>
        <Text style={{ fontWeight: '800', fontSize: 16, minWidth: 24, textAlign: 'center' }}>{value}</Text>
        <Pressable onPress={() => onChange(Math.min(max, value + 1))} style={{ padding: 4 }}><Ionicons name="add-circle-outline" size={24} color={colors.primary} /></Pressable>
      </View>
    </View>
  );
}

/** Criar parque em 3 passos: dados, pisos e lugares, rever. */
export function CreateParkScreen({ navigation }: AProps<'CreatePark'>) {
  const { dispatch } = useApp();
  const [step, setStep] = useState(0);
  const [d, setD] = useState({ name: '', address: '', open24: false, openTime: '07:00', closeTime: '23:00' });
  const [priceDraft, setPriceDraft] = useState({ carHour: '1,00', pass24: '50,00' });
  const parsePrice = (value: string) => {
    const normalized = value.trim().replace(',', '.');
    return normalized ? Math.round(Number(normalized) * 100) : NaN;
  };
  const prices: Prices = {
    carHour: parsePrice(priceDraft.carHour),
    motoHour: 50,
    pass24: parsePrice(priceDraft.pass24),
    passDay: 3000,
  };
  const validPrices = prices.carHour > 0 && prices.pass24 > 0;
  const [floors, setFloors] = useState<FloorDraft[]>([
    { name: 'Piso -1', zone: 'A', count: 20, mobility: 1, moto: 2 },
    { name: 'Piso 0', zone: 'B', count: 24, mobility: 2, moto: 2 },
  ]);
  const total = floors.reduce((a, f) => a + f.count, 0);
  const id = d.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'novo';
  const preview = buildFloors(id, floors);
  const setFloor = (i: number, patch: Partial<FloorDraft>) => setFloors((fs) => fs.map((f, k) => (k === i ? { ...f, ...patch } : f)));
  const validStep0 = d.name.trim().length > 3 && d.address.trim().length > 3;

  const create = () => {
    if (!validPrices) return;
    const park: Park = {
      id: `${id}-${uid('p').slice(-4)}`, name: d.name.trim(), address: d.address.trim(), area: d.address.split(',')[0], lat: 41.81, lng: -6.757,
      open24: d.open24, openTime: d.open24 ? '00:00' : d.openTime, closeTime: d.open24 ? '23:59' : d.closeTime, active: true, prices, floors: [],
    };
    park.floors = buildFloors(park.id, floors);
    dispatch({ type: 'CREATE_PARK', park });
    navigation.replace('ParkDetail', { id: park.id });
  };

  const footer = step === 0
    ? <Button title="Continuar" disabled={!validStep0 || !validPrices} onPress={() => setStep(1)} />
    : (
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Voltar" variant="secondary" onPress={() => setStep(step - 1)} style={{ flex: 1 }} />
        <Button title={step === 1 ? 'Rever parque' : 'Criar parque'} onPress={() => (step === 1 ? setStep(2) : create())} disabled={total === 0 || !validPrices} style={{ flex: 1 }} />
      </View>
    );

  return (
    <AdminScreen back title="Criar parque" subtitle={`Passo ${step + 1} de 3`} footer={footer}>
      <Stepper steps={['Dados', 'Pisos e lugares', 'Rever']} current={step} />
      {step === 0 && (
        <>
          <TextField label="Nome do parque" placeholder="Parque de São Bento" value={d.name} onChangeText={(t) => setD({ ...d, name: t })} />
          <TextField label="Morada" placeholder="Av. Abade de Baçal, Bragança" value={d.address} onChangeText={(t) => setD({ ...d, address: t })} icon="location-outline" />
          <HoursFields value={d} onChange={(h) => setD({ ...d, ...h })} />
          <SectionTitle title="Preços iniciais" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextField style={{ flex: 1 }} label="Automóvel · €/hora" value={priceDraft.carHour} keyboardType="decimal-pad"
              onChangeText={(t) => setPriceDraft((draft) => ({ ...draft, carHour: t }))} />
            <TextField style={{ flex: 1 }} label="Avença 24 h · €/mês" value={priceDraft.pass24} keyboardType="decimal-pad"
              onChangeText={(t) => setPriceDraft((draft) => ({ ...draft, pass24: t }))} />
          </View>
          {!validPrices && <InfoBox tone="danger" text="Os preços têm de ser valores superiores a zero." />}
        </>
      )}
      {step === 1 && (
        <>
          {floors.map((f, i) => (
            <Card key={i}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontWeight: '800' }}>{f.name} · Zona {f.zone}</Text>
                {floors.length > 1 && <Pressable onPress={() => setFloors((fs) => fs.filter((_, k) => k !== i))}><Ionicons name="trash-outline" size={20} color={colors.danger} /></Pressable>}
              </View>
              <View style={{ flexDirection: 'row' }}>
                <Counter label="N.º de lugares" value={f.count} onChange={(n) => setFloor(i, { count: n })} min={1} max={60} />
                <Counter label="Mob. reduzida" value={f.mobility} onChange={(n) => setFloor(i, { mobility: n })} max={f.count} />
                <Counter label="Motociclos" value={f.moto} onChange={(n) => setFloor(i, { moto: n })} max={f.count} />
              </View>
            </Card>
          ))}
          <Button title="Adicionar piso" icon="add" variant="secondary" onPress={() => {
            const zone = String.fromCharCode(65 + floors.length);
            setFloors([...floors, { name: `Piso ${floors.length - 1}`, zone, count: 16, mobility: 1, moto: 2 }]);
          }} />
          <Card tone="info" style={{ marginTop: 12 }}>
            <Text style={{ fontWeight: '800' }}>{total} lugares · {floors.length} pisos</Text>
            <Text style={{ color: colors.muted }}>{floors.map((f) => f.count).join(' + ')} · Total automático</Text>
          </Card>
        </>
      )}
      {step === 2 && (
        <>
          <Card>
            <Text style={{ fontWeight: '800', fontSize: 16 }}>{d.name}</Text>
            <Text style={{ color: colors.muted }}>{d.address}</Text>
            <Text style={{ marginTop: 4 }}>{d.open24 ? 'Aberto 24 horas' : `Todos os dias · ${d.openTime}–${d.closeTime}`}</Text>
            <Divider />
            <Text>{total} lugares · {floors.length} pisos</Text>
            <Text style={{ color: colors.muted }}>{floors.map((f) => `${f.name}: ${f.count}`).join(' · ')}</Text>
            <Text style={{ color: colors.muted }}>Automóvel {euro(prices.carHour)}/h · Avença 24 h {euro(prices.pass24)}</Text>
          </Card>
          <Card>
            <Text style={{ fontWeight: '800', marginBottom: 8 }}>{preview[0].name} · Zona {preview[0].zone} · Pré-visualização</Text>
            <SpotGrid items={preview[0].spots.map((s) => ({ spot: s, state: 'livre' }))} columns={6} compact />
          </Card>
          <InfoBox text="Confirme os dados antes de criar. Os gestores podem ser atribuídos depois, em Contas." />
        </>
      )}
    </AdminScreen>
  );
}

/** Editar pisos e lugares: tipo (normal, mobilidade reduzida, motociclo) e ativo/desativado. */
export function EditFloorsScreen({ route, navigation }: AProps<'EditFloors'>) {
  const { state, dispatch } = useApp();
  const park = state.parks.find((p) => p.id === route.params.id)!;
  const [floors, setFloors] = useState<Floor[]>(park.floors);
  const [floorId, setFloorId] = useState(floors[0].id);
  const [editing, setEditing] = useState<Spot | null>(null);
  const floor = floors.find((f) => f.id === floorId)!;
  const patchSpot = (id: string, patch: Partial<Spot>) => {
    setFloors((fs) => fs.map((f) => ({ ...f, spots: f.spots.map((s) => (s.id === id ? { ...s, ...patch } : s)) })));
    setEditing((e) => (e && e.id === id ? { ...e, ...patch } : e));
  };
  const setCount = (n: number) => {
    setFloors((fs) => fs.map((f) => {
      if (f.id !== floorId) return f;
      if (n <= f.spots.length) return { ...f, spots: f.spots.slice(0, n) };
      const extra = Array.from({ length: n - f.spots.length }, (_, i) => {
        const k = f.spots.length + i + 1;
        return { id: `${f.id}${String(k).padStart(2, '0')}`, code: `${f.zone}${String(k).padStart(2, '0')}`, floorId: f.id, kind: 'normal' as SpotKind, active: true };
      });
      return { ...f, spots: [...f.spots, ...extra] };
    }));
  };
  const items: GridItem[] = floor.spots.map((s) => ({ spot: s, state: s.active ? 'livre' : 'desativado', sub: s.kind === 'mobilidade' ? 'Mob. red.' : s.kind === 'motociclo' ? 'Moto' : undefined }));
  const c = {
    mob: floor.spots.filter((s) => s.kind === 'mobilidade').length,
    moto: floor.spots.filter((s) => s.kind === 'motociclo').length,
    off: floor.spots.filter((s) => !s.active).length,
  };
  const occupied = new Set(state.bookings.filter((b) => b.status === 'em_curso' || b.status === 'confirmada').map((b) => b.spotId));
  const removedBusy = park.floors.flatMap((f) => f.spots).filter((s) => !floors.flatMap((f) => f.spots).some((x) => x.id === s.id) && occupied.has(s.id));

  return (
    <AdminScreen back title="Editar pisos e lugares" subtitle={park.name}
      footer={<Button title="Guardar alterações" disabled={removedBusy.length > 0} onPress={() => { dispatch({ type: 'UPDATE_FLOORS', parkId: park.id, floors }); navigation.goBack(); }} />}>
      <ChipGroup value={floorId} onChange={setFloorId} options={floors.map((f) => ({ value: f.id, label: `${f.name} (Zona ${f.zone})` }))} />
      <Card>
        <InfoRow label="Nome do piso" value={floor.name} />
        <InfoRow label="Zona" value={floor.zone} />
        <Counter label="N.º de lugares" value={floor.spots.length} onChange={setCount} min={1} max={60} />
      </Card>
      {removedBusy.length > 0 && <InfoBox tone="danger" text={`Não pode remover lugares com reservas ou viaturas: ${removedBusy.map((s) => s.code).join(', ')}.`} />}
      <Card>
        <Text style={{ fontWeight: '800', marginBottom: 8 }}>Lugares · Zona {floor.zone} · Toque para editar</Text>
        <SpotGrid items={items} columns={5} onPress={(i) => setEditing(i.spot)} />
      </Card>
      <SpotLegend states={['livre', 'desativado']} />
      <Text style={{ color: colors.muted }}>{floor.spots.length} lugares · {c.mob} mobilidade reduzida · {c.moto} motociclos · {c.off} desativados</Text>

      <Sheet visible={!!editing} onClose={() => setEditing(null)} title={`Editar lugar ${editing?.code ?? ''}`}>
        {editing && (
          <>
            <ChipGroup value={editing.kind} onChange={(k) => patchSpot(editing.id, { kind: k })} scroll={false} options={[
              { value: 'normal', label: 'Normal' }, { value: 'mobilidade', label: 'Mobilidade reduzida', icon: 'accessibility' }, { value: 'motociclo', label: 'Motociclo', icon: 'bicycle' },
            ]} />
            <OptionCard label="Lugar ativo" sub={editing.active ? 'Disponível para reservas' : 'Desativado'} active={editing.active} onPress={() => patchSpot(editing.id, { active: !editing.active })} icon="power-outline" />
            {occupied.has(editing.id) && !editing.active && <InfoBox tone="warning" text="Este lugar tem reservas ou uma viatura. As reservas existentes mantêm-se." />}
          </>
        )}
      </Sheet>
    </AdminScreen>
  );
}

/** RFA4: preços por hora e avenças mensais. */
export function PricesScreen() {
  const { state, dispatch } = useApp();
  const [draft, setDraft] = useState<Record<string, Record<keyof Prices, string>>>(() =>
    Object.fromEntries(state.parks.map((p) => [p.id, Object.fromEntries(Object.entries(p.prices).map(([k, v]) => [k, (v / 100).toFixed(2).replace('.', ',')])) as Record<keyof Prices, string>])));
  const [saved, setSaved] = useState(false);
  const field = (pid: string, k: keyof Prices, label: string) => (
    <TextField style={{ flex: 1 }} label={label} value={draft[pid]?.[k]} keyboardType="decimal-pad"
      onChangeText={(t) => { setSaved(false); setDraft((d) => ({ ...d, [pid]: { ...d[pid], [k]: t } })); }} />
  );
  const parse = (s: string) => Math.round(Number(s.replace(',', '.')) * 100);
  const invalid = Object.values(draft).some((p) => Object.values(p).some((v) => !(parse(v) > 0)));
  const save = () => {
    const prices = Object.fromEntries(Object.entries(draft).map(([pid, p]) => [pid, { carHour: parse(p.carHour), motoHour: parse(p.motoHour), pass24: parse(p.pass24), passDay: parse(p.passDay) }]));
    dispatch({ type: 'UPDATE_PRICES', prices });
    setSaved(true);
  };
  return (
    <AdminScreen title="Preços" subtitle="Valores com IVA, em euros." footer={<Button title={saved ? 'Preços guardados ✓' : 'Guardar alterações'} disabled={invalid} onPress={save} />}>
      {state.parks.map((p) => (
        <Card key={p.id}>
          <Text style={{ fontWeight: '800', marginBottom: 8 }}>{p.name}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>{field(p.id, 'carHour', 'Automóvel · €/hora')}{field(p.id, 'motoHour', 'Motociclo · €/hora')}</View>
          <View style={{ flexDirection: 'row', gap: 10 }}>{field(p.id, 'pass24', 'Avença 24 h · €/mês')}{field(p.id, 'passDay', 'Avença diurna · €/mês')}</View>
        </Card>
      ))}
      <InfoBox text="O utente paga na app no momento da reserva. Pode alterar ou cancelar até 1 hora antes da entrada." />
      <InfoBox tone="warning" text="Os novos preços aplicam-se apenas a reservas futuras." />
      {invalid && <InfoBox tone="danger" text="Todos os preços têm de ser superiores a zero." />}
    </AdminScreen>
  );
}

