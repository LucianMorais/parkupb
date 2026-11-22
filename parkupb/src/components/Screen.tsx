import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';

interface Props {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  back?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  top?: React.ReactNode; // conteúdo fixo acima do scroll (ex.: cabeçalho de equipa)
  footer?: React.ReactNode; // botões fixos no fundo
  scroll?: boolean;
  padded?: boolean;
}

/** Estrutura comum a todos os ecrãs: área segura, cabeçalho, conteúdo com scroll e rodapé fixo. */
export function Screen({ children, title, subtitle, back, onBack, right, top, footer, scroll = true, padded = true }: Props) {
  const nav = useNavigation();
  const body = <View style={padded ? styles.pad : undefined}>{children}</View>;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {top}
      {(title || back) && (
        <View style={styles.header}>
          {back && (
            <Pressable onPress={onBack ?? (() => nav.goBack())} hitSlop={10} style={styles.back} accessibilityLabel="Voltar">
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </Pressable>
          )}
          <View style={{ flex: 1 }}>
            {title && <Text style={styles.title} numberOfLines={1}>{title}</Text>}
            {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
          </View>
          {right}
        </View>
      )}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView contentContainerStyle={{ paddingBottom: 28 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {body}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>{body}</View>
        )}
        {footer && <View style={styles.footer}>{footer}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: 18, paddingTop: 6 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 10, gap: 10 },
  back: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  footer: { padding: 16, paddingBottom: 20, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 },
});
