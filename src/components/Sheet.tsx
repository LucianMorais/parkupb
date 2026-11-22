import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { Button } from './Button';

/** Bottom sheet reutilizável (detalhe de lugar, bloqueio, seletor de hora, confirmações). */
export function Sheet({ visible, onClose, title, subtitle, children, footer }: {
  visible: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.head}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Fechar">
              <Ionicons name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer && <View style={{ gap: 8, marginTop: 8 }}>{footer}</View>}
        </View>
      </View>
    </Modal>
  );
}

/** Confirmação destrutiva (cancelar reserva, eliminar conta, desativar parque...). */
export function ConfirmSheet({ visible, onClose, title, text, confirmLabel, onConfirm, cancelLabel = 'Cancelar', danger = true, children }: {
  visible: boolean; onClose: () => void; title: string; text: string; confirmLabel: string; onConfirm: () => void;
  cancelLabel?: string; danger?: boolean; children?: React.ReactNode;
}) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title={cancelLabel} variant="secondary" onPress={onClose} style={{ flex: 1 }} />
          <Button title={confirmLabel} variant={danger ? 'danger' : 'primary'} onPress={onConfirm} style={{ flex: 1 }} />
        </View>
      }
    >
      <View style={styles.warnIcon}>
        <Ionicons name={danger ? 'warning' : 'help-circle'} size={26} color={danger ? colors.danger : colors.primary} />
      </View>
      <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20, marginBottom: 12 }}>{text}</Text>
      {children}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 18, paddingBottom: 28 },
  handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 10 },
  head: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  warnIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
});
