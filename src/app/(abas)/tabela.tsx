import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { VisaoLiga } from '../../api/cliente';
import { Aviso, Carregando, Chip, Escudo } from '../../componentes/ui';
import { DATAS_DOS_TORNEIOS, DATAS_POR_TORNEIO, diaDaData, horarioDaData } from '../../dominio/calendario';
import { clubePorId, partidasDaRodada, tabelaDaCompeticao, tabelaGeral, torneioAtual } from '../../dominio/liga';
import { SOBEM_POR_LIGA, numeroDaDivisao } from '../../dominio/mundo';
import type { Liga, LinhaTabela, Partida } from '../../dominio/tipos';
import { useLiga } from '../../hooks/useLiga';
import { t } from '../../i18n';
import { cores, espaco } from '../../tema';

function Classificacao({ liga, linhas, meuId, zonas }: { liga: Liga; linhas: LinhaTabela[]; meuId: number; zonas: boolean }) {
  const sobem = zonas && numeroDaDivisao(liga) > 1 ? SOBEM_POR_LIGA : 0;
  const descem = zonas ? liga.descem ?? 0 : 0;
  return (
    <View style={estilos.lista}>
      <View style={estilos.linha}>
        <Text style={[estilos.cabecalho, estilos.colPosicao]}>#</Text>
        <Text style={[estilos.cabecalho, estilos.flex]}>{t.abaClube}</Text>
        {[t.colunas.pontos, t.colunas.jogos, t.colunas.vitorias, t.colunas.saldo].map((c) => (
          <Text key={c} style={[estilos.cabecalho, estilos.coluna]}>{c}</Text>
        ))}
      </View>
      {linhas.map((l, i) => {
        const clube = clubePorId(liga, l.clubeId);
        return (
          <View key={l.clubeId} style={[estilos.linha, l.clubeId === meuId && estilos.linhaMinha]}>
            <Text
              style={[
                estilos.celula,
                estilos.colPosicao,
                i < sobem && { color: cores.concluido, fontWeight: '800' },
                i >= linhas.length - descem && { color: cores.erro, fontWeight: '800' },
              ]}
            >
              {i + 1}
            </Text>
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

function Jogo({ liga, partida, meuId }: { liga: Liga; partida: Partida; meuId: number }) {
  const casa = clubePorId(liga, partida.casaId);
  const fora = clubePorId(liga, partida.foraId);
  const minha = partida.casaId === meuId || partida.foraId === meuId;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!partida.resultado}
      onPress={() => router.push({ pathname: '/partida/[id]', params: { id: String(partida.id), aoVivo: '0', ligaId: liga.id } })}
      style={[estilos.jogo, minha && estilos.linhaMinha]}
    >
      <Text style={[estilos.nome, estilos.direita]} numberOfLines={1}>{casa.nome}</Text>
      <Text style={estilos.placar}>
        {partida.resultado ? `${partida.resultado.golsCasa} x ${partida.resultado.golsFora}` : t.aguardando}
      </Text>
      <Text style={estilos.nome} numberOfLines={1}>{fora.nome}</Text>
    </Pressable>
  );
}

/** O mata-mata de amigos não tem tabela: mostra as fases, da primeira à final. */
function Chave({ liga, meuId }: { liga: Liga; meuId: number }) {
  const fases = [...new Set(liga.partidas.map((p) => p.rodada))].sort((a, b) => a - b);
  if (fases.length === 0) return <Text style={estilos.legenda}>{t.chaveAguardando}</Text>;
  const [campeao] = liga.titulos;
  return (
    <>
      {campeao && <Text style={estilos.titulo}>{t.campeao(campeao.nomeClube)}</Text>}
      {fases.map((rodada) => {
        const partidas = partidasDaRodada(liga, rodada);
        return (
          <View key={rodada} style={estilos.fase}>
            <Text style={estilos.titulo}>{t.fases[partidas[0].fase]}</Text>
            <View style={estilos.lista}>
              {partidas.map((p) => <Jogo key={p.id} liga={liga} partida={p} meuId={meuId} />)}
            </View>
          </View>
        );
      })}
    </>
  );
}

function Rodadas({ liga, meuId }: { liga: Liga; meuId: number }) {
  const [rodada, setRodada] = useState(Math.min(liga.rodadaAtual, liga.totalRodadas));
  const torneio = torneioAtual(liga);
  const inicio = torneio > 0 ? (torneio - 1) * DATAS_POR_TORNEIO + 1 : DATAS_DOS_TORNEIOS + 1;
  const fim = torneio > 0 ? torneio * DATAS_POR_TORNEIO : liga.totalRodadas;
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
        {Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i).map((n) => (
          <Chip key={n} texto={t.data(diaDaData(n), horarioDaData(n))} ativo={n === rodada} aoTocar={() => setRodada(n)} />
        ))}
      </ScrollView>
      <Text style={estilos.titulo}>{t.data(diaDaData(rodada), horarioDaData(rodada))}</Text>
      <View style={estilos.lista}>
        {partidasDaRodada(liga, rodada).map((p) => <Jogo key={p.id} liga={liga} partida={p} meuId={meuId} />)}
      </View>
    </>
  );
}

type Vista = 'liga' | 'copa' | 'geral' | 'rodadas';

export default function Tabela() {
  const { cliente, ligas, pronta, visao } = useLiga();
  const [vista, setVista] = useState<Vista>('liga');
  const [ligaId, setLigaId] = useState<string | null>(null);
  const [amigos, setAmigos] = useState<VisaoLiga | null>(null);

  useEffect(() => {
    setAmigos(null);
    if (ligaId) cliente?.liga(ligaId).then(setAmigos).catch(() => setLigaId(null));
  }, [cliente, ligaId]);

  if (!pronta) return <Carregando />;
  if (!visao) return <Aviso texto={t.semLiga} />;
  const aberta = ligaId ? amigos : visao;
  const deAmigos = ligas.filter((l) => l.tipo === 'amigos');
  const escolha = deAmigos.length > 0 && (
    <View style={estilos.chipsLinha}>
      <Chip texto={t.mundoTitulo} ativo={!ligaId} aoTocar={() => setLigaId(null)} />
      {deAmigos.map((l) => <Chip key={l.id} texto={t.ligaAmigos(l.codigo)} ativo={l.id === ligaId} aoTocar={() => setLigaId(l.id)} />)}
    </View>
  );
  if (!aberta || aberta.meuClubeId === null) return <Carregando />;
  const { liga, meuClubeId } = aberta;
  if (liga.tipo === 'amigos') {
    return (
      <ScrollView contentContainerStyle={estilos.tela}>
        {escolha}
        <Chave liga={liga} meuId={meuClubeId} />
      </ScrollView>
    );
  }

  // Nas finais não há torneio em andamento; mostra o último, o de encerramento.
  const torneio = torneioAtual(liga) || 3;
  const linhas: Record<Exclude<Vista, 'rodadas'>, LinhaTabela[]> = {
    liga: tabelaDaCompeticao(liga, 'liga', torneio),
    copa: tabelaDaCompeticao(liga, 'copa', torneio),
    geral: tabelaGeral(liga),
  };

  return (
    <ScrollView contentContainerStyle={estilos.tela}>
      {escolha}
      <View style={estilos.chipsLinha}>
        <Chip texto={t.competicoes.liga} ativo={vista === 'liga'} aoTocar={() => setVista('liga')} />
        <Chip texto={t.competicoes.copa} ativo={vista === 'copa'} aoTocar={() => setVista('copa')} />
        <Chip texto={t.geral} ativo={vista === 'geral'} aoTocar={() => setVista('geral')} />
        <Chip texto={t.rodadas} ativo={vista === 'rodadas'} aoTocar={() => setVista('rodadas')} />
      </View>
      {vista === 'rodadas'
        ? <Rodadas key={liga.id} liga={liga} meuId={meuClubeId} />
        : <Classificacao liga={liga} linhas={linhas[vista]} meuId={meuClubeId} zonas={liga.tipo === 'oficial' && vista === 'geral'} />}
      {liga.tipo === 'oficial' && vista === 'geral' && <Text style={estilos.legenda}>{t.legendaZonas}</Text>}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  tela: { padding: espaco.m, gap: espaco.m },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', gap: espaco.p },
  fase: { gap: espaco.p },
  chipsLinha: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.p },
  titulo: { color: cores.texto, fontSize: 16, fontWeight: '700' },
  legenda: { color: cores.textoSuave, fontSize: 13, lineHeight: 19 },
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
