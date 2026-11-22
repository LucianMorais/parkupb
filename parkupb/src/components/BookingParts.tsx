import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { colors } from '../theme';
import { Park, VehicleType } from '../types/models';
import { date, duration, euro, time, at } from '../utils/format';
import { fractions, fractionValue, hourly, price } from '../utils/rules';
import { TextField } from './TextField';
import { DatePickerSheet, TimePickerSheet } from './Pickers';
import { Card } from './Card';

export interface Period {
  day: number | null;
  start: string | null; // HH:MM
  end: string | null;
}

export function periodToTs(p: Period): { start: number; end: number } | null {
  if (p.day === null || !p.start || !p.end) return null;
  return { start: at(p.day, p.start), end: at(p.day, p.end) };
}

/** Campos Data / Hora de entrada / Hora de saída com seletores (reserva e alteração). */
export function PeriodFields({ value, onChange, now, error, lockStart }: {
  value: Period; onChange: (p: Period) => void; now: number; error?: string | null; lockStart?: boolean;
}) {
  const [open, setOpen] = useState<'day' | 'start' | 'end' | null>(null);
  return (
    <View>
      <TextField label="Data" placeholder="Selecione a data" icon="calendar-outline" displayValue={value.day !== null ? date(value.day) : ''} onPressField={lockStart ? undefined : () => setOpen('day')} editable={false} value={value.day !== null ? date(value.day) : ''} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TextField style={{ flex: 1 }} label="Hora de entrada" placeholder="Selecione a hora" icon="time-outline" displayValue={value.start ?? ''} onPressField={lockStart ? undefined : () => setOpen('start')} editable={false} value={value.start ?? ''} hint={lockStart ? 'Sem alteração' : undefined} />
        <TextField style={{ flex: 1 }} label="Hora de saída" placeholder="Selecione a hora" icon="time-outline" displayValue={value.end ?? ''} onPressField={() => setOpen('end')} editable={false} value={value.end ?? ''} />
      </View>
      {error ? <Text style={{ color: colors.danger, fontWeight: '600', marginTop: -6, marginBottom: 12 }}>⚠ {error}</Text> : null}
      <DatePickerSheet visible={open === 'day'} value={value.day} from={now} onClose={() => setOpen(null)} onConfirm={(d) => { onChange({ ...value, day: d }); setOpen(null); }} />
      <TimePickerSheet visible={open === 'start'} title="Hora de entrada" value={value.start} onClose={() => setOpen(null)} onConfirm={(t) => { onChange({ ...value, start: t }); setOpen(null); }} />
      <TimePickerSheet visible={open === 'end'} title="Hora de saída" value={value.end ?? value.start} onClose={() => setOpen(null)} onConfirm={(t) => { onChange({ ...value, end: t }); setOpen(null); }} />
    </View>
  );
}

/** Resumo do valor: adapta-se à diferença de horários (frações de 15 minutos). */
export function PriceSummary({ park, type, start, end, invalid }: { park: Park; type: VehicleType; start?: number; end?: number; invalid?: boolean }) {
  if (invalid || start === undefined || end === undefined || end <= start) {
    return (
      <Card style={{ backgroundColor: colors.bg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontWeight: '700', color: colors.muted }}>Sem cálculo disponível</Text>
          <Text style={{ color: colors.muted }}>—</Text>
        </View>
        <Text style={{ color: colors.muted, fontSize: 12.5, marginTop: 4 }}>
          {invalid ? 'Corrija o horário para calcular o valor estimado.' : 'Defina data, hora de entrada e hora de saída para calcular o valor estimado.'}
        </Text>
      </Card>
    );
  }
  const n = fractions(start, end);
  return (
    <Card tone="info">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontWeight: '700', color: colors.text }}>{duration(end - start)} · {euro(hourly(park, type))}/hora</Text>
        <Text style={{ fontSize: 22, fontWeight: '900', color: colors.primary }}>{euro(price(park, type, start, end))}</Text>
      </View>
      <Text style={{ color: colors.muted, fontSize: 12.5, marginTop: 4 }}>
        {n} {n === 1 ? 'fração' : 'frações'} de 15 min × {euro(fractionValue(park, type))} = {euro(price(park, type, start, end))}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 12.5 }}>IVA incluído · Pagamento na app · {time(start)}–{time(end)}</Text>
    </Card>
  );
}
