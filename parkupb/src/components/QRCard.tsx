import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors, radius } from '../theme';

/** QR Code de entrada e saída (reserva, entrada imediata ou avença). Toque para ecrã cheio. */
export function QRCard({ value, title = 'QR de entrada e saída', text, code, plate }: {
  value: string; title?: string; text: string; code: string; plate?: string;
}) {
  const [full, setFull] = useState(false);
  return (
    <>
      <Pressable onPress={() => setFull(true)} style={styles.card} accessibilityRole="button" accessibilityLabel="Abrir QR em ecrã cheio">
        <View style={styles.qr}><QRCode value={value} size={92} color={colors.text} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.text}>{text}</Text>
          <Text style={styles.demo}>Demonstração · Dados fictícios. Não é válido.</Text>
          <Text style={styles.code}>{code} · Toque para ampliar</Text>
        </View>
      </Pressable>
      <Modal visible={full} animationType="fade" onRequestClose={() => setFull(false)}>
        <Pressable style={styles.full} onPress={() => setFull(false)}>
          <Text style={styles.fullTitle}>Apresente na cancela</Text>
          <View style={styles.fullQr}><QRCode value={value} size={260} /></View>
          {plate && <Text style={styles.plate}>{plate}</Text>}
          <Text style={{ color: colors.muted, marginTop: 6 }}>{code}</Text>
          <Text style={{ color: colors.primary, marginTop: 24, fontWeight: '700' }}>Toque para fechar</Text>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
  qr: { padding: 6, backgroundColor: '#fff', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 15, fontWeight: '800', color: colors.text },
  text: { fontSize: 12.5, color: colors.muted, marginTop: 3 },
  demo: { fontSize: 11, color: colors.warning, marginTop: 6, fontWeight: '600' },
  code: { fontSize: 11.5, color: colors.faint, marginTop: 4 },
  full: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 24 },
  fullTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 24 },
  fullQr: { padding: 16, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  plate: { marginTop: 20, fontSize: 26, fontWeight: '900', letterSpacing: 2, color: colors.text, borderWidth: 2, borderColor: colors.text, paddingHorizontal: 14, paddingVertical: 4, borderRadius: 6 },
});
