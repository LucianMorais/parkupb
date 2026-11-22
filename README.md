# ParkUPB: Gestão de parques de estacionamento inteligentes

Projeto de grupo de **Desenvolvimento Multiplataforma** (Licenciatura em Engenharia Informática, IPB/ESTiG, 2026/2027) - **Turno C** - Docente: Maria João Varanda.

> **Etapa avaliada nesta entrega: Componentes** (tag `Componentes`, branch `main`).
> Implementação dos ecrãs, dos componentes gráficos e da sua ligação a estruturas de dados locais. A integração com Firebase é feita na etapa seguinte (tag `Backend`).

## Executar

```bash
npm install
npx expo start
npm run web   
```

Abrir na app **Expo Go** (Android/iOS) com o QR Code do terminal, ou carregar `w` para a versão web.
Requisitos: Node.js 20 ou superior. Expo SDK 58, React Native 0.88, TypeScript.

## Contas de demonstração

| Perfil | Email | Palavra-passe | Como entrar |

| Utente | ines.martins@email.pt | parkupb1 | Boas-vindas -> Entrar |
| Segurança / Gestor | rui.costa@parkupb.pt | gestor123 | Boas-vindas -> Acesso para gestores e administradores |
| Administradora | ana.ferreira@parkupb.pt | admin123 | Boas-vindas -> Acesso para gestores e administradores |

Os campos já vêm preenchidos. Em **Perfil → Repor dados de demonstração** volta-se ao estado inicial.

## Estrutura

```
App.tsx                      Providers (gestos, área segura, estado global) + navegação
src/
  types/models.ts            Modelo de dados (User, Vehicle, Park, Floor, Spot, Booking, Pass, Notice, ...)
  data/seed.ts               Dados de demonstração gerados em relação à data atual
  store/
    reducer.ts               Todas as ações sobre os dados (utente, gestor, administrador)
    AppContext.tsx           Context + useReducer, relógio partilhado e persistência local (AsyncStorage)
    selectors.ts             Consultas reutilizadas pelos ecrãs
  utils/
    rules.ts                 Regras de negócio puras (preço por frações de 15 min, prazo de 1 h, horário, disponibilidade)
    format.ts                Formatação PT-PT (datas, euros, durações)
  theme/                     Design tokens do Figma (cores, espaçamentos, tipografia)
  components/                Componentes reutilizáveis (Button, TextField, Card, Chip, SpotGrid, Sheet, QRCard, ...)
  navigation/                Navegadores e tipos das rotas
  screens/
    auth/                    Boas-vindas, login, registo, acesso de equipa
    utente/                  Início, reserva em 4 passos, entrada imediata, avenças, histórico, perfil
    gestor/                  Painel, lugares, utentes, avisos, incumprimento, estatísticas
    admin/                   Visão geral, parques, pisos e lugares, preços, contas, veículos, histórico
```

## Navegação

* **Stack** (native-stack) em todos os perfis, para fluxos lineares (reserva, detalhe, edição).
* **Bottom Tabs** no Utente (Início, Reservar, Avenças, Histórico, Perfil) e no Gestor (Painel, Lugares, Utentes, Avisos, Perfil).
* **Drawer** no Administrador (Visão geral, Parques, Contas, Veículos, Histórico, Preços, Perfil).
* A área apresentada depende do perfil autenticado (`RootNavigator`).

## Dados locais e sincronização

Todo o estado vive num único `useReducer` partilhado por Context. Qualquer ação de um perfil (ex.: o gestor bloqueia um lugar) é refletida de imediato nos ecrãs dos outros perfis (o lugar deixa de aparecer livre ao utente e a reserva afetada é mudada de lugar, com notificação). O estado é guardado em AsyncStorage e regenerado em cada novo dia, para os prazos e reservas de demonstração fazerem sentido.

## Equipa

Luciano Reis | a69535 | a69535@alunos.ipb.pt
Matheus Madureira | m323988 | m323988@alunos.ipb.pt
Murilo Celegatto | m323827 | m323827@alunos.unipb.pt
