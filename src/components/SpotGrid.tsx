import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { Spot, SpotState } from '../types/models';

export const spotColors: Record<SpotState | 'escolhido', { bg: string; border: string; fg: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  livre: { bg: colors.successSoft, border: '#A9DDBD', fg: colors.success, label: 'Livre', icon: 'checkmark' },
  ocupado: { bg: colors.dangerSoft, border: '#F0B9B9', fg: colors.danger, label: 'Ocupado', icon: 'close' },
  reservado: { bg: colors.warningSoft, border: '#F5C894', fg: colors.warning, label: 'Reservado', icon: 'time-outline' },
  bloqueado: { bg: colors.disabledSoft, border: '#C9D1D4', fg: colors.muted, label: 'Bloqueado', icon: 'lock-closed' },
  desativado: { bg: colors.disabledSoft, border: colors.border, fg: colors.disabled, label: 'Desativado', icon: 'remove' },
  escolhido: { bg: colors.primary, border: colors.primary, fg: '#fff', label: 'Escolhido', icon: 'car' },
};

const kindIcon: Partial<Record<Spot['kind'], keyof typeof Ionicons.glyphMap>> = {
  mobilidade: 'accessibility',
  motociclo: 'bicycle',
};

export interface GridItem {
  spot: Spot;
  state: SpotState;
  sub?: string;
}

/** Tile de lugar: componente base da vista virtual do parque (utente, gestor e administrador). */
export function SpotTile({ item, selected, onPress, compact }: { item: GridItem; selected?: boolean; onPress?: () => void; compact?: boolean }) {
  const c = spotColors[selected ? 'escolhido' : item.state];
  const k = kindIcon[item.spot.kind];
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`Lugar ${item.spot.code}, ${c.label}`}
      style={({ pressed }) => [styles.tile, { backgroundColor: c.bg, borderColor: c.border }, compact && { minHeight: 52 }, pressed && { transform: [{ scale: 0.96 }] }]}
    >
      <View style={styles.tileTop}>
        <Text style={[styles.code, { color: selected ? '#fff' : colors.text }]}>{item.spot.code}</Text>
        {k ? <Ionicons name={k} size={12} color={c.fg} /> : <Ionicons name={c.icon} size={12} color={c.fg} />}
      </View>
      <Text style={[styles.state, { color: c.fg }]} numberOfLines={1}>{c.label}</Text>
      {item.sub ? <Text style={[styles.sub, selected && { color: '#D7EAEE' }]} numberOfLines={1}>{item.sub}</Text> : null}
    </Pressable>
  );
}

export function SpotGrid({ items, columns = 5, selectedId, onPress, aisleEvery = 3, entrance, compact }: {
  items: GridItem[]; columns?: number; selectedId?: string; onPress?: (i: GridItem) => void; aisleEvery?: number; entrance?: string; compact?: boolean;
}) {
  const rows: GridItem[][] = [];
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));
  return (
    <View>
      {rows.map((row, r) => (
        <React.Fragment key={r}>
          {r > 0 && r % aisleEvery === 0 && (
            <View style={styles.aisle}>
              <View style={styles.aisleLine} />
              <Text style={styles.aisleText}>CIRCULAÇÃO</Text>
              <View style={styles.aisleLine} />
            </View>
          )}
          <View style={styles.row}>
            {row.map((it) => (
              <View key={it.spot.id} style={{ flex: 1 }}>
                <SpotTile item={it} compact={compact} selected={it.spot.id === selectedId} onPress={onPress ? () => onPress(it) : undefined} />
              </View>
            ))}
            {Array.from({ length: columns - row.length }).map((_, k) => <View key={`e${k}`} style={{ flex: 1 }} />)}
          </View>
        </React.Fragment>
      ))}
      {entrance && (
        <View style={styles.entrance}>
          <Ionicons name="enter-outline" size={14} color={colors.primary} />
          <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '700' }}>{entrance}</Text>
        </View>
      )}
    </View>
  );
}

export function SpotLegend({ states }: { states: (SpotState | 'escolhido')[] }) {
  return (
    <View style={styles.legend}>
      {states.map((s) => (
        <View key={s} style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: spotColors[s].bg, borderColor: spotColors[s].fg }]} />
          <Text style={styles.legendText}>{spotColors[s].label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  tile: { borderWidth: 1, borderRadius: radius.sm, paddingVertical: 6, paddingHorizontal: 6, minHeight: 58 },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { fontSize: 13, fontWeight: '800' },
  state: { fontSize: 10.5, fontWeight: '700', marginTop: 2 },
  sub: { fontSize: 9.5, color: colors.muted, marginTop: 1 },
  aisle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 6 },
  aisleLine: { flex: 1, height: 1, borderStyle: 'dashed', borderWidth: 0.5, borderColor: colors.faint },
  aisleText: { fontSize: 10, letterSpacing: 2, color: colors.faint, fontWeight: '700' },
  entrance: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginVertical: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 12, height: 12, borderRadius: 3, borderWidth: 1 },
  legendText: { fontSize: 12, color: colors.muted },
});
