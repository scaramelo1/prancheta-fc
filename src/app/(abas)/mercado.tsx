import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Aviso, Botao, Carregando, Chip } from '../../componentes/ui';
import { clubePorId } from '../../dominio/liga';
import type { Clube, Jogador, Leilao, Liga } from '../../dominio/tipos';
import { leiloesDe, precoDeVenda, proximoLance, saldoLivre } from '../../dominio/transferencias';
import { useLiga } from '../../hooks/useLiga';
import { t } from '../../i18n';
import { cores, espaco } from '../../tema';

type Aba = 'comprar' | 'leiloes' | 'vender';
const ABAS: Aba[] = ['comprar', 'leiloes', 'vender'];

const confirmar = (mensagem: string, acao: () => void) => Alert.alert(mensagem, undefined, [
  { text: t.cancelar, style: 'cancel' },
  { text: t.confirmar, onPress: acao },
]);

function CartaoJogador({ jogador, children }: { jogador: Jogador; children: ReactNode }) {
  return (
    <View style={estilos.cartao}>
      <View style={estilos.topo}>
        <Text style={estilos.posicao}>{t.posicoes[jogador.posicao]}</Text>
        <View style={estilos.flex}>
          <Text style={estilos.nome} numberOfLines={1}>{jogador.nome}</Text>
          <Text style={estilos.detalhe}>{t.dadosJogador(jogador.idade, jogador.potencial)}</Text>
        </View>
        <Text accessibilityLabel={t.nivelJogador(jogador.forca)} style={estilos.nivel}>{jogador.forca}</Text>
      </View>
      {children}
    </View>
  );
}

function ListaComprar() {
  const { visao, comprar } = useLiga();
  const ofertas = visao?.mercado ?? [];
  if (ofertas.length === 0) return <Aviso texto={t.semOfertas} />;
  return (
    <>
      <Text style={estilos.ajuda}>{t.mercadoAjuda}</Text>
      {ofertas.map(({ jogador, clubeNome, preco }) => {
        const valor = preco.toLocaleString();
        return (
          <CartaoJogador key={jogador.id} jogador={jogador}>
            <Text style={estilos.detalhe}>{t.ofertaDe(clubeNome)}</Text>
            <Botao
              texto={t.comprarPor(valor)}
              aoTocar={() => confirmar(t.confirmarCompra(jogador.nome, valor), () => comprar(jogador.id))}
            />
          </CartaoJogador>
        );
      })}
    </>
  );
}

function CartaoLeilao({ leilao, liga, clube }: { leilao: Leilao; liga: Liga; clube: Clube }) {
  const { darLance } = useLiga();
  const vendedor = clubePorId(liga, leilao.vendedorId);
  const jogador = vendedor.elenco.find((j) => j.id === leilao.jogadorId);
  if (!jogador) return null;
  const lance = proximoLance(leilao);
  const valor = lance.toLocaleString();
  const lidero = leilao.lance?.clubeId === clube.id;
  const meu = vendedor.id === clube.id;
  return (
    <CartaoJogador jogador={jogador}>
      <Text style={estilos.detalhe}>{t.ofertaDe(vendedor.nome)} · {t.encerraEm(Math.max(1, leilao.encerraNaData - liga.rodadaAtual))}</Text>
      <Text style={estilos.detalhe}>
        {leilao.lance
          ? t.maiorLance(leilao.lance.valor.toLocaleString(), clubePorId(liga, leilao.lance.clubeId).nome)
          : t.lanceInicial(leilao.inicial.toLocaleString())}
      </Text>
      {meu && <Text style={estilos.destaque}>{t.seuLeilao}</Text>}
      {lidero && <Text style={estilos.destaque}>{t.seuLanceLidera}</Text>}
      {!meu && !lidero && (
        <Botao
          texto={t.lanceDe(valor)}
          desativado={saldoLivre(liga, clube, leilao.jogadorId) < lance}
          aoTocar={() => darLance(jogador.id, lance)}
        />
      )}
    </CartaoJogador>
  );
}

function ListaLeiloes({ liga, clube }: { liga: Liga; clube: Clube }) {
  const leiloes = leiloesDe(liga);
  const historico = liga.transferencias ?? [];
  return (
    <>
      <Text style={estilos.ajuda}>{t.leiloesAjuda}</Text>
      {leiloes.length === 0 && <Text style={estilos.ajuda}>{t.semLeiloes}</Text>}
      {leiloes.map((l) => <CartaoLeilao key={l.jogadorId} leilao={l} liga={liga} clube={clube} />)}
      {historico.length > 0 && <Text style={estilos.secao}>{t.ultimasNegociacoes}</Text>}
      {historico.map((h, i) => (
        <Text key={i} style={estilos.detalhe}>
          {t.negociacao(
            h.jogador,
            clubePorId(liga, h.deId).nome,
            h.paraId === null ? t.foraDaLiga : clubePorId(liga, h.paraId).nome,
            h.valor.toLocaleString(),
          )}
        </Text>
      ))}
    </>
  );
}

function ListaVender({ liga, clube }: { liga: Liga; clube: Clube }) {
  const { vender, leiloar } = useLiga();
  const emLeilao = new Set(leiloesDe(liga).map((l) => l.jogadorId));
  const temTecnicos = liga.clubes.some((c) => c.donoId !== null && c.id !== clube.id);
  const elenco = [...clube.elenco].sort((a, b) => b.forca - a.forca || a.id - b.id);
  return (
    <>
      <Text style={estilos.ajuda}>{t.venderAjuda}</Text>
      {elenco.map((jogador) => {
        const valor = precoDeVenda(jogador).toLocaleString();
        return (
          <CartaoJogador key={jogador.id} jogador={jogador}>
            {emLeilao.has(jogador.id) ? (
              <Text style={estilos.destaque}>{t.emLeilao}</Text>
            ) : (
              <>
                <Botao
                  secundario
                  texto={t.venderPor(valor)}
                  aoTocar={() => confirmar(t.confirmarVenda(jogador.nome, valor), () => vender(jogador.id))}
                />
                {temTecnicos && (
                  <Botao
                    secundario
                    texto={t.leiloar}
                    aoTocar={() => confirmar(t.confirmarLeilao(jogador.nome, valor), () => leiloar(jogador.id))}
                  />
                )}
              </>
            )}
          </CartaoJogador>
        );
      })}
    </>
  );
}

export default function Mercado() {
  const { pronta, liga, meuClube, recarregar } = useLiga();
  const [aba, setAba] = useState<Aba>('comprar');
  const [atualizando, setAtualizando] = useState(false);

  useFocusEffect(useCallback(() => {
    recarregar();
  }, [recarregar]));

  if (!pronta) return <Carregando />;
  if (!liga || !meuClube) return <Aviso texto={t.semLiga} />;

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
      <Text style={estilos.saldo}>{t.saldoLivre(saldoLivre(liga, meuClube))}</Text>
      <Text style={estilos.detalhe}>{t.elencoTotal(meuClube.elenco.length)}</Text>
      <View style={estilos.linhaChips}>
        {ABAS.map((a) => <Chip key={a} texto={t.abasMercado[a]} ativo={a === aba} aoTocar={() => setAba(a)} />)}
      </View>
      {aba === 'comprar' && <ListaComprar />}
      {aba === 'leiloes' && <ListaLeiloes liga={liga} clube={meuClube} />}
      {aba === 'vender' && <ListaVender liga={liga} clube={meuClube} />}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  tela: { padding: espaco.m, gap: espaco.m },
  flex: { flex: 1 },
  saldo: { color: cores.texto, fontSize: 20, fontWeight: '800' },
  secao: { color: cores.texto, fontSize: 15, fontWeight: '700', marginTop: espaco.p },
  ajuda: { color: cores.textoSuave, fontSize: 14, lineHeight: 20 },
  linhaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.p },
  cartao: { backgroundColor: cores.cartao, borderRadius: 14, padding: espaco.m, gap: espaco.p },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  posicao: { color: cores.gramado, fontWeight: '800', fontSize: 13, width: 34 },
  nome: { color: cores.texto, fontSize: 15, fontWeight: '600' },
  detalhe: { color: cores.textoSuave, fontSize: 13 },
  nivel: { color: cores.destaque, fontSize: 20, fontWeight: '800' },
  destaque: { color: cores.destaque, fontSize: 13, fontWeight: '700' },
});
