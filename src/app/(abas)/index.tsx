import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Botao, Carregando, Chip, Escudo } from '../../componentes/ui';
import { diaDaData, horarioDaData } from '../../dominio/calendario';
import {
  clubePorId, partidaDoClube, tabelaDaCompeticao, tabelaGeral, temporadaEncerrada, torneioAtual, ultimaPartidaDoClube,
} from '../../dominio/liga';
import type { Clube, Dificuldade, DuracaoLiga, Liga, Partida } from '../../dominio/tipos';
import { useLiga } from '../../hooks/useLiga';
import { t } from '../../i18n';
import { cores, espaco } from '../../tema';

const DURACOES: DuracaoLiga[] = ['temporada', 'torneio'];
const DIFICULDADES: Dificuldade[] = ['facil', 'normal', 'dificil'];

const abrirPartida = (id: number, aoVivo?: boolean) =>
  router.push({ pathname: '/partida/[id]', params: { id: String(id), aoVivo: aoVivo ? '1' : '0' } });

function NovaLiga() {
  const { iniciar } = useLiga();
  const [nome, setNome] = useState('');
  const [duracao, setDuracao] = useState<DuracaoLiga>('temporada');
  const [dificuldade, setDificuldade] = useState<Dificuldade>('normal');
  const [erro, setErro] = useState(false);

  const comecar = () => {
    const limpo = nome.trim();
    if (limpo.length < 3 || limpo.length > 24) {
      setErro(true);
      return;
    }
    iniciar(limpo, duracao, dificuldade);
  };

  return (
    <ScrollView contentContainerStyle={estilos.tela} keyboardShouldPersistTaps="handled">
      <Image source={require('../../../assets/splash-icon.png')} style={estilos.logo} contentFit="contain" />
      <Text style={estilos.titulo}>{t.novaLigaTitulo}</Text>
      <Text style={estilos.suave}>{t.novaLigaTexto}</Text>

      <Text style={estilos.rotulo}>{t.nomeClube}</Text>
      <TextInput
        accessibilityLabel={t.nomeClube}
        maxLength={24}
        onChangeText={(texto) => {
          setNome(texto);
          setErro(false);
        }}
        placeholder={t.nomeClubeExemplo}
        placeholderTextColor={cores.textoSuave}
        style={estilos.campo}
        value={nome}
      />
      {erro && <Text style={estilos.erro}>{t.erroNome}</Text>}

      <Text style={estilos.rotulo}>{t.duracaoLiga}</Text>
      <View style={estilos.linhaChips}>
        {DURACOES.map((d) => (
          <Chip key={d} texto={t.duracoes[d]} ativo={duracao === d} aoTocar={() => setDuracao(d)} />
        ))}
      </View>

      <Text style={estilos.rotulo}>{t.dificuldade}</Text>
      <View style={estilos.linhaChips}>
        {DIFICULDADES.map((d) => (
          <Chip key={d} texto={t.dificuldades[d]} ativo={dificuldade === d} aoTocar={() => setDificuldade(d)} />
        ))}
      </View>

      <View style={estilos.acao}>
        <Botao texto={t.iniciarLiga} aoTocar={comecar} />
      </View>
    </ScrollView>
  );
}

function Confronto({ casa, fora, placar }: { casa: Clube; fora: Clube; placar: string }) {
  return (
    <View style={estilos.confronto}>
      <View style={estilos.lado}>
        <Escudo clube={casa} tamanho={52} />
        <Text style={estilos.nomeClube} numberOfLines={2}>{casa.nome}</Text>
      </View>
      <Text style={estilos.placar}>{placar}</Text>
      <View style={estilos.lado}>
        <Escudo clube={fora} tamanho={52} />
        <Text style={estilos.nomeClube} numberOfLines={2}>{fora.nome}</Text>
      </View>
    </View>
  );
}

const nomeDaPartida = (p: Partida) =>
  [t.competicoes[p.competicao], t.fases[p.fase]].filter(Boolean).join(' · ');

function Painel({ liga, clube }: { liga: Liga; clube: Clube }) {
  const { jogar, apagar, proximaTemporada } = useLiga();
  const torneio = torneioAtual(liga);
  const tabela = torneio > 0 ? tabelaDaCompeticao(liga, 'liga', torneio) : tabelaGeral(liga);
  const geral = tabelaGeral(liga);
  const posicao = tabela.findIndex((l) => l.clubeId === clube.id) + 1;
  const encerrada = temporadaEncerrada(liga);
  const proxima = encerrada ? undefined : partidaDoClube(liga, liga.rodadaAtual, clube.id);
  const ultima = ultimaPartidaDoClube(liga, clube.id);
  const titulos = liga.titulos.filter((x) => x.clubeId === clube.id);
  const foraIds = new Set(clube.elenco.filter((j) => j.rodadasFora > 0).map((j) => j.id));
  const desfalques = clube.assistente ? 0 : (clube.escalacao?.titulares.filter((e) => foraIds.has(e.jogadorId)).length ?? 0);

  const jogarRodada = () => {
    jogar();
    if (proxima) abrirPartida(proxima.id, true);
  };

  const novaLiga = () => Alert.alert(t.apagarTitulo, t.apagarTexto, [
    { text: t.cancelar, style: 'cancel' },
    { text: t.apagar, style: 'destructive', onPress: apagar },
  ]);

  return (
    <ScrollView contentContainerStyle={estilos.tela}>
      <View style={estilos.cabecalho}>
        <Escudo clube={clube} tamanho={56} />
        <View style={estilos.flex}>
          <Text style={estilos.titulo} numberOfLines={1}>{clube.nome}</Text>
          <Text style={estilos.suave}>{t.posicaoAtual(posicao, tabela[posicao - 1].pontos)}</Text>
          <Text style={estilos.suave}>{t.saldo(clube.saldo.toLocaleString())}</Text>
        </View>
      </View>

      {encerrada && (
        <View style={estilos.cartao}>
          <Text style={estilos.rotuloCartao}>{t.temporadaFim}</Text>
          <Text style={estilos.campeao}>{t.campeao(liga.titulos[liga.titulos.length - 1].nomeClube)}</Text>
          <Text style={estilos.suave}>{t.suaPosicao(geral.findIndex((l) => l.clubeId === clube.id) + 1)}</Text>
          <Botao texto={t.novaTemporada} aoTocar={proximaTemporada} />
        </View>
      )}

      {!encerrada && (
        <View style={estilos.cartao}>
          <Text style={estilos.rotuloCartao}>
            {t.temporadaNumero(liga.temporada)} · {t.torneios[torneio]} · {t.diaHora(diaDaData(liga.rodadaAtual), horarioDaData(liga.rodadaAtual))}
          </Text>
          {proxima ? (
            <>
              <Text style={estilos.suave}>
                {nomeDaPartida(proxima)} · {proxima.casaId === clube.id ? t.emCasa : t.foraDeCasa}
              </Text>
              <Confronto casa={clubePorId(liga, proxima.casaId)} fora={clubePorId(liga, proxima.foraId)} placar={t.aguardando} />
            </>
          ) : (
            <Text style={estilos.suave}>{t.semJogo}</Text>
          )}
          {desfalques > 0 && <Text style={estilos.alerta}>{t.desfalques(desfalques)}</Text>}
          <Botao texto={proxima ? t.jogarRodada : t.avancarData} aoTocar={jogarRodada} />
        </View>
      )}

      {ultima?.resultado && (
        <View style={estilos.cartao}>
          <Text style={estilos.rotuloCartao}>{t.ultimoJogo} · {nomeDaPartida(ultima)}</Text>
          <Confronto
            casa={clubePorId(liga, ultima.casaId)}
            fora={clubePorId(liga, ultima.foraId)}
            placar={`${ultima.resultado.golsCasa} x ${ultima.resultado.golsFora}`}
          />
          <Botao secundario texto={t.fimDeJogo} aoTocar={() => abrirPartida(ultima.id)} />
        </View>
      )}

      {titulos.length > 0 && (
        <View style={estilos.cartao}>
          <Text style={estilos.rotuloCartao}>{t.titulosClube}</Text>
          {titulos.map((x, i) => (
            <Text key={i} style={estilos.suave}>
              {t.temporadaNumero(x.temporada)} · {t.competicoes[x.competicao]}{x.torneio > 0 ? ` · ${t.torneios[x.torneio]}` : ''}
            </Text>
          ))}
        </View>
      )}

      <Botao secundario texto={t.novaLiga} aoTocar={novaLiga} />
    </ScrollView>
  );
}

export default function Clube() {
  const { pronta, liga, meuClube } = useLiga();
  if (!pronta) return <Carregando />;
  if (!liga || !meuClube) return <NovaLiga />;
  return <Painel liga={liga} clube={meuClube} />;
}

const estilos = StyleSheet.create({
  tela: { padding: espaco.m, gap: espaco.m },
  flex: { flex: 1 },
  logo: { width: 150, height: 150, alignSelf: 'center' },
  titulo: { color: cores.texto, fontSize: 22, fontWeight: '800' },
  suave: { color: cores.textoSuave, fontSize: 14, lineHeight: 20 },
  rotulo: { color: cores.texto, fontWeight: '700', fontSize: 14, marginTop: espaco.p },
  rotuloCartao: { color: cores.destaque, fontWeight: '700', fontSize: 13 },
  campo: {
    backgroundColor: cores.cartao,
    borderColor: cores.borda,
    borderWidth: 1,
    borderRadius: 10,
    color: cores.texto,
    fontSize: 16,
    paddingHorizontal: espaco.m,
    paddingVertical: 12,
  },
  erro: { color: cores.erro, fontSize: 13 },
  alerta: { color: cores.destaque, fontSize: 13, textAlign: 'center' },
  linhaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.p },
  acao: { marginTop: espaco.p },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: espaco.m },
  cartao: { backgroundColor: cores.cartao, borderRadius: 14, padding: espaco.m, gap: espaco.m },
  campeao: { color: cores.texto, fontSize: 20, fontWeight: '800' },
  confronto: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lado: { flex: 1, alignItems: 'center', gap: 6 },
  nomeClube: { color: cores.texto, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  placar: { color: cores.texto, fontSize: 24, fontWeight: '800', paddingHorizontal: espaco.p },
});
