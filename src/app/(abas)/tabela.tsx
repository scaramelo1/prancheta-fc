import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Aviso, Carregando, Chip, Escudo } from '../../componentes/ui';
import { clubePorId, partidasDaRodada, tabelaDaLiga } from '../../dominio/liga';
import type { Liga } from '../../dominio/tipos';
import { useLiga } from '../../hooks/useLiga';
import { t } from '../../i18n';
import { cores, espaco } from '../../tema';

function Classificacao({ liga, meuId }: { liga: Liga; meuId: number }) {
  return (
    <View style={estilos.lista}>
      <View style={estilos.linha}>
        <Text style={[estilos.cabecalho, estilos.colPosicao]}>#</Text>
        <Text style={[estilos.cabecalho, estilos.flex]}>{t.abaClube}</Text>
        {[t.colunas.pontos, t.colunas.jogos, t.colunas.vitorias, t.colunas.saldo].map((c) => (
          <Text key={c} style={[estilos.cabecalho, estilos.coluna]}>{c}</Text>
        ))}
      </View>
      {tabelaDaLiga(liga).map((l, i) => {
        const clube = clubePorId(liga, l.clubeId);
        return (
          <View key={l.clubeId} style={[estilos.linha, l.clubeId === meuId && estilos.linhaMinha]}>
            <Text style={[estilos.celula, estilos.colPosicao]}>{i + 1}</Text>
            <View style={[estilos.flex, estilos.clube]}>
              <Escudo clube={clube} tamanho={26} />
              <Text style={estilos.nome} numberOfLines={1}>{clube.nome}</Text>
            </View>
            <Text style={[estilos.celula, estilos.coluna, estilos.pontos]}>{l.pontos}</Text>
            <Text style={[estilos.celula, estilos.coluna]}>{l.jogos}</Text>
            <Text style={[estilos.celula, estilos.coluna]}>{l.vitorias}</Text>
            <Text style={[estilos.celula, estilos.coluna]}>{l.saldo}</Text>
          </View>
        );
      })}
    </View>
  );
}

function Rodadas({ liga, meuId }: { liga: Liga; meuId: number }) {
  const [rodada, setRodada] = useState(Math.min(liga.rodadaAtual, liga.totalRodadas));
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
        {Array.from({ length: liga.totalRodadas }, (_, i) => i + 1).map((n) => (
          <Chip key={n} texto={String(n)} ativo={n === rodada} aoTocar={() => setRodada(n)} />
        ))}
      </ScrollView>
      <Text style={estilos.titulo}>{t.rodada(rodada)}</Text>
      <View style={estilos.lista}>
        {partidasDaRodada(liga, rodada).map((p) => {
          const casa = clubePorId(liga, p.casaId);
          const fora = clubePorId(liga, p.foraId);
          const minha = p.casaId === meuId || p.foraId === meuId;
          return (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              disabled={!p.resultado}
              onPress={() => router.push({ pathname: '/partida/[id]', params: { id: String(p.id), aoVivo: '0' } })}
              style={[estilos.jogo, minha && estilos.linhaMinha]}
            >
              <Text style={[estilos.nome, estilos.direita]} numberOfLines={1}>{casa.nome}</Text>
              <Text style={estilos.placar}>
                {p.resultado ? `${p.resultado.golsCasa} x ${p.resultado.golsFora}` : t.aguardando}
              </Text>
              <Text style={estilos.nome} numberOfLines={1}>{fora.nome}</Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

export default function Tabela() {
  const { pronta, liga, meuClube } = useLiga();
  const [vista, setVista] = useState<'classificacao' | 'rodadas'>('classificacao');

  if (!pronta) return <Carregando />;
  if (!liga || !meuClube) return <Aviso texto={t.novaLigaTexto} />;

  return (
    <ScrollView contentContainerStyle={estilos.tela}>
      <View style={estilos.chips}>
        <Chip texto={t.classificacao} ativo={vista === 'classificacao'} aoTocar={() => setVista('classificacao')} />
        <Chip texto={t.rodadas} ativo={vista === 'rodadas'} aoTocar={() => setVista('rodadas')} />
      </View>
      {vista === 'classificacao' ? <Classificacao liga={liga} meuId={meuClube.id} /> : <Rodadas liga={liga} meuId={meuClube.id} />}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  tela: { padding: espaco.m, gap: espaco.m },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', gap: espaco.p },
  titulo: { color: cores.texto, fontSize: 16, fontWeight: '700' },
  lista: { backgroundColor: cores.cartao, borderRadius: 12, overflow: 'hidden' },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: cores.borda,
  },
  linhaMinha: { backgroundColor: cores.borda },
  cabecalho: { color: cores.textoSuave, fontSize: 12, fontWeight: '700' },
  celula: { color: cores.texto, fontSize: 14 },
  colPosicao: { width: 24 },
  coluna: { width: 32, textAlign: 'center' },
  pontos: { color: cores.destaque, fontWeight: '800' },
  clube: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nome: { color: cores.texto, fontSize: 13, flexShrink: 1, flex: 1 },
  direita: { textAlign: 'right' },
  jogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.p,
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: cores.borda,
  },
  placar: { color: cores.destaque, fontSize: 15, fontWeight: '800', minWidth: 48, textAlign: 'center' },
});
