import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, InfoBox, Logo, OptionCard, Screen, TextField } from '../../components';
import { colors, radius } from '../../theme';
import { useApp } from '../../store/AppContext';
import { AuthProps } from '../../navigation/types';
import { DEMO } from '../../data/seed';
import { isValidPlate, normalizePlate, uid } from '../../utils/format';
import { VehicleType } from '../../types/models';


export function WelcomeScreen({ navigation }: AuthProps<'Welcome'>) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, padding: 18 }}>
        <Logo size={20} />
        <View style={styles.hero}>
          <View style={styles.heroGrid}>
            {['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08'].map((c, i) => (
              <View key={c} style={[styles.heroSpot, i === 5 && { backgroundColor: colors.accent }]}>
                <Ionicons name={i === 5 ? 'car' : i % 3 === 0 ? 'car-outline' : 'checkmark'} size={16} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{c}</Text>
              </View>
            ))}
          </View>
          <View style={styles.heroTag}>
            <Ionicons name="location" size={13} color={colors.primary} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>Bragança, mais perto de si</Text>
          </View>
        </View>
        <Text style={styles.big}>O seu lugar.{'\n'}Sem dar voltas.</Text>
        <Text style={styles.lead}>Encontre um parque, reserve com antecedência e entre com o seu QR Code.</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18 }}>
          <Ionicons name="shield-checkmark-outline" size={15} color={colors.primary} />
          <Text style={{ fontSize: 12.5, color: colors.primary }}>Menos tempo à procura. Mais tempo para si.</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Button title="Entrar" onPress={() => navigation.navigate('Login')} />
        <Button title="Criar conta" variant="secondary" onPress={() => navigation.navigate('Register')} style={{ marginTop: 10 }} />
        <View style={styles.sep} />
        <Pressable onPress={() => navigation.navigate('TeamAccess')} style={styles.teamLink} accessibilityRole="link">
          <Ionicons name="shield-outline" size={16} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Acesso para gestores e administradores →</Text>
        </Pressable>
        <Text style={styles.foot}>Estacionamento inteligente em Bragança</Text>
      </View>
    </SafeAreaView>
  );
}

export function LoginScreen({ navigation }: AuthProps<'Login'>) {
  const { state, dispatch } = useApp();
  const [email, setEmail] = useState(DEMO.utente.email);
  const [password, setPassword] = useState(DEMO.utente.password);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const u = state.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.role === 'utente');
    if (!u || u.password !== password) return setError('Email ou palavra-passe incorretos.');
    if (u.status === 'suspensa') return setError('Conta suspensa. Contacte o parque.');
    dispatch({ type: 'LOGIN', userId: u.id });
  };

  return (
    <Screen title="Entrar" back>
      <View style={styles.iconBox}><Ionicons name="log-in-outline" size={24} color={colors.primary} /></View>
      <Text style={styles.h1}>Bom tê-lo de volta.</Text>
      <Text style={styles.lead}>Entre na sua conta e tenha o próximo lugar de estacionamento à mão.</Text>
      <TextField label="Email" value={email} onChangeText={(t) => { setEmail(t); setError(null); }} autoCapitalize="none" keyboardType="email-address" icon="mail-outline" />
      <TextField label="Palavra-passe" value={password} onChangeText={(t) => { setPassword(t); setError(null); }} secure error={error} />
      <Button title="Entrar" onPress={submit} style={{ marginTop: 6 }} />
      <Pressable onPress={() => navigation.replace('Register')} style={{ alignItems: 'center', marginVertical: 16 }}>
        <Text style={{ color: colors.muted }}>Ainda não tem conta? <Text style={{ color: colors.primary, fontWeight: '700' }}>Criar conta</Text></Text>
      </Pressable>
      <InfoBox icon="lock-closed-outline" text={`Conta de demonstração preenchida: ${DEMO.utente.email} · ${DEMO.utente.password}`} />
    </Screen>
  );
}

export function RegisterScreen({ navigation }: AuthProps<'Register'>) {
  const { state, dispatch } = useApp();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', plate: '', type: 'automovel' as VehicleType });
  const [terms, setTerms] = useState(false);
  const [tried, setTried] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((o) => ({ ...o, [k]: v }));

  const errors = {
    name: f.name.trim().split(' ').length < 2 ? 'Indique o nome completo.' : null,
    email: !/^\S+@\S+\.\S+$/.test(f.email) ? 'Email inválido.' : state.users.some((u) => u.email === f.email.trim().toLowerCase()) ? 'Já existe uma conta com este email.' : null,
    phone: f.phone.replace(/\D/g, '').length < 9 ? 'Telemóvel inválido.' : null,
    password: !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(f.password) ? 'Pelo menos 8 caracteres, uma letra e um número.' : null,
    plate: !isValidPlate(f.plate) ? 'Matrícula no formato AA-12-BC.' : null,
  };
  const valid = Object.values(errors).every((e) => !e) && terms;

  const submit = () => {
    setTried(true);
    if (!valid) return;
    const id = uid('u');
    dispatch({
      type: 'REGISTER',
      user: { id, role: 'utente', name: f.name.trim(), email: f.email.trim().toLowerCase(), phone: f.phone, password: f.password, status: 'por_validar', parkIds: [], createdAt: Date.now() },
      vehicle: { id: uid('v'), ownerId: id, plate: normalizePlate(f.plate), type: f.type, model: f.type === 'automovel' ? 'Automóvel' : 'Motociclo' },
    });
  };
  const e = (k: keyof typeof errors) => (tried ? errors[k] : null);

  return (
    <Screen title="Criar conta" back>
      <Text style={styles.h1}>Comece por aqui.</Text>
      <Text style={styles.lead}>Uma conta para todos os parques. Reserve em poucos passos.</Text>
      <TextField label="Nome completo" placeholder="Inês Martins" value={f.name} onChangeText={set('name')} icon="person-outline" error={e('name')} />
      <TextField label="Email" placeholder="nome@email.pt" value={f.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" icon="mail-outline" error={e('email')} />
      <TextField label="Telemóvel" placeholder="+351 912 345 678" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" icon="call-outline" error={e('phone')} />
      <TextField label="Palavra-passe" value={f.password} onChangeText={set('password')} secure hint="Pelo menos 8 caracteres, uma letra e um número." error={e('password')} />
      <Text style={styles.label}>Veículo principal</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <OptionCard label="Automóvel" icon="car-outline" active={f.type === 'automovel'} onPress={() => set('type')('automovel')} />
        <OptionCard label="Motociclo" icon="bicycle-outline" active={f.type === 'motociclo'} onPress={() => set('type')('motociclo')} />
      </View>
      <TextField label="Matrícula" placeholder="AA-12-BC" value={f.plate} onChangeText={(t) => set('plate')(normalizePlate(t))} autoCapitalize="characters" error={e('plate')} />
      <Pressable onPress={() => setTerms((t) => !t)} style={styles.check} accessibilityRole="checkbox" accessibilityState={{ checked: terms }}>
        <Ionicons name={terms ? 'checkbox' : 'square-outline'} size={22} color={tried && !terms ? colors.danger : colors.primary} />
        <Text style={{ flex: 1, fontSize: 13, color: colors.text }}>Li e aceito os Termos e condições e a Política de privacidade.</Text>
      </Pressable>
      <Button title="Criar conta" onPress={submit} />
      <InfoBox text="Depois de criar a conta, um gestor valida o registo. Pode entrar já, mas só reserva depois da validação." />
      <Pressable onPress={() => navigation.replace('Login')} style={{ alignItems: 'center', marginTop: 4 }}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>Já tem conta? Entrar</Text>
      </Pressable>
    </Screen>
  );
}

export function TeamAccessScreen({ navigation }: AuthProps<'TeamAccess'>) {
  const card = (role: 'gestor' | 'admin', icon: keyof typeof Ionicons.glyphMap, title: string, text: string, cta: string) => (
    <Card onPress={() => navigation.navigate('StaffLogin', { role })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <View style={styles.iconBox}><Ionicons name={icon} size={22} color={colors.primary} /></View>
        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>{title}</Text>
      </View>
      <Text style={{ color: colors.muted, marginBottom: 12 }}>{text}</Text>
      <Text style={{ color: colors.primary, fontWeight: '700' }}>{cta} →</Text>
    </Card>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <View style={styles.teamTop}>
        <SafeAreaView edges={['top']}>
          <Pressable onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>Acesso de equipa</Text>
          </Pressable>
          <Logo light size={22} />
          <Text style={{ color: '#D7EAEE', marginTop: 6 }}>Área reservada à equipa</Text>
        </SafeAreaView>
      </View>
      <View style={{ padding: 18 }}>
        <Text style={{ color: colors.muted, marginBottom: 12 }}>Selecione o seu perfil para entrar.</Text>
        {card('gestor', 'shield-checkmark-outline', 'Segurança / Gestor', 'Acompanhe a ocupação, os lugares e os avisos do seu parque.', 'Entrar como segurança / gestor')}
        {card('admin', 'grid-outline', 'Administrador', 'Gira parques, pisos, preços e contas.', 'Entrar como administrador')}
        <InfoBox icon="lock-closed-outline" text="As contas de equipa são criadas pelo administrador. Não é possível criar conta aqui." />
      </View>
    </SafeAreaView>
  );
}

export function StaffLoginScreen({ route }: AuthProps<'StaffLogin'>) {
  const { role } = route.params;
  const { state, dispatch } = useApp();
  const demo = role === 'gestor' ? DEMO.gestor : DEMO.admin;
  const [email, setEmail] = useState(demo.email);
  const [password, setPassword] = useState(demo.password);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const u = state.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u || u.password !== password) return setError('Email ou palavra-passe incorretos.');
    if (u.role !== role) return setError(role === 'gestor' ? 'Esta conta não é de gestor.' : 'Esta conta não é de administrador.');
    if (u.status === 'suspensa') return setError('Conta suspensa pelo administrador.');
    dispatch({ type: 'LOGIN', userId: u.id });
  };

  return (
    <Screen back>
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Logo size={24} />
        <Text style={{ color: colors.muted, marginTop: 4 }}>Mobilidade inteligente. Gestão simples.</Text>
        <View style={styles.roleTag}><Text style={{ color: colors.primary, fontWeight: '800', fontSize: 11, letterSpacing: 1 }}>{role === 'gestor' ? 'ÁREA SEGURANÇA / GESTOR' : 'ÁREA DE ADMINISTRAÇÃO'}</Text></View>
      </View>
      <Text style={styles.h1}>{role === 'gestor' ? 'Bem-vindo, gestor' : 'Bem-vinda, administradora'}</Text>
      <Text style={styles.lead}>{role === 'gestor' ? 'Entre para acompanhar o seu parque.' : 'Entre para gerir os seus parques.'}</Text>
      <TextField label="Email profissional" value={email} onChangeText={(t) => { setEmail(t); setError(null); }} autoCapitalize="none" icon="mail-outline" />
      <TextField label="Palavra-passe" value={password} onChangeText={(t) => { setPassword(t); setError(null); }} secure error={error} />
      <Button title={role === 'gestor' ? 'Entrar na área de gestão' : 'Entrar na administração'} onPress={submit} />
      <View style={{ height: 14 }} />
      <InfoBox icon="lock-closed-outline" text={role === 'gestor' ? 'Acesso reservado a gestores. Conta criada pelo administrador.' : 'Conta de administrador criada pelo sistema.'} />
      <Text style={{ textAlign: 'center', color: colors.faint, fontSize: 12 }}>Demonstração: {demo.email} · {demo.password}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { height: 190, marginTop: 16, marginBottom: 18, justifyContent: 'space-between', padding: 14, backgroundColor: colors.primary, borderRadius: radius.lg },
  heroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heroSpot: { width: '22%', height: 52, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center', gap: 2 },
  heroTag: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  big: { fontSize: 30, fontWeight: '900', color: colors.text, lineHeight: 36 },
  h1: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 6 },
  lead: { fontSize: 14, color: colors.muted, marginTop: 6, marginBottom: 16, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  sep: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  teamLink: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  foot: { textAlign: 'center', fontSize: 11.5, color: colors.faint, marginTop: 10 },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  check: { flexDirection: 'row', gap: 10, alignItems: 'center', marginVertical: 12 },
  teamTop: { backgroundColor: colors.primary, padding: 18, paddingBottom: 26 },
  roleTag: { marginTop: 10, backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
});
