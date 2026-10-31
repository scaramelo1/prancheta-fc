import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Botao, Carregando, Chip, Escudo } from '../../componentes/ui';
import { clubePorId, partidaDoClube, tabelaDaLiga, temporadaEncerrada } from '../../dominio/liga';
import type { Clube, Dificuldade, Liga } from '../../dominio/tipos';
import { useLiga } from '../../hooks/useLiga';
import { t } from '../../i18n';
import { cores, espaco } from '../../tema';

const TAMANHOS = [10, 16, 20];
const DIFICULDADES: Dificuldade[] = ['facil', 'normal', 'dificil'];

const abrirPartida = (id: number, aoVivo?: boolean) =>
  router.push({ pathname: '/partida/[id]', params: { id: String(id), aoVivo: aoVivo ? '1' : '0' } });

function NovaLiga() {
  const { iniciar } = useLiga();
  const [nome, setNome] = useState('');
  const [tamanho, setTamanho] = useState(16);
  const [dificuldade, setDificuldade] = useState<Dificuldade>('normal');
  const [erro, setErro] = useState(false);

  const comecar = () => {
    const limpo = nome.trim();
    if (limpo.length < 3 || limpo.length > 24) {
      setErro(true);
      return;
    }
    iniciar(limpo, tamanho, dificuldade);
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

      <Text style={estilos.rotulo}>{t.tamanhoLiga}</Text>
      <View style={estilos.linhaChips}>
        {TAMANHOS.map((n) => (
          <Chip key={n} texto={t.clubes(n)} ativo={tamanho === n} aoTocar={() => setTamanho(n)} />
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

function Painel({ liga, clube }: { liga: Liga; clube: Clube }) {
  const { jogar, apagar } = useLiga();
  const tabela = tabelaDaLiga(liga);
  const posicao = tabela.findIndex((l) => l.clubeId === clube.id) + 1;
  const encerrada = temporadaEncerrada(liga);
  const proxima = encerrada ? undefined : partidaDoClube(liga, liga.rodadaAtual, clube.id);
  const ultima = liga.rodadaAtual > 1 ? partidaDoClube(liga, liga.rodadaAtual - 1, clube.id) : undefined;
  const foraIds = new Set(clube.elenco.filter((j) => j.rodadasFora > 0).map((j) => j.id));
  const desfalques = clube.escalacao?.titulares.filter((e) => foraIds.has(e.jogadorId)).length ?? 0;

  const jogarRodada = () => {
    const nova = jogar();
    const partida = nova && proxima ? nova.partidas.find((p) => p.id === proxima.id) : undefined;
    if (partida) abrirPartida(partida.id, true);
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
        </View>
      </View>

      {encerrada && (
        <View style={estilos.cartao}>
          <Text style={estilos.rotuloCartao}>{t.temporadaFim}</Text>
          <Text style={estilos.campeao}>{t.campeao(clubePorId(liga, tabela[0].clubeId).nome)}</Text>
          <Text style={estilos.suave}>{t.suaPosicao(posicao)}</Text>
        </View>
      )}

      {proxima && (
        <View style={estilos.cartao}>
          <Text style={estilos.rotuloCartao}>
            {t.rodadaDe(liga.rodadaAtual, liga.totalRodadas)} · {proxima.casaId === clube.id ? t.emCasa : t.foraDeCasa}
          </Text>
          <Confronto casa={clubePorId(liga, proxima.casaId)} fora={clubePorId(liga, proxima.foraId)} placar={t.aguardando} />
          {desfalques > 0 && <Text style={estilos.alerta}>{t.desfalques(desfalques)}</Text>}
          <Botao texto={t.jogarRodada} aoTocar={jogarRodada} />
        </View>
      )}

      {ultima?.resultado && (
        <View style={estilos.cartao}>
          <Text style={estilos.rotuloCartao}>{t.ultimoJogo}</Text>
          <Confronto
            casa={clubePorId(liga, ultima.casaId)}
            fora={clubePorId(liga, ultima.foraId)}
            placar={`${ultima.resultado.golsCasa} x ${ultima.resultado.golsFora}`}
          />
          <Botao secundario texto={t.fimDeJogo} aoTocar={() => abrirPartida(ultima.id)} />
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
