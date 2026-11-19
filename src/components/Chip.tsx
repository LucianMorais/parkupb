import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

export function Chip({ label, sub, active, onPress, icon }: {
  label: string; sub?: string; active?: boolean; onPress?: () => void; icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[styles.chip, active && styles.active]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {icon && <Ionicons name={icon} size={15} color={active ? '#fff' : colors.primary} style={{ marginRight: 6 }} />}
        <Text style={[styles.label, active && { color: '#fff' }]}>{label}</Text>
      </View>
      {sub ? <Text style={[styles.sub, active && { color: '#D7EAEE' }]}>{sub}</Text> : null}
    </Pressable>
  );
}

/** Grupo de chips de seleção única (filtros por piso, estado, tipo, período...). */
export function ChipGroup<T extends string>({ options, value, onChange, scroll = true }: {
  options: { value: T; label: string; sub?: string; icon?: keyof typeof Ionicons.glyphMap }[];
  value: T;
  onChange: (v: T) => void;
  scroll?: boolean;
}) {
  const chips = options.map((o) => (
    <Chip key={o.value} label={o.label} sub={o.sub} icon={o.icon} active={o.value === value} onPress={() => onChange(o.value)} />
  ));
  return scroll ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.group}>{chips}</ScrollView>
  ) : (
    <View style={[styles.group, { flexWrap: 'wrap' }]}>{chips}</View>
  );
}

/** Seletor grande com ícone (tipo de veículo, método de pagamento, plano). */
export function OptionCard({ label, sub, icon, active, onPress, disabled }: {
  label: string; sub?: string; icon?: keyof typeof Ionicons.glyphMap; active: boolean; onPress: () => void; disabled?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.option, active && styles.optionActive, disabled && { opacity: 0.5 }]} accessibilityRole="radio" accessibilityState={{ checked: active, disabled }}>
      {icon && <Ionicons name={icon} size={20} color={active ? colors.primary : colors.muted} />}
      <View style={{ flex: 1 }}>
        <Text style={[styles.optionLabel, active && { color: colors.primary }]}>{label}</Text>
        {sub ? <Text style={styles.optionSub}>{sub}</Text> : null}
      </View>
      <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={20} color={active ? colors.primary : colors.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', gap: 8, paddingVertical: 2, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' },
  active: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { fontSize: 13, fontWeight: '700', color: colors.text },
  sub: { fontSize: 11, color: colors.muted, marginTop: 1 },
  option: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, backgroundColor: colors.surface, marginBottom: 8 },
  optionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  optionSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
