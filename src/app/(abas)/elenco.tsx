import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Aviso, Carregando, Chip } from '../../componentes/ui';
import { LISTA_ESTILOS, LISTA_FORMACOES, melhorEscalacao, nivelDoTime, trocarTitular } from '../../dominio/escalacao';
import type { Escalado, Estilo, Formacao, Jogador } from '../../dominio/tipos';
import { useLiga } from '../../hooks/useLiga';
import { t } from '../../i18n';
import { cores, espaco } from '../../tema';

function LinhaJogador({
  jogador,
  posicao,
  selecionado,
  apagado,
  aoTocar,
}: {
  jogador: Jogador;
  posicao: string;
  selecionado?: boolean;
  apagado?: boolean;
  aoTocar?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!aoTocar}
      onPress={aoTocar}
      style={[estilos.linha, selecionado && estilos.linhaSelecionada, apagado && { opacity: 0.45 }]}
    >
      <Text style={estilos.posicao}>{posicao}</Text>
      <View style={estilos.flex}>
        <Text style={estilos.nome} numberOfLines={1}>{jogador.nome}</Text>
        <Text style={jogador.rodadasFora > 0 ? estilos.fora : estilos.detalhe}>
          {jogador.rodadasFora > 0
            ? t.rodadasFora(jogador.rodadasFora)
            : `${t.idadeAnos(jogador.idade)} · ${t.energia(jogador.energia)}`}
        </Text>
      </View>
      <Text accessibilityLabel={t.nivelJogador(jogador.forca)} style={estilos.forca}>{jogador.forca}</Text>
    </Pressable>
  );
}

export default function Elenco() {
  const { pronta, meuClube, salvarEscalacao } = useLiga();
  const [trocando, setTrocando] = useState<Escalado | null>(null);

  if (!pronta) return <Carregando />;
  if (!meuClube?.escalacao) return <Aviso texto={t.semLiga} />;

  const clube = meuClube;
  const escalacao = meuClube.escalacao;
  const jogadorPorId = (id: number) => clube.elenco.find((j) => j.id === id) as Jogador;
  const idsTitulares = new Set(escalacao.titulares.map((e) => e.jogadorId));
  const reservas = clube.elenco.filter((j) => !idsTitulares.has(j.id));

  const mudarTatica = (formacao: Formacao, estilo: Estilo) => {
    setTrocando(null);
    salvarEscalacao(
      formacao === escalacao.formacao ? { ...escalacao, estilo } : melhorEscalacao(clube, formacao, estilo),
      clube.assistente,
    );
  };

  const entrar = (reserva: Jogador) => {
    if (!trocando) return;
    salvarEscalacao(trocarTitular(escalacao, trocando.jogadorId, reserva.id), false);
    setTrocando(null);
  };

  return (
    <ScrollView contentContainerStyle={estilos.tela}>
      <View style={estilos.nivelTime}>
        <Text style={estilos.secao}>{t.nivelTime}</Text>
        <Text style={estilos.nivelTimeValor}>{nivelDoTime(clube)}</Text>
      </View>
      <Text style={estilos.ajuda}>{t.nivelTimeAjuda}</Text>

      <Text style={estilos.secao}>{t.formacao}</Text>
      <View style={estilos.linhaChips}>
        {LISTA_FORMACOES.map((f) => (
          <Chip key={f} texto={f} ativo={f === escalacao.formacao} aoTocar={() => mudarTatica(f, escalacao.estilo)} />
        ))}
      </View>

      <Text style={estilos.secao}>{t.estilo}</Text>
      <View style={estilos.linhaChips}>
        {LISTA_ESTILOS.map((e) => (
          <Chip key={e} texto={t.estilos[e]} ativo={e === escalacao.estilo} aoTocar={() => mudarTatica(escalacao.formacao, e)} />
        ))}
      </View>

      <Text style={estilos.secao}>{t.assistente}</Text>
      <Text style={estilos.ajuda}>{t.assistenteTexto}</Text>
      <View style={estilos.linhaChips}>
        <Chip
          texto={t.assistente}
          ativo={clube.assistente}
          aoTocar={() => salvarEscalacao(clube.assistente ? escalacao : melhorEscalacao(clube, escalacao.formacao, escalacao.estilo), !clube.assistente)}
        />
      </View>

      <Text style={estilos.secao}>{t.titulares}</Text>
      <Text style={estilos.ajuda}>
        {trocando ? t.ajudaTroca(jogadorPorId(trocando.jogadorId).nome) : t.ajudaEscalacao}
      </Text>
      <View style={estilos.lista}>
        {escalacao.titulares.map((e) => (
          <LinhaJogador
            key={e.jogadorId}
            jogador={jogadorPorId(e.jogadorId)}
            posicao={t.posicoes[e.posicao]}
            selecionado={trocando?.jogadorId === e.jogadorId}
            aoTocar={() => setTrocando(trocando?.jogadorId === e.jogadorId ? null : e)}
          />
        ))}
      </View>

      <Text style={estilos.secao}>{t.reservas}</Text>
      <View style={estilos.lista}>
        {reservas.map((j) => {
          const podeEntrar = trocando?.posicao === j.posicao && j.rodadasFora === 0;
          return (
            <LinhaJogador
              key={j.id}
              jogador={j}
              posicao={t.posicoes[j.posicao]}
              apagado={trocando !== null && !podeEntrar}
              aoTocar={podeEntrar ? () => entrar(j) : undefined}
            />
          );
        })}
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  tela: { padding: espaco.m, gap: espaco.p },
  flex: { flex: 1 },
  secao: { color: cores.texto, fontSize: 16, fontWeight: '700', marginTop: espaco.p },
  ajuda: { color: cores.textoSuave, fontSize: 13 },
  linhaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.p },
  lista: { backgroundColor: cores.cartao, borderRadius: 12, overflow: 'hidden' },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: cores.borda,
  },
  linhaSelecionada: { backgroundColor: cores.borda },
  posicao: { color: cores.gramado, fontWeight: '800', fontSize: 13, width: 34 },
  nome: { color: cores.texto, fontSize: 15, fontWeight: '600' },
  detalhe: { color: cores.textoSuave, fontSize: 12 },
  fora: { color: cores.erro, fontSize: 12 },
  forca: { color: cores.destaque, fontSize: 17, fontWeight: '800' },
  nivelTime: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nivelTimeValor: { color: cores.destaque, fontSize: 28, fontWeight: '800' },
});
