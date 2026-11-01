import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';

import { useLiga } from '../../hooks/useLiga';
import { t } from '../../i18n';
import { cores } from '../../tema';

type NomeIcone = ComponentProps<typeof Ionicons>['name'];

// A tab bar sempre passa a cor como string; o tipo ColorValue do RN inclui null.
function icone(nome: NomeIcone) {
  return function IconeAba({ color, size }: { color: unknown; size: number }) {
    return <Ionicons name={nome} color={color as string} size={size} />;
  };
}

export default function AbasLayout() {
  const { pronta, semConexao, nomeTecnico } = useLiga();
  if (pronta && !semConexao && !nomeTecnico) return <Redirect href="/login" />;

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
      <Tabs.Screen name="jogos" options={{ title: t.abaJogos, tabBarIcon: icone('calendar') }} />
      <Tabs.Screen name="elenco" options={{ title: t.abaElenco, tabBarIcon: icone('people') }} />
      <Tabs.Screen name="mercado" options={{ title: t.abaMercado, tabBarIcon: icone('swap-horizontal') }} />
      <Tabs.Screen name="tabela" options={{ title: t.abaTabela, tabBarIcon: icone('trophy') }} />
    </Tabs>
  );
}
