import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { VisaoLiga } from '../../api/cliente';
import { Aviso, Botao, Carregando, Chip, Escudo } from '../../componentes/ui';
import { clubePorId } from '../../dominio/liga';
import { explicarPartida } from '../../dominio/resumo';
import type { Evento, Partida as DadosPartida } from '../../dominio/tipos';
import { useLiga } from '../../hooks/useLiga';
import { t } from '../../i18n';
import { cores, espaco } from '../../tema';

const FIM = 90;
/** Com 130 ms por minuto, a narração inteira dura cerca de 12 segundos. */
const MS_POR_MINUTO = 130;

const ICONES: Record<Evento['tipo'], string> = { gol: '⚽', chance: '🥅', amarelo: '🟨', vermelho: '🟥', lesao: '🚑' };

function narrar(e: Evento) {
  if (e.tipo === 'gol') return t.narracaoGol(e.jogador, e.assistencia);
  if (e.tipo === 'chance') return t.narracaoChance(e.jogador);
  if (e.tipo === 'amarelo') return t.narracaoAmarelo(e.jogador);
  if (e.tipo === 'vermelho') return t.narracaoVermelho(e.jogador);
  return t.narracaoLesao(e.jogador, e.rodadasFora ?? 1);
}

export default function Partida() {
  const { id, aoVivo, ligaId: ligaDoParametro } = useLocalSearchParams<{ id: string; aoVivo?: string; ligaId?: string }>();
  const { cliente, visao } = useLiga();
  const [amigos, setAmigos] = useState<VisaoLiga | null>(null);
  const [minuto, setMinuto] = useState(aoVivo === '1' ? 0 : FIM);
  const [soGols, setSoGols] = useState(false);
  const [partida, setPartida] = useState<DadosPartida | null>(null);
  const [falhou, setFalhou] = useState(false);

  // A narração completa só vem do servidor quando a partida é aberta.
  const mundoId = visao?.id;
  const ligaId = ligaDoParametro ?? mundoId;
  useEffect(() => {
    if (!cliente || !ligaId) return;
    cliente.partida(ligaId, Number(id)).then(setPartida).catch(() => setFalhou(true));
    if (ligaId !== mundoId) cliente.liga(ligaId).then(setAmigos).catch(() => setFalhou(true));
  }, [cliente, id, ligaId, mundoId]);

  useEffect(() => {
    if (!partida || minuto >= FIM) return;
    const relogio = setTimeout(() => setMinuto(minuto + 1), MS_POR_MINUTO);
    return () => clearTimeout(relogio);
  }, [minuto, partida]);

  if (falhou) return <Aviso texto={t.partidaNaoEncontrada} />;
  const aberta = ligaId === mundoId ? visao : amigos;
  if (!aberta || !partida) return <Carregando />;
  if (!partida.resultado) return <Aviso texto={t.partidaNaoEncontrada} />;

  const { resultado } = partida;
  const { liga } = aberta;
  const meuClube = aberta.meuClubeId === null ? null : clubePorId(liga, aberta.meuClubeId);
  const casa = clubePorId(liga, partida.casaId);
  const fora = clubePorId(liga, partida.foraId);
  const lances = resultado.eventos.filter((e) => e.minuto <= minuto);
  const gols = (clubeId: number) => lances.filter((e) => e.tipo === 'gol' && e.clubeId === clubeId).length;
  const encerrada = minuto >= FIM;
  const visiveis = soGols ? lances.filter((e) => e.tipo === 'gol') : lances;
  const minhaPartida = meuClube && (partida.casaId === meuClube.id || partida.foraId === meuClube.id);
  const titulo = [t.competicoes[partida.competicao], t.fases[partida.fase]].filter(Boolean).join(' · ');

  return (
    <ScrollView contentContainerStyle={estilos.tela}>
      <Text style={estilos.competicao}>{titulo}</Text>
      <View style={estilos.placar}>
        <View style={estilos.lado}>
          <Escudo clube={casa} tamanho={56} />
          <Text style={estilos.clube} numberOfLines={2}>{casa.nome}</Text>
        </View>
        <View style={estilos.centro}>
          <Text style={estilos.gols}>{gols(casa.id)} x {gols(fora.id)}</Text>
          <Text style={estilos.relogio}>{encerrada ? t.fimDeJogo : `${minuto}'`}</Text>
        </View>
        <View style={estilos.lado}>
          <Escudo clube={fora} tamanho={56} />
          <Text style={estilos.clube} numberOfLines={2}>{fora.nome}</Text>
        </View>
      </View>

      {encerrada ? (
        <View style={estilos.cartao}>
          {resultado.vencedorPenaltis !== undefined && (
            <Text style={estilos.penaltis}>{t.penaltis(clubePorId(liga, resultado.vencedorPenaltis).nome)}</Text>
          )}
          <View style={estilos.estatistica}>
            <Text style={estilos.valor}>{resultado.posseCasa}%</Text>
            <Text style={estilos.rotulo}>{t.posse}</Text>
            <Text style={estilos.valor}>{100 - resultado.posseCasa}%</Text>
          </View>
          <View style={estilos.estatistica}>
            <Text style={estilos.valor}>{resultado.chancesCasa}</Text>
            <Text style={estilos.rotulo}>{t.chances}</Text>
            <Text style={estilos.valor}>{resultado.chancesFora}</Text>
          </View>
          {meuClube && minhaPartida && <Text style={estilos.motivo}>{t.motivos[explicarPartida(partida, meuClube.id)]}</Text>}
        </View>
      ) : (
        <Botao secundario texto={t.pularNarracao} aoTocar={() => setMinuto(FIM)} />
      )}

      <View style={estilos.filtro}>
        <Chip texto={t.soGols} ativo={soGols} aoTocar={() => setSoGols(!soGols)} />
      </View>

      <View style={estilos.cartao}>
        {visiveis.length === 0 && <Text style={estilos.lance}>{t.semLances}</Text>}
        {[...visiveis].reverse().map((e, i) => (
          <View key={`${e.minuto}-${e.jogadorId}-${i}`} style={estilos.linhaLance}>
            <Text style={estilos.minuto}>{`${e.minuto}'`}</Text>
            <Text style={estilos.icone}>{ICONES[e.tipo]}</Text>
            <View style={estilos.flex}>
              <Text style={[estilos.lance, e.tipo === 'gol' && estilos.lanceGol]}>{narrar(e)}</Text>
              <Text style={estilos.time}>{clubePorId(liga, e.clubeId).nome}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  tela: { padding: espaco.m, gap: espaco.m },
  flex: { flex: 1 },
  competicao: { color: cores.destaque, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  motivo: { color: cores.textoSuave, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  filtro: { flexDirection: 'row' },
  penaltis: { color: cores.destaque, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  placar: { flexDirection: 'row', alignItems: 'center' },
  lado: { flex: 1, alignItems: 'center', gap: 6 },
  centro: { alignItems: 'center', paddingHorizontal: espaco.p, minWidth: 104 },
  clube: { color: cores.texto, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  gols: { color: cores.texto, fontSize: 32, fontWeight: '800' },
  relogio: { color: cores.destaque, fontSize: 13, fontWeight: '700', marginTop: 4 },
  cartao: { backgroundColor: cores.cartao, borderRadius: 14, padding: espaco.m, gap: 12 },
  estatistica: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  valor: { color: cores.texto, fontSize: 15, fontWeight: '700', minWidth: 44, textAlign: 'center' },
  rotulo: { color: cores.textoSuave, fontSize: 13 },
  linhaLance: { flexDirection: 'row', gap: espaco.p },
  minuto: { color: cores.textoSuave, fontSize: 13, width: 28, marginTop: 1 },
  icone: { fontSize: 14, marginTop: 1 },
  lance: { color: cores.texto, fontSize: 14, lineHeight: 19 },
  lanceGol: { color: cores.destaque, fontWeight: '800' },
  time: { color: cores.textoSuave, fontSize: 12 },
});
