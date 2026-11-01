import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import type { ResumoLiga, VisaoLiga } from '../../api/cliente';
import { Aviso, Botao, Carregando, Escudo, Estrelas } from '../../componentes/ui';
import { diaDaData, horarioDaData } from '../../dominio/calendario';
import { nivelDoTime } from '../../dominio/escalacao';
import { estrelasDe } from '../../dominio/estrelas';
import {
  clubePorId, partidaDoClube, tabelaDaCompeticao, tabelaGeral, temporadaEncerrada, torneioAtual, ultimaPartidaDoClube,
} from '../../dominio/liga';
import { numeroDaDivisao } from '../../dominio/mundo';
import { explicarPartida } from '../../dominio/resumo';
import type { Clube, Partida } from '../../dominio/tipos';
import { useLiga } from '../../hooks/useLiga';
import { t } from '../../i18n';
import { cores, espaco } from '../../tema';

const TAMANHO_CODIGO = 6;

const abrirPartida = (id: number) =>
  router.push({ pathname: '/partida/[id]', params: { id: String(id), aoVivo: '1' } });

const nomeValido = (nome: string) => nome.trim().length >= 3 && nome.trim().length <= 24;

/** O técnico tem um time só: ele é criado aqui uma vez e joga todas as ligas. */
function CriarTime() {
  const { criarTime } = useLiga();
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (!nomeValido(nome)) {
      setErro(t.erroNome);
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await criarTime(nome);
    } catch (falha) {
      setErro((falha as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={estilos.tela} keyboardShouldPersistTaps="handled">
      <Image source={require('../../../assets/splash-icon.png')} style={estilos.logo} contentFit="contain" />
      <Text style={estilos.titulo}>{t.criarTimeTitulo}</Text>
      <Text style={estilos.suave}>{t.criarTimeTexto}</Text>
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
      <Botao texto={t.criarTime} desativado={enviando} aoTocar={enviar} />
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

function CartaoAmigos({ resumo }: { resumo: ResumoLiga }) {
  const { iniciarAmigos } = useLiga();
  const iniciar = () => {
    iniciarAmigos(resumo.id).catch((falha: unknown) => Alert.alert((falha as Error).message));
  };
  return (
    <View style={estilos.cartao}>
      <Text style={estilos.rotuloCartao}>{t.ligaAmigos(resumo.codigo)} · {t.tecnicos(resumo.tecnicos)}</Text>
      <Text style={estilos.suave}>{resumo.iniciada && resumo.situacao ? t.situacoes[resumo.situacao] : t.conviteTexto(resumo.codigo)}</Text>
      {!resumo.iniciada && (
        <Botao secundario texto={t.compartilhar} aoTocar={() => Share.share({ message: t.mensagemConvite(resumo.codigo) })} />
      )}
      {!resumo.iniciada && resumo.souDono && (
        <>
          <Text style={estilos.suave}>{t.iniciarAviso}</Text>
          <Botao texto={t.iniciarLiga} aoTocar={iniciar} />
        </>
      )}
      {!resumo.iniciada && !resumo.souDono && <Text style={estilos.alerta}>{t.aguardandoDono}</Text>}
    </View>
  );
}

function LigasDeAmigos() {
  const { criarAmigos, entrarAmigos, ligas } = useLiga();
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (acao: () => Promise<void>) => {
    setEnviando(true);
    setErro(null);
    try {
      await acao();
      setCodigo('');
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
    enviar(() => entrarAmigos(codigo));
  };

  return (
    <>
      <Text style={estilos.titulo}>{t.amigosTitulo}</Text>
      <Text style={estilos.suave}>{t.amigosTexto}</Text>
      {ligas.filter((l) => l.tipo === 'amigos').map((l) => <CartaoAmigos key={l.id} resumo={l} />)}
      <Botao texto={t.criarLiga} desativado={enviando} aoTocar={() => enviar(criarAmigos)} />
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
      {erro && <Text style={estilos.erro}>{erro}</Text>}
      <Botao secundario texto={t.entrarLiga} desativado={enviando} aoTocar={entrarComCodigo} />
      <View style={estilos.separador} />
    </>
  );
}

function Painel({ visao, clube }: { visao: VisaoLiga; clube: Clube }) {
  const { decidir, nomeTecnico, recarregar, sair } = useLiga();
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
      <View style={estilos.cabecalho}>
        <Escudo clube={clube} tamanho={56} />
        <View style={estilos.flex}>
          <Text style={estilos.titulo} numberOfLines={1}>{clube.nome}</Text>
          <Text style={estilos.rotuloCartao}>{t.divisaoGrupo(numeroDaDivisao(liga), liga.grupo ?? 0)}</Text>
          <Text style={estilos.suave}>{t.posicaoAtual(posicao, tabela[posicao - 1].pontos)}</Text>
          <Text style={estilos.suave}>{t.nivelTime}: {nivelDoTime(clube)}</Text>
          <Text style={estilos.suave}>{t.saldo(clube.saldo.toLocaleString())}</Text>
        </View>
      </View>

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
          <Text style={estilos.textoDecisao}>
            {decisao.tipo === 'peneira'
              ? t.peneira(decisao.jogador ?? '', t.estrelas(estrelasDe(decisao.prospecto?.potencial ?? 0)), decisao.prospecto?.idade ?? 0, (decisao.custo ?? 0).toLocaleString())
              : t.decisoes[decisao.tipo](decisao.jogador ?? '')}
          </Text>
          {decisao.prospecto && <Estrelas potencial={decisao.prospecto.potencial} tamanho={18} />}
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

      <LigasDeAmigos />
      <Botao secundario texto={`${t.sair} (${nomeTecnico ?? ''})`} aoTocar={confirmarSaida} />
    </ScrollView>
  );
}

export default function TelaClube() {
  const { pronta, semConexao, visao, meuClube, recarregar } = useLiga();

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
  if (!visao || !meuClube) return <CriarTime />;
  return <Painel visao={visao} clube={meuClube} />;
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
