import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

interface Props extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
  secure?: boolean;
  /** Torna o campo num seletor (abre um bottom sheet). */
  onPressField?: () => void;
  displayValue?: string;
}

export function TextField({ label, hint, error, icon, secure, onPressField, displayValue, style, ...rest }: Props) {
  const [hidden, setHidden] = useState(!!secure);
  const [focus, setFocus] = useState(false);
  const borderColor = error ? colors.danger : focus ? colors.primary : colors.border;

  return (
    <View style={[{ marginBottom: 14 }, style as object]}>
      {label && <Text style={styles.label}>{label}</Text>}
      {onPressField ? (
        <Pressable onPress={onPressField} style={[styles.box, { borderColor }]} accessibilityRole="button">
          <Text style={[styles.input, { paddingVertical: 0, color: displayValue ? colors.text : colors.faint }]}>
            {displayValue || rest.placeholder}
          </Text>
          {icon && <Ionicons name={icon} size={18} color={colors.muted} />}
        </Pressable>
      ) : (
        <View style={[styles.box, { borderColor }]}>
          <TextInput
            placeholderTextColor={colors.faint}
            secureTextEntry={hidden}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            style={styles.input}
            {...rest}
          />
          {secure ? (
            <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityLabel="Mostrar palavra-passe">
              <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.muted} />
            </Pressable>
          ) : (
            icon && <Ionicons name={icon} size={18} color={colors.muted} />
          )}
        </View>
      )}
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  box: {
    minHeight: 48, borderWidth: 1, borderRadius: radius.md, backgroundColor: colors.surface,
    paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center',
  },
  input: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 12 },
  hint: { fontSize: 12, color: colors.muted, marginTop: 5 },
  errorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 4 },
  error: { fontSize: 12, color: colors.danger, fontWeight: '600' },
});
