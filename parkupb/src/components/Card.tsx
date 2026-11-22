import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow } from '../theme';

export function Card({ children, style, onPress, tone }: {
  children: React.ReactNode; style?: ViewStyle | ViewStyle[]; onPress?: () => void; tone?: 'primary' | 'warning' | 'danger' | 'success' | 'info';
}) {
  const toneStyle = tone ? tones[tone] : null;
  const content = <View style={[styles.card, toneStyle, style as ViewStyle]}>{children}</View>;
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.9 }} accessibilityRole="button">
      {content}
    </Pressable>
  ) : content;
}

/** Linha "rótulo · valor" usada em resumos de reserva, fichas e detalhes. */
export function InfoRow({ label, value, strong, valueColor }: { label: string; value: string; strong?: boolean; valueColor?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, strong && { fontWeight: '800', fontSize: 16 }, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

export function Divider({ space = 12 }: { space?: number }) {
  return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: space }} />;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Caixa informativa (regras de negócio, avisos, erros). */
export function InfoBox({ text, tone = 'info', icon, title }: { text: string; tone?: 'info' | 'warning' | 'danger' | 'success'; icon?: keyof typeof Ionicons.glyphMap; title?: string }) {
  const map = {
    info: { bg: colors.primarySoft, fg: colors.primary, i: 'information-circle-outline' },
    warning: { bg: colors.warningSoft, fg: colors.warning, i: 'time-outline' },
    danger: { bg: colors.dangerSoft, fg: colors.danger, i: 'warning-outline' },
    success: { bg: colors.successSoft, fg: colors.success, i: 'checkmark-circle-outline' },
  } as const;
  const t = map[tone];
  return (
    <View style={[styles.box, { backgroundColor: t.bg }]}>
      <Ionicons name={icon ?? (t.i as keyof typeof Ionicons.glyphMap)} size={18} color={t.fg} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        {title && <Text style={{ fontWeight: '700', color: t.fg, marginBottom: 2 }}>{title}</Text>}
        <Text style={{ color: colors.text, fontSize: 13, lineHeight: 18 }}>{text}</Text>
      </View>
    </View>
  );
}

export function ListItem({ title, subtitle, left, right, onPress, chevron = !!onPress }: {
  title: string; subtitle?: string; left?: React.ReactNode; right?: React.ReactNode; onPress?: () => void; chevron?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.bg }]}>
      {left}
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.itemSub} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {right}
      {chevron && <Ionicons name="chevron-forward" size={18} color={colors.faint} />}
    </Pressable>
  );
}

const tones = StyleSheet.create({
  primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  warning: { backgroundColor: colors.warningSoft, borderColor: '#F6D3AE' },
  danger: { backgroundColor: colors.dangerSoft, borderColor: '#F2C4C4' },
  success: { backgroundColor: colors.successSoft, borderColor: '#BFE5CD' },
  info: { backgroundColor: colors.primarySoft, borderColor: '#CFE2E6' },
});

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12, ...shadow },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, gap: 12 },
  rowLabel: { color: colors.muted, fontSize: 13 },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  sectionAction: { fontSize: 13, fontWeight: '700', color: colors.primary },
  box: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.md, marginBottom: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  itemSub: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
});
