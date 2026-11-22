import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

export function StatCard({ value, label, icon, tone = 'primary' }: {
  value: string | number; label: string; icon?: keyof typeof Ionicons.glyphMap; tone?: 'primary' | 'success' | 'danger' | 'warning' | 'neutral';
}) {
  const fg = { primary: colors.primary, success: colors.success, danger: colors.danger, warning: colors.warning, neutral: colors.muted }[tone];
  const bg = { primary: colors.primarySoft, success: colors.successSoft, danger: colors.dangerSoft, warning: colors.warningSoft, neutral: colors.disabledSoft }[tone];
  return (
    <View style={styles.stat}>
      {icon && <View style={[styles.statIcon, { backgroundColor: bg }]}><Ionicons name={icon} size={18} color={fg} /></View>}
      <View style={styles.statBody}>
        <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</Text>
        <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
      </View>
    </View>
  );
}

export function ProgressBar({ value, color = colors.primary, height = 8 }: { value: number; color?: string; height?: number }) {
  return (
    <View style={{ height, borderRadius: height, backgroundColor: colors.disabledSoft, overflow: 'hidden' }}>
      <View style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, height, backgroundColor: color, borderRadius: height }} />
    </View>
  );
}

/** Gráfico de barras simples (sem bibliotecas externas). */
export function BarChart({ data, max, highlight, height = 130 }: { data: { label: string; value: number | null }[]; max: number; highlight?: number; height?: number }) {
  return (
    <View>
      <View style={[styles.chart, { height }]}>
        {data.map((d, i) => (
          <View key={d.label} style={styles.barCol}>
            {d.value !== null && <Text style={styles.barValue}>{d.value}</Text>}
            <View
              style={{
                width: '62%', borderTopLeftRadius: 5, borderTopRightRadius: 5,
                height: d.value === null ? 2 : Math.max(4, (d.value / max) * (height - 22)),
                backgroundColor: d.value === null ? colors.border : i === highlight ? colors.accent : colors.primary,
              }}
            />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row' }}>
        {data.map((d) => <Text key={d.label} style={styles.barLabel}>{d.label}</Text>)}
      </View>
    </View>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string; action?: React.ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={26} color={colors.primary} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  stat: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12 },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statBody: { flex: 1, minWidth: 0 },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 12, color: colors.muted },
  chart: { flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: colors.border },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barValue: { fontSize: 10, color: colors.muted, marginBottom: 2 },
  barLabel: { flex: 1, textAlign: 'center', fontSize: 10.5, color: colors.muted, marginTop: 4 },
  empty: { alignItems: 'center', padding: 24, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  emptyIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text, textAlign: 'center' },
  emptyText: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 4, marginBottom: 8 },
});
