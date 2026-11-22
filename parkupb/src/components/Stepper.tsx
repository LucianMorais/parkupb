import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

/** Indicador de passos (reserva em 4 passos, criação de parque em 3 passos). */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <View style={styles.row}>
      {steps.map((s, i) => (
        <View key={s} style={{ flex: 1 }}>
          <View style={[styles.bar, { backgroundColor: i <= current ? colors.primary : colors.border }]} />
          <Text style={[styles.text, i === current && { color: colors.primary, fontWeight: '800' }]} numberOfLines={1}>
            {i + 1} · {s}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  bar: { height: 3, borderRadius: 2, marginBottom: 5 },
  text: { fontSize: 11, color: colors.muted },
});
