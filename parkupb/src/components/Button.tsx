import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'link';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const palette: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, fg: '#fff', border: colors.primary },
  accent: { bg: colors.accent, fg: '#fff', border: colors.accent },
  secondary: { bg: colors.surface, fg: colors.primary, border: colors.border },
  ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
  danger: { bg: colors.danger, fg: '#fff', border: colors.danger },
  link: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
};

export function Button({ title, onPress, variant = 'primary', icon, disabled, loading, small, style, testID }: Props) {
  const p = palette[variant];
  const off = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off }}
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        variant === 'link' && styles.link,
        { backgroundColor: off && variant !== 'link' && variant !== 'ghost' ? colors.disabledSoft : p.bg, borderColor: off ? colors.border : p.border },
        pressed && !off && { opacity: 0.85 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Ionicons name={icon} size={small ? 16 : 18} color={off ? colors.disabled : p.fg} style={{ marginRight: 8 }} />}
          <Text style={[styles.text, small && { fontSize: 13 }, { color: off ? colors.disabled : p.fg }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { height: 50, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  small: { height: 38, borderRadius: radius.sm, paddingHorizontal: 12 },
  link: { height: undefined, paddingVertical: 6, paddingHorizontal: 0 },
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { fontSize: 15, fontWeight: '700' },
});
