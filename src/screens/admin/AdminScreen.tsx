import React from 'react';
import { Text, View } from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { Screen, StaffHeader } from '../../components';
import { colors } from '../../theme';
import { useMe } from '../../store/AppContext';

/** Moldura dos ecrãs do administrador (menu lateral + identificação). */
export function AdminScreen({ children, title, subtitle, back, footer }: {
  children: React.ReactNode; title: string; subtitle?: string; back?: boolean; footer?: React.ReactNode;
}) {
  const nav = useNavigation();
  const me = useMe();
  return (
    <Screen
      top={<StaffHeader name={me.name} roleLabel="Administradora" onMenu={back ? undefined : () => nav.dispatch(DrawerActions.toggleDrawer())} />}
      back={back}
      title={back ? title : undefined}
      footer={footer}
    >
      {!back && (
        <View style={{ marginBottom: 12, marginTop: 4 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{title}</Text>
          {subtitle && <Text style={{ color: colors.muted, marginTop: 2 }}>{subtitle}</Text>}
        </View>
      )}
      {back && subtitle && <Text style={{ color: colors.muted, marginBottom: 12 }}>{subtitle}</Text>}
      {children}
    </Screen>
  );
}
