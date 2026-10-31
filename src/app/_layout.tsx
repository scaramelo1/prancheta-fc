import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { migrar } from '../db/migracoes';
import { ProvedorLiga } from '../hooks/useLiga';
import { cores } from '../tema';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="prancheta-fc.db" onInit={migrar}>
      <ProvedorLiga>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: cores.primaria },
            headerTintColor: '#fff',
            contentStyle: { backgroundColor: cores.fundo },
          }}
        >
          <Stack.Screen name="(abas)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="partida/[id]" options={{ title: '' }} />
        </Stack>
      </ProvedorLiga>
    </SQLiteProvider>
  );
}
