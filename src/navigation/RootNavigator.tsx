import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DrawerContentScrollView, DrawerItem, DrawerItemList, createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useApp } from '../store/AppContext';
import { Logo } from '../components';
import {
  AdminDrawerParams, AdminStackParams, AuthStackParams, GestorStackParams, GestorTabsParams, UtenteStackParams, UtenteTabsParams,
} from './types';

import { LoginScreen, RegisterScreen, StaffLoginScreen, TeamAccessScreen, WelcomeScreen } from '../screens/auth/AuthScreens';
import { HomeScreen, NotificationsScreen, SelectParkScreen } from '../screens/utente/HomeScreens';
import { BookingScreen, ChooseSpotScreen, EditBookingScreen, NewBookingScreen, PaymentScreen, ReviewChangeScreen } from '../screens/utente/BookingScreens';
import { BuyPassScreen, ImmediateScreen, PassesScreen, StayScreen } from '../screens/utente/StayPassScreens';
import { EditProfileScreen, HistoryScreen, ProfileScreen, VehiclesScreen } from '../screens/utente/HistoryProfileScreens';
import { DashboardScreen, ParkVehiclesScreen, StatsScreen } from '../screens/gestor/DashboardScreens';
import { BlockDoneScreen, SpotsScreen } from '../screens/gestor/SpotsScreens';
import {
  EditUserScreen, ExtraIssuedScreen, GestorProfileScreen, IncidentDetailScreen, IncidentsScreen, IndividualAlertScreen, NewNoticeScreen,
  NoticesScreen, UserDetailScreen, UsersScreen,
} from '../screens/gestor/PeopleScreens';
import { CreateParkScreen, EditFloorsScreen, OverviewScreen, ParkDetailScreen, ParksScreen, PricesScreen } from '../screens/admin/ParksScreens';
import {
  AccountDetailScreen, AccountsScreen, AdminProfileScreen, CreateManagerScreen, HistoryResetScreen, HistoryScreen as AdminHistoryScreen,
  VehicleDetailScreen, VehiclesScreen as AdminVehiclesScreen,
} from '../screens/admin/AccountsScreens';

const stackOptions = { headerShown: false, animation: 'slide_from_right' as const, contentStyle: { backgroundColor: colors.bg } };

const tabIcon = (name: keyof typeof Ionicons.glyphMap) =>
  ({ color, size, focused }: { color: string; size: number; focused: boolean }) =>
    <Ionicons name={focused ? name : (`${name}-outline` as keyof typeof Ionicons.glyphMap)} size={size - 2} color={color} />;

const tabOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.faint,
  tabBarLabelStyle: { fontSize: 11, fontWeight: '600' as const },
  tabBarStyle: { borderTopColor: colors.border },
};

// ------------------------------------------------------------ Autenticação (Stack)
const Auth = createNativeStackNavigator<AuthStackParams>();
function AuthNavigator() {
  return (
    <Auth.Navigator screenOptions={stackOptions}>
      <Auth.Screen name="Welcome" component={WelcomeScreen} />
      <Auth.Screen name="Login" component={LoginScreen} />
      <Auth.Screen name="Register" component={RegisterScreen} />
      <Auth.Screen name="TeamAccess" component={TeamAccessScreen} />
      <Auth.Screen name="StaffLogin" component={StaffLoginScreen} />
    </Auth.Navigator>
  );
}

// ------------------------------------------------------------ Utente (Stack + Bottom Tabs)
const UTabs = createBottomTabNavigator<UtenteTabsParams>();
function UtenteTabs() {
  return (
    <UTabs.Navigator screenOptions={tabOptions}>
      <UTabs.Screen name="Inicio" component={HomeScreen} options={{ title: 'Início', tabBarIcon: tabIcon('home') }} />
      <UTabs.Screen name="Reservar" component={NewBookingScreen} options={{ tabBarIcon: tabIcon('calendar') }} />
      <UTabs.Screen name="Avencas" component={PassesScreen} options={{ title: 'Avenças', tabBarIcon: tabIcon('card') }} />
      <UTabs.Screen name="Historico" component={HistoryScreen} options={{ title: 'Histórico', tabBarIcon: tabIcon('time') }} />
      <UTabs.Screen name="Perfil" component={ProfileScreen} options={{ tabBarIcon: tabIcon('person') }} />
    </UTabs.Navigator>
  );
}
const UStack = createNativeStackNavigator<UtenteStackParams>();
function UtenteNavigator() {
  return (
    <UStack.Navigator screenOptions={stackOptions}>
      <UStack.Screen name="UtenteTabs" component={UtenteTabs} />
      <UStack.Screen name="SelectPark" component={SelectParkScreen} options={{ presentation: 'modal' }} />
      <UStack.Screen name="ChooseSpot" component={ChooseSpotScreen} />
      <UStack.Screen name="Payment" component={PaymentScreen} />
      <UStack.Screen name="Booking" component={BookingScreen} />
      <UStack.Screen name="EditBooking" component={EditBookingScreen} />
      <UStack.Screen name="ReviewChange" component={ReviewChangeScreen} />
      <UStack.Screen name="Immediate" component={ImmediateScreen} />
      <UStack.Screen name="Stay" component={StayScreen} />
      <UStack.Screen name="BuyPass" component={BuyPassScreen} />
      <UStack.Screen name="EditProfile" component={EditProfileScreen} />
      <UStack.Screen name="Vehicles" component={VehiclesScreen} />
      <UStack.Screen name="Notifications" component={NotificationsScreen} />
    </UStack.Navigator>
  );
}

// ------------------------------------------------------------ Gestor (Stack + Bottom Tabs)
const GTabs = createBottomTabNavigator<GestorTabsParams>();
function GestorTabs() {
  return (
    <GTabs.Navigator screenOptions={tabOptions}>
      <GTabs.Screen name="Painel" component={DashboardScreen} options={{ tabBarIcon: tabIcon('grid') }} />
      <GTabs.Screen name="Lugares" component={SpotsScreen} options={{ tabBarIcon: tabIcon('car') }} />
      <GTabs.Screen name="Utentes" component={UsersScreen} options={{ tabBarIcon: tabIcon('people') }} />
      <GTabs.Screen name="Avisos" component={NoticesScreen} options={{ tabBarIcon: tabIcon('megaphone') }} />
      <GTabs.Screen name="PerfilGestor" component={GestorProfileScreen} options={{ title: 'Perfil', tabBarIcon: tabIcon('person') }} />
    </GTabs.Navigator>
  );
}
const GStack = createNativeStackNavigator<GestorStackParams>();
function GestorNavigator() {
  return (
    <GStack.Navigator screenOptions={stackOptions}>
      <GStack.Screen name="GestorTabs" component={GestorTabs} />
      <GStack.Screen name="ParkVehicles" component={ParkVehiclesScreen} />
      <GStack.Screen name="Stats" component={StatsScreen} />
      <GStack.Screen name="NewNotice" component={NewNoticeScreen} />
      <GStack.Screen name="IndividualAlert" component={IndividualAlertScreen} />
      <GStack.Screen name="UserDetail" component={UserDetailScreen} />
      <GStack.Screen name="EditUser" component={EditUserScreen} />
      <GStack.Screen name="Incidents" component={IncidentsScreen} />
      <GStack.Screen name="IncidentDetail" component={IncidentDetailScreen} />
      <GStack.Screen name="ExtraIssued" component={ExtraIssuedScreen} />
      <GStack.Screen name="BlockDone" component={BlockDoneScreen} />
    </GStack.Navigator>
  );
}

// ------------------------------------------------------------ Administrador (Stack + Drawer)
const Drawer = createDrawerNavigator<AdminDrawerParams>();
function AdminDrawer() {
  const { dispatch, state } = useApp();
  const pending = state.users.filter((u) => u.status === 'por_validar').length;
  const icon = (n: keyof typeof Ionicons.glyphMap) => ({ color, size }: { color: string; size: number }) => <Ionicons name={n} size={size - 2} color={color} />;
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: colors.primary,
        drawerActiveBackgroundColor: colors.primarySoft,
        drawerInactiveTintColor: colors.text,
        drawerLabelStyle: { fontWeight: '600' },
      }}
      drawerContent={(props) => (
        <DrawerContentScrollView {...props}>
          <View style={{ padding: 16, paddingBottom: 20 }}>
            <Logo />
            <Text style={{ color: colors.muted, marginTop: 6 }}>Administração</Text>
          </View>
          <DrawerItemList {...props} />
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }} />
          <DrawerItem label="Terminar sessão" labelStyle={{ color: colors.danger, fontWeight: '600' }} icon={({ size }) => <Ionicons name="log-out-outline" size={size - 2} color={colors.danger} />} onPress={() => dispatch({ type: 'LOGOUT' })} />
        </DrawerContentScrollView>
      )}
    >
      <Drawer.Screen name="VisaoGeral" component={OverviewScreen} options={{ title: 'Visão geral', drawerIcon: icon('grid-outline') }} />
      <Drawer.Screen name="Parques" component={ParksScreen} options={{ drawerIcon: icon('business-outline') }} />
      <Drawer.Screen name="Contas" component={AccountsScreen} options={{ title: pending ? `Contas · ${pending} por validar` : 'Contas', drawerIcon: icon('people-outline') }} />
      <Drawer.Screen name="Veiculos" component={AdminVehiclesScreen} options={{ title: 'Veículos', drawerIcon: icon('car-outline') }} />
      <Drawer.Screen name="HistoricoAdmin" component={AdminHistoryScreen} options={{ title: 'Histórico', drawerIcon: icon('time-outline') }} />
      <Drawer.Screen name="Precos" component={PricesScreen} options={{ title: 'Preços', drawerIcon: icon('pricetag-outline') }} />
      <Drawer.Screen name="PerfilAdmin" component={AdminProfileScreen} options={{ title: 'Perfil', drawerIcon: icon('person-outline') }} />
    </Drawer.Navigator>
  );
}
const AStack = createNativeStackNavigator<AdminStackParams>();
function AdminNavigator() {
  return (
    <AStack.Navigator screenOptions={stackOptions}>
      <AStack.Screen name="AdminDrawer" component={AdminDrawer} />
      <AStack.Screen name="ParkDetail" component={ParkDetailScreen} />
      <AStack.Screen name="CreatePark" component={CreateParkScreen} />
      <AStack.Screen name="EditFloors" component={EditFloorsScreen} />
      <AStack.Screen name="AccountDetail" component={AccountDetailScreen} />
      <AStack.Screen name="CreateManager" component={CreateManagerScreen} />
      <AStack.Screen name="VehicleDetail" component={VehicleDetailScreen} />
      <AStack.Screen name="HistoryReset" component={HistoryResetScreen} />
    </AStack.Navigator>
  );
}

/** Escolhe a área da app conforme o perfil autenticado (utente, gestor ou administrador). */
export function RootNavigator() {
  const { ready, user } = useApp();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <Logo size={26} />
        <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
      </View>
    );
  }
  return (
    <NavigationContainer>
      {!user ? <AuthNavigator key="auth" />
        : user.role === 'utente' ? <UtenteNavigator key={user.id} />
          : user.role === 'gestor' ? <GestorNavigator key={user.id} />
            : <AdminNavigator key={user.id} />}
    </NavigationContainer>
  );
}
