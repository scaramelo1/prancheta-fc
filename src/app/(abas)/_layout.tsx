import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';

import { t } from '../../i18n';
import { cores } from '../../tema';

type NomeIcone = ComponentProps<typeof Ionicons>['name'];

// A tab bar sempre passa a cor como string; o tipo ColorValue do RN inclui null.
const icone =
  (nome: NomeIcone) =>
  ({ color, size }: { color: unknown; size: number }) => <Ionicons name={nome} color={color as string} size={size} />;

export default function AbasLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: cores.primaria },
        headerTintColor: '#fff',
        tabBarActiveTintColor: cores.destaque,
        tabBarInactiveTintColor: cores.textoSuave,
        tabBarStyle: { backgroundColor: cores.primaria, borderTopColor: cores.borda },
        sceneStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t.abaClube, headerTitle: 'Prancheta FC', tabBarIcon: icone('shield') }}
      />
      <Tabs.Screen name="elenco" options={{ title: t.abaElenco, tabBarIcon: icone('people') }} />
      <Tabs.Screen name="tabela" options={{ title: t.abaTabela, tabBarIcon: icone('trophy') }} />
    </Tabs>
  );
}
