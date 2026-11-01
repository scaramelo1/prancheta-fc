import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Calendario, JogoDoCalendario } from '../../api/cliente';
import { Aviso, Carregando } from '../../componentes/ui';
import { useLiga } from '../../hooks/useLiga';
import { t } from '../../i18n';
import { cores, espaco } from '../../tema';

const FUSO_MS = 3 * 3_600_000;
const doisDigitos = (n: number) => String(n).padStart(2, '0');

/** Os jogos seguem o horário de Brasília em qualquer aparelho. */
function dataDoJogo(quando: number) {
  const local = new Date(quando - FUSO_MS);
  return t.dataEHora(`${doisDigitos(local.getUTCDate())}/${doisDigitos(local.getUTCMonth() + 1)}`, `${local.getUTCHours()}h`);
}

const nomeDaLiga = (jogo: JogoDoCalendario) => (jogo.tipo === 'oficial' ? t.mundoTitulo : t.ligaAmigos(jogo.codigo));

function Linha({ jogo }: { jogo: JogoDoCalendario }) {
  const competicao = [t.competicoes[jogo.competicao], t.fases[jogo.fase]].filter(Boolean).join(' · ');
  const conteudo = (
    <>
      <View style={estilos.flex}>
        <Text style={estilos.quando}>{dataDoJogo(jogo.quando)}</Text>
        <Text style={estilos.adversario} numberOfLines={1}>{t.jogoContra(jogo.adversario, jogo.emCasa)}</Text>
        <Text style={estilos.suave} numberOfLines={1}>{nomeDaLiga(jogo)} · {competicao}</Text>
      </View>
      {jogo.placar && <Text style={estilos.placar}>{jogo.placar.meus} x {jogo.placar.deles}</Text>}
    </>
  );
  if (!jogo.placar) return <View style={estilos.linha}>{conteudo}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/partida/[id]', params: { id: String(jogo.partidaId), aoVivo: '0', ligaId: jogo.ligaId } })}
      style={estilos.linha}
    >
      {conteudo}
    </Pressable>
  );
}

function Lista({ titulo, jogos }: { titulo: string; jogos: JogoDoCalendario[] }) {
  return (
    <>
      <Text style={estilos.titulo}>{titulo}</Text>
      {jogos.length === 0
        ? <Text style={estilos.suave}>{t.semJogos}</Text>
        : <View style={estilos.lista}>{jogos.map((j) => <Linha key={`${j.ligaId}:${j.partidaId}`} jogo={j} />)}</View>}
    </>
  );
}

export default function Jogos() {
  const { cliente, pronta, visao } = useLiga();
  const [calendario, setCalendario] = useState<Calendario | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    if (!cliente) return;
    try {
      setCalendario(await cliente.calendario());
      setFalhou(false);
    } catch {
      setFalhou(true);
    }
  }, [cliente]);

  useFocusEffect(useCallback(() => {
    carregar();
  }, [carregar]));

  const atualizar = async () => {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  };

  if (!pronta) return <Carregando />;
  if (!visao) return <Aviso texto={t.semLiga} />;
  if (falhou && !calendario) return <Aviso texto={t.erroConexao} />;
  if (!calendario) return <Carregando />;

  return (
    <ScrollView
      contentContainerStyle={estilos.tela}
      refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} tintColor={cores.destaque} />}
    >
      <Lista titulo={t.jogosProximos} jogos={calendario.proximos} />
      <Lista titulo={t.jogosResultados} jogos={calendario.resultados} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  tela: { padding: espaco.m, gap: espaco.m },
  flex: { flex: 1, gap: 2 },
  titulo: { color: cores.texto, fontSize: 18, fontWeight: '800' },
  lista: { backgroundColor: cores.cartao, borderRadius: 12, overflow: 'hidden' },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.m,
    padding: espaco.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: cores.borda,
  },
  quando: { color: cores.destaque, fontSize: 13, fontWeight: '700' },
  adversario: { color: cores.texto, fontSize: 15, fontWeight: '600' },
  suave: { color: cores.textoSuave, fontSize: 13 },
  placar: { color: cores.destaque, fontSize: 18, fontWeight: '800' },
});
