import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import { DAY, dayChip, startOfDay } from '../utils/format';
import { Sheet } from './Sheet';
import { Button } from './Button';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

function Column({ data, value, onChange }: { data: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <ScrollView style={{ maxHeight: 220 }} contentContainerStyle={{ paddingVertical: 4 }} showsVerticalScrollIndicator={false}>
      {data.map((d) => (
        <Pressable key={d} onPress={() => onChange(d)} style={[styles.cell, d === value && styles.cellOn]}>
          <Text style={[styles.cellText, d === value && { color: colors.primary, fontWeight: '800' }]}>{d}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

/** Seletor de hora em rodas (intervalos de 15 minutos). */
export function TimePickerSheet({ visible, title, value, onClose, onConfirm }: {
  visible: boolean; title: string; value: string | null; onClose: () => void; onConfirm: (hhmm: string) => void;
}) {
  const [h, setH] = useState('09');
  const [m, setM] = useState('00');
  useEffect(() => {
    if (visible && value) {
      setH(value.slice(0, 2));
      setM(value.slice(3, 5));
    }
  }, [visible, value]);
  return (
    <Sheet visible={visible} onClose={onClose} title={title} subtitle="Intervalos de 15 minutos." footer={<Button title="Confirmar hora" onPress={() => onConfirm(`${h}:${m}`)} />}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.colTitle}>Hora</Text>
          <Column data={HOURS} value={h} onChange={setH} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.colTitle}>Minutos</Text>
          <Column data={MINUTES} value={m} onChange={setM} />
        </View>
        <View style={styles.preview}>
          <Text style={styles.colTitle}>Selecionado</Text>
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.primary }}>{h}:{m}</Text>
        </View>
      </View>
    </Sheet>
  );
}

/** Seletor de data: próximos dias, em chips. */
export function DatePickerSheet({ visible, value, from, days = 21, onClose, onConfirm }: {
  visible: boolean; value: number | null; from: number; days?: number; onClose: () => void; onConfirm: (dayTs: number) => void;
}) {
  const start = startOfDay(from);
  const list = Array.from({ length: days }, (_, i) => start + i * DAY);
  return (
    <Sheet visible={visible} onClose={onClose} title="Selecione a data">
      <View style={styles.dates}>
        {list.map((d) => {
          const c = dayChip(d);
          const on = value !== null && startOfDay(value) === d;
          return (
            <Pressable key={d} onPress={() => onConfirm(d)} style={[styles.date, on && styles.dateOn]}>
              <Text style={[styles.dWeek, on && { color: '#D7EAEE' }]}>{c.week}</Text>
              <Text style={[styles.dDay, on && { color: '#fff' }]}>{c.day}</Text>
              <Text style={[styles.dWeek, on && { color: '#D7EAEE' }]}>{c.month}</Text>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  colTitle: { fontSize: 12, color: colors.muted, fontWeight: '600', marginBottom: 6, textAlign: 'center' },
  cell: { height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  cellOn: { backgroundColor: colors.primarySoft },
  cellText: { fontSize: 18, color: colors.muted },
  preview: { flex: 1.2, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, borderRadius: radius.md },
  dates: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  date: { width: '13%', minWidth: 44, paddingVertical: 8, alignItems: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  dateOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dWeek: { fontSize: 10, color: colors.muted },
  dDay: { fontSize: 16, fontWeight: '800', color: colors.text },
});
