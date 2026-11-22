import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ListItem, ParkSelector, Screen, Sheet, StaffHeader } from '../../components';
import { colors } from '../../theme';
import { useApp, useMe } from '../../store/AppContext';

/** Moldura comum dos ecrãs do gestor: cabeçalho de equipa + parque atribuído. */
export function GestorScreen({ children, title, subtitle, back, footer, hidePark }: {
  children: React.ReactNode; title?: string; subtitle?: string; back?: boolean; footer?: React.ReactNode; hidePark?: boolean;
}) {
  const { state, park, dispatch } = useApp();
  const me = useMe();
  const [open, setOpen] = useState(false);
  const myParks = state.parks.filter((p) => me.parkIds.includes(p.id));
  return (
    <Screen top={<StaffHeader name={me.name} roleLabel="Gestor" />} footer={footer} back={back} title={back ? title : undefined}>
      {!hidePark && <ParkSelector staff onPress={myParks.length > 1 ? () => setOpen(true) : undefined} />}
      {!back && title && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{title}</Text>
          {subtitle && <Text style={{ color: colors.muted, marginTop: 2 }}>{subtitle}</Text>}
        </View>
      )}
      {back && subtitle && <Text style={{ color: colors.muted, marginBottom: 12 }}>{subtitle}</Text>}
      {children}
      <Sheet visible={open} onClose={() => setOpen(false)} title="Parques atribuídos">
        {myParks.map((p) => (
          <ListItem key={p.id} title={p.name} subtitle={p.address}
            right={p.id === park.id ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : undefined}
            onPress={() => { dispatch({ type: 'SELECT_PARK', parkId: p.id }); setOpen(false); }} chevron={false} />
        ))}
      </Sheet>
    </Screen>
  );
}

export function QuickAction({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flex: 1, alignItems: 'center', gap: 6, padding: 12, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, pressed && { opacity: 0.8 }]}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}
