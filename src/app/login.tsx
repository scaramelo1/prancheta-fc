import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useLiga } from '../hooks/useLiga';
import { t } from '../i18n';
import { cores, espaco } from '../tema';

export default function Login() {
  const { nomeTecnico, entrarComGoogle } = useLiga();
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (nomeTecnico) return <Redirect href="/" />;

  const entrar = async () => {
    setEntrando(true);
    setErro(null);
    try {
      await entrarComGoogle();
    } catch (falha) {
      setErro((falha as Error).message);
    } finally {
      setEntrando(false);
    }
  };

  return (
    <View style={estilos.tela}>
      <Image source={require('../../assets/splash-icon.png')} style={estilos.logo} contentFit="contain" />
      <Text style={estilos.titulo}>{t.loginTitulo}</Text>
      <Text style={estilos.texto}>{t.loginTexto}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: entrando }}
        disabled={entrando}
        onPress={entrar}
        style={({ pressed }) => [estilos.botao, (pressed || entrando) && { opacity: 0.7 }]}
      >
        {entrando
          ? <ActivityIndicator color="#1F1F1F" />
          : <Ionicons name="logo-google" size={20} color="#1F1F1F" />}
        <Text style={estilos.botaoTexto}>{t.entrarGoogle}</Text>
      </Pressable>

      {erro && <Text style={estilos.erro}>{erro}</Text>}
      <Text style={estilos.privacidade}>{t.loginPrivacidade}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, justifyContent: 'center', padding: espaco.g, gap: espaco.m, backgroundColor: cores.fundo },
  logo: { width: 190, height: 190, alignSelf: 'center' },
  titulo: { color: cores.texto, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  texto: { color: cores.textoSuave, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  botao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: espaco.p,
  },
  botaoTexto: { color: '#1F1F1F', fontSize: 15, fontWeight: '700' },
  erro: { color: cores.erro, fontSize: 14, textAlign: 'center' },
  privacidade: { color: cores.textoSuave, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
