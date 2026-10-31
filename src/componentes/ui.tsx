import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Clube } from '../dominio/tipos';
import { cores, espaco } from '../tema';

export function Carregando() {
  return (
    <View style={estilos.centro}>
      <ActivityIndicator color={cores.destaque} size="large" />
    </View>
  );
}

export function Aviso({ texto }: { texto: string }) {
  return (
    <View style={estilos.centro}>
      <Text style={estilos.aviso}>{texto}</Text>
    </View>
  );
}

export function Botao({
  texto,
  aoTocar,
  secundario,
  desativado,
}: {
  texto: string;
  aoTocar?: () => void;
  secundario?: boolean;
  desativado?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: desativado }}
      disabled={desativado}
      onPress={aoTocar}
      style={({ pressed }) => [
        estilos.botao,
        secundario && estilos.botaoSecundario,
        (pressed || desativado) && { opacity: 0.6 },
      ]}
    >
      <Text style={[estilos.botaoTexto, secundario && { color: cores.texto }]}>{texto}</Text>
    </Pressable>
  );
}

export function Chip({ texto, ativo, aoTocar }: { texto: string; ativo: boolean; aoTocar: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      onPress={aoTocar}
      style={[estilos.chip, ativo && estilos.chipAtivo]}
    >
      <Text style={[estilos.chipTexto, ativo && { color: cores.sobreDestaque }]}>{texto}</Text>
    </Pressable>
  );
}

export function Escudo({ clube, tamanho = 40 }: { clube: Clube; tamanho?: number }) {
  return (
    <View
      style={[estilos.escudo, { width: tamanho, height: tamanho, borderRadius: tamanho / 2, backgroundColor: clube.cor }]}
    >
      <Text style={[estilos.escudoTexto, { fontSize: tamanho * 0.3 }]}>{clube.sigla}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  centro: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: espaco.g, minHeight: 240 },
  aviso: { color: cores.textoSuave, fontSize: 15, textAlign: 'center', marginBottom: espaco.m, lineHeight: 22 },
  botao: {
    backgroundColor: cores.destaque,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: espaco.m,
    alignItems: 'center',
  },
  botaoSecundario: { backgroundColor: 'transparent', borderWidth: 1, borderColor: cores.borda },
  botaoTexto: { color: cores.sobreDestaque, fontWeight: '700', fontSize: 15 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: cores.borda,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  chipAtivo: { backgroundColor: cores.destaque, borderColor: cores.destaque },
  chipTexto: { color: cores.textoSuave, fontWeight: '600', fontSize: 13 },
  escudo: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF33' },
  escudoTexto: { color: '#fff', fontWeight: '800' },
});
