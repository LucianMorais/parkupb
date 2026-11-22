import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import { initials } from '../utils/format';

export type Tone = 'success' | 'danger' | 'warning' | 'neutral' | 'primary';

const toneMap: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: colors.successSoft, fg: colors.success },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  neutral: { bg: colors.disabledSoft, fg: colors.muted },
  primary: { bg: colors.primarySoft, fg: colors.primary },
};

export function Badge({ label, tone = 'primary' }: { label: string; tone?: Tone }) {
  const t = toneMap[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

export function Avatar({ name, uri, size = 44 }: { name: string; uri?: string; size?: number }) {
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ color: colors.primary, fontWeight: '800', fontSize: size * 0.36 }}>{initials(name)}</Text>
    </View>
  );
}

/** Mapeia estados do domínio para etiquetas coerentes em todos os perfis. */
export const statusBadge = {
  booking: (status: string, refunded?: number): { label: string; tone: Tone } => {
    switch (status) {
      case 'confirmada': return { label: 'Confirmada', tone: 'success' };
      case 'em_curso': return { label: 'Em curso', tone: 'primary' };
      case 'concluida': return { label: 'Concluída', tone: 'neutral' };
      case 'cancelada': return { label: refunded ? 'Cancelada · Reembolsado' : 'Cancelada', tone: 'danger' };
      default: return { label: status, tone: 'neutral' };
    }
  },
  account: (status: string): { label: string; tone: Tone } =>
    status === 'ativa' ? { label: 'Ativa', tone: 'success' } : status === 'por_validar' ? { label: 'Por validar', tone: 'warning' } : { label: 'Suspensa', tone: 'danger' },
};

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  text: { fontSize: 11.5, fontWeight: '800' },
  avatar: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
