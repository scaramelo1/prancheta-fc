import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import type { VisaoLiga } from '../../api/cliente';
import { Aviso, Botao, Carregando, Chip, Escudo } from '../../componentes/ui';
import { diaDaData, horarioDaData } from '../../dominio/calendario';
import { nivelDoTime } from '../../dominio/escalacao';
import {
  clubePorId, partidaDoClube, tabelaDaCompeticao, tabelaGeral, temporadaEncerrada, torneioAtual, ultimaPartidaDoClube,
} from '../../dominio/liga';
import { explicarPartida } from '../../dominio/resumo';
import type { Clube, Dificuldade, DuracaoLiga, Partida } from '../../dominio/tipos';
import { useLiga } from '../../hooks/useLiga';
import { t } from '../../i18n';
import { cores, espaco } from '../../tema';

const DURACOES: DuracaoLiga[] = ['temporada', 'torneio'];
const DIFICULDADES: Dificuldade[] = ['facil', 'normal', 'dificil'];
const TAMANHO_CODIGO = 6;

const abrirPartida = (id: number) =>
  router.push({ pathname: '/partida/[id]', params: { id: String(id), aoVivo: '1' } });

const nomeValido = (nome: string) => nome.trim().length >= 3 && nome.trim().length <= 24;

function Formularios({ aoVoltar }: { aoVoltar?: () => void }) {
  const { criar, entrar } = useLiga();
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [duracao, setDuracao] = useState<DuracaoLiga>('temporada');
  const [dificuldade, setDificuldade] = useState<Dificuldade>('normal');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (acao: () => Promise<void>) => {
    if (!nomeValido(nome)) {
      setErro(t.erroNome);
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await acao();
      aoVoltar?.();
    } catch (falha) {
      setErro((falha as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const entrarComCodigo = () => {
    if (codigo.trim().length !== TAMANHO_CODIGO) {
      setErro(t.erroCodigo);
      return;
    }
    enviar(() => entrar(codigo, nome));
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
          setErro(null);
        }}
        placeholder={t.nomeClubeExemplo}
        placeholderTextColor={cores.textoSuave}
        style={estilos.campo}
        value={nome}
      />
      {erro && <Text style={estilos.erro}>{erro}</Text>}

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

      <Botao texto={t.criarLiga} desativado={enviando} aoTocar={() => enviar(() => criar(nome, duracao, dificuldade))} />

      <View style={estilos.separador} />
      <Text style={estilos.titulo}>{t.entrarTitulo}</Text>
      <Text style={estilos.suave}>{t.entrarTexto}</Text>
      <TextInput
        accessibilityLabel={t.codigoConvite}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={TAMANHO_CODIGO}
        onChangeText={(texto) => {
          setCodigo(texto.toUpperCase());
          setErro(null);
        }}
        placeholder={t.codigoConvite}
        placeholderTextColor={cores.textoSuave}
        style={estilos.campo}
        value={codigo}
      />
      <Botao secundario texto={t.entrarLiga} desativado={enviando} aoTocar={entrarComCodigo} />

      {aoVoltar && <Botao secundario texto={t.voltar} aoTocar={aoVoltar} />}
    </ScrollView>
  );
}

function Confronto({ casa, fora, placar, nivel }: { casa: Clube; fora: Clube; placar: string; nivel?: boolean }) {
  return (
    <View style={estilos.confronto}>
      <View style={estilos.lado}>
        <Escudo clube={casa} tamanho={52} />
        <Text style={estilos.nomeClube} numberOfLines={2}>{casa.nome}</Text>
        {nivel && <Text style={estilos.suave}>{t.nivelCurto(nivelDoTime(casa))}</Text>}
      </View>
      <Text style={estilos.placar}>{placar}</Text>
      <View style={estilos.lado}>
        <Escudo clube={fora} tamanho={52} />
        <Text style={estilos.nomeClube} numberOfLines={2}>{fora.nome}</Text>
        {nivel && <Text style={estilos.suave}>{t.nivelCurto(nivelDoTime(fora))}</Text>}
      </View>
    </View>
  );
}

const nomeDaPartida = (p: Partida) =>
  [t.competicoes[p.competicao], t.fases[p.fase]].filter(Boolean).join(' · ');

function Convite({ visao }: { visao: VisaoLiga }) {
  const { iniciar } = useLiga();
  const tecnicos = visao.liga.clubes.filter((c) => c.donoId !== null).length;
  return (
    <View style={estilos.cartao}>
      <Text style={estilos.rotuloCartao}>{t.conviteTitulo} · {t.tecnicos(tecnicos)}</Text>
      <Text selectable style={estilos.codigo}>{visao.codigo}</Text>
      <Text style={estilos.suave}>{t.conviteTexto(visao.codigo)}</Text>
      <Botao secundario texto={t.compartilhar} aoTocar={() => Share.share({ message: t.mensagemConvite(visao.codigo) })} />
      {!visao.iniciada && visao.souDono && (
        <>
          <Text style={estilos.suave}>{t.iniciarAviso}</Text>
          <Botao texto={t.iniciarLiga} aoTocar={iniciar} />
        </>
      )}
      {!visao.iniciada && !visao.souDono && <Text style={estilos.alerta}>{t.aguardandoDono}</Text>}
    </View>
  );
}

function Painel({ visao, clube, aoOutraLiga }: { visao: VisaoLiga; clube: Clube; aoOutraLiga: () => void }) {
  const { decidir, ligas, nomeTecnico, recarregar, sair, selecionar } = useLiga();
  const { liga, decisao } = visao;
  const [atualizando, setAtualizando] = useState(false);
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
  const aguardaPrimeiroJogo = visao.iniciada && liga.rodadaAtual === 1 && liga.temporada === 1;

  const confirmarSaida = () => Alert.alert(t.sairTitulo, t.sairTexto, [
    { text: t.cancelar, style: 'cancel' },
    { text: t.sair, style: 'destructive', onPress: sair },
  ]);

  const atualizar = async () => {
    setAtualizando(true);
    await recarregar();
    setAtualizando(false);
  };

  return (
    <ScrollView
      contentContainerStyle={estilos.tela}
      refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} tintColor={cores.destaque} />}
    >
      {ligas.length > 1 && (
        <View style={estilos.linhaChips}>
          {ligas.map((l) => (
            <Chip key={l.id} texto={l.clube ?? l.codigo} ativo={l.id === visao.id} aoTocar={() => selecionar(l.id)} />
          ))}
        </View>
      )}

      <View style={estilos.cabecalho}>
        <Escudo clube={clube} tamanho={56} />
        <View style={estilos.flex}>
          <Text style={estilos.titulo} numberOfLines={1}>{clube.nome}</Text>
          <Text style={estilos.suave}>{t.posicaoAtual(posicao, tabela[posicao - 1].pontos)}</Text>
          <Text style={estilos.suave}>{t.nivelTime}: {nivelDoTime(clube)}</Text>
          <Text style={estilos.suave}>{t.saldo(clube.saldo.toLocaleString())}</Text>
        </View>
      </View>

      {(!visao.iniciada || aguardaPrimeiroJogo) && <Convite visao={visao} />}

      {encerrada && (
        <View style={estilos.cartao}>
          <Text style={estilos.rotuloCartao}>{t.temporadaFim}</Text>
          <Text style={estilos.campeao}>{t.campeao(liga.titulos[liga.titulos.length - 1].nomeClube)}</Text>
          <Text style={estilos.suave}>{t.suaPosicao(geral.findIndex((l) => l.clubeId === clube.id) + 1)}</Text>
          <Text style={estilos.suave}>{t.proximaTemporadaAviso}</Text>
        </View>
      )}

      {decisao && visao.iniciada && (
        <View style={estilos.cartao}>
          <Text style={estilos.rotuloCartao}>{t.decisaoDoDia}</Text>
          <Text style={estilos.textoDecisao}>{t.decisoes[decisao.tipo](decisao.jogador ?? '')}</Text>
          <View style={estilos.linhaBotoes}>
            <View style={estilos.flex}>
              <Botao texto={t.aceitar} aoTocar={() => decidir(true)} />
            </View>
            <View style={estilos.flex}>
              <Botao secundario texto={t.recusar} aoTocar={() => decidir(false)} />
            </View>
          </View>
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
              <Confronto casa={clubePorId(liga, proxima.casaId)} fora={clubePorId(liga, proxima.foraId)} placar={t.aguardando} nivel />
            </>
          ) : (
            <Text style={estilos.suave}>{t.semJogo}</Text>
          )}
          {desfalques > 0 && <Text style={estilos.alerta}>{t.desfalques(desfalques)}</Text>}
          <Text style={estilos.suave}>{aguardaPrimeiroJogo ? t.comecaAoMeioDia : t.proximoJogoEm}</Text>
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
          <Text style={estilos.suave}>{t.motivos[explicarPartida(ultima, clube.id)]}</Text>
          <Botao secundario texto={t.verJogo} aoTocar={() => abrirPartida(ultima.id)} />
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

      <Botao secundario texto={t.outraLiga} aoTocar={aoOutraLiga} />
      <Botao secundario texto={`${t.sair} (${nomeTecnico ?? ''})`} aoTocar={confirmarSaida} />
    </ScrollView>
  );
}

export default function TelaClube() {
  const { pronta, semConexao, visao, meuClube, recarregar } = useLiga();
  const [outraLiga, setOutraLiga] = useState(false);

  // Os jogos acontecem no servidor: ao voltar para a tela, busca o que mudou.
  useFocusEffect(useCallback(() => {
    recarregar();
  }, [recarregar]));

  if (!pronta) return <Carregando />;
  if (semConexao && !visao) {
    return (
      <View style={estilos.semConexao}>
        <Aviso texto={t.erroConexao} />
        <Botao texto={t.tentarDeNovo} aoTocar={recarregar} />
      </View>
    );
  }
  if (!visao || !meuClube || outraLiga) {
    return <Formularios aoVoltar={visao && meuClube ? () => setOutraLiga(false) : undefined} />;
  }
  return <Painel visao={visao} clube={meuClube} aoOutraLiga={() => setOutraLiga(true)} />;
}

const estilos = StyleSheet.create({
  tela: { padding: espaco.m, gap: espaco.m },
  flex: { flex: 1 },
  semConexao: { flex: 1, padding: espaco.m, justifyContent: 'center' },
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
  separador: { height: StyleSheet.hairlineWidth, backgroundColor: cores.borda, marginVertical: espaco.p },
  codigo: { color: cores.texto, fontSize: 30, fontWeight: '800', letterSpacing: 4, textAlign: 'center' },
  textoDecisao: { color: cores.texto, fontSize: 15, lineHeight: 21 },
  linhaBotoes: { flexDirection: 'row', gap: espaco.p },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: espaco.m },
  cartao: { backgroundColor: cores.cartao, borderRadius: 14, padding: espaco.m, gap: espaco.m },
  campeao: { color: cores.texto, fontSize: 20, fontWeight: '800' },
  confronto: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lado: { flex: 1, alignItems: 'center', gap: 6 },
  nomeClube: { color: cores.texto, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  placar: { color: cores.texto, fontSize: 24, fontWeight: '800', paddingHorizontal: espaco.p },
});
