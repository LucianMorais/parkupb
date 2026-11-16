import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { useApp } from '../store/AppContext';
import { euro } from '../utils/format';
import { allSpots } from '../utils/rules';
import { Avatar } from './Badge';

/** Seletor de parque (RNF0: a solução serve vários parques). */
export function ParkSelector({ onPress, staff }: { onPress?: () => void; staff?: boolean }) {
  const { park } = useApp();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.selector} accessibilityRole="button" accessibilityLabel="Alterar parque">
      <View style={styles.pIcon}><Text style={styles.pText}>P</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.parkName} numberOfLines={1}>{park.name}</Text>
        <Text style={styles.parkSub}>
          {staff
            ? `Bragança · ${allSpots(park).length} lugares · ${euro(park.prices.carHour)}/h`
            : `Bragança · ${onPress ? 'Alterar parque' : park.open24 ? 'Aberto 24 horas' : `${park.openTime}–${park.closeTime}`}`}
        </Text>
      </View>
      {onPress && <Ionicons name="chevron-down" size={18} color={colors.muted} />}
    </Pressable>
  );
}

/** Logótipo ParkUPB. */
export function Logo({ light, size = 18 }: { light?: boolean; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={[styles.logo, { width: size + 8, height: size + 8 }, light && { backgroundColor: '#fff' }]}>
        <Text style={{ color: light ? colors.primary : '#fff', fontWeight: '900', fontSize: size * 0.8 }}>P</Text>
      </View>
      <Text style={{ fontWeight: '900', fontSize: size, color: light ? '#fff' : colors.primary }}>
        ParkUPB<Text style={{ color: colors.accent }}>.</Text>
      </Text>
    </View>
  );
}

/** Cabeçalho das áreas de equipa (gestor e administrador). */
export function StaffHeader({ name, roleLabel, onMenu, onAvatar }: { name: string; roleLabel: string; onMenu?: () => void; onAvatar?: () => void }) {
  return (
    <View style={styles.staff}>
      {onMenu && (
        <Pressable onPress={onMenu} hitSlop={10} accessibilityLabel="Abrir menu" style={{ marginRight: 8 }}>
          <Ionicons name="menu" size={24} color={colors.text} />
        </Pressable>
      )}
      <Logo />
      <View style={{ flex: 1 }} />
      <Pressable onPress={onAvatar} disabled={!onAvatar} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.text }}>{name}</Text>
          <Text style={{ fontSize: 11, color: colors.muted }}>{roleLabel}</Text>
        </View>
        <Avatar name={name} size={32} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  selector: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 10, marginBottom: 14 },
  pIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  pText: { color: colors.primary, fontWeight: '900', fontSize: 16 },
  parkName: { fontSize: 14, fontWeight: '700', color: colors.text },
  parkSub: { fontSize: 12, color: colors.muted, marginTop: 1 },
  logo: { borderRadius: 7, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  staff: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
});
