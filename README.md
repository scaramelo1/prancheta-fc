# Prancheta FC

App Android/iOS (Expo) de gerenciamento de futebol: monte o time, escolha a tática e dispute a
temporada contra clubes da máquina. Todos os clubes e jogadores são fictícios.

- **Clube**: cria a liga de 20 clubes ou entra por código de convite, mostra o próximo jogo, a decisão
  do dia e o motivo do último resultado.
- **Mercado**: compra de clubes da máquina, venda rápida e leilão entre técnicos.
- **Elenco**: nível do time, formação, estilo de jogo, assistente, energia e troca de titulares.
- **Tabela**: liga, copa, classificação geral e resultados por data.
- **Partida**: narração minuto a minuto, estatísticas e filtro só com os gols.

## Temporada

São 60 dias: 3 torneios de 19 dias e 3 dias de finais, com jogos às 12h, 18h e 21h.

- **Liga**: 38 rodadas por torneio, duas por dia. Os pontos dos 3 torneios formam a classificação geral.
- **Copa**: uma rodada por dia. São 13 rodadas de pontos, e os 8 primeiros jogam quartas, semifinal e
  final em ida e volta, com pênaltis em caso de empate. Os outros 12 jogam 6 rodadas da Copa Prata.
- **Taça dos Campeões**: fecha a temporada com os campeões das ligas, completados pela classificação geral.
- A liga curta, de 1 torneio, dura 19 dias e não tem Taça.

Cada data custa 14 de energia a quem joga e devolve 7 a todos. Lesões tiram de 3 a 12 jogos, e a
folha salarial é paga a cada 7 dias. Na virada da temporada, os jogadores envelhecem, os jovens
evoluem e quem se aposenta dá lugar a um jovem da mesma posição.

## Nível

Cada jogador tem nível de 30 a 100 (campo `forca`, junto com o teto `potencial`). O nível do time, também
de 30 a 100, é a média dos 11 titulares do próximo jogo: quem joga fora de posição vale 70%, e vaga vazia
vale zero. Um time inicial tem nível de 35 a 40. Ele acompanha a escalação, as lesões e a evolução dos jogadores, mas não a energia.

## Estrelas

De 1 a 5, de meia em meia, mostram o auge que o jogador pode alcançar (campo `potencial`) e não mudam
com a idade. Todo jogador que surge é sorteado: Normal, 1 a 2 estrelas (70%); Intermediário, 2,5 a 3
(23%); Raro, 3,5 a 4 (6,5%); Lendário, 4,5 a 5 (0,5%). Até os 28 anos ele sobe um quarto do que falta
até o potencial por temporada. Eles surgem no elenco inicial, na base, quando alguém se aposenta ou a
máquina vende, e na peneira. A peneira é uma decisão do dia: o técnico vê o jovem, as estrelas e o preço
antes de pagar, então não é caixa surpresa.

## Transferências

- **Mercado direto**: a cada dia, cada clube da máquina põe um jogador à venda e vende no máximo esse. O
  preço é 125% do valor, e a máquina repõe a vaga com um jovem da mesma posição.
- **Venda rápida**: paga 75% do valor, e o jogador deixa a liga.
- **Leilão**: só entre técnicos. Dura 6 datas (2 dias) e começa em 75% do valor, para amigos não passarem
  craques de graça. O maior lance fica reservado; sem saldo no fim, o jogador fica onde está.
- O elenco tem de 16 a 30 jogadores e pelo menos um goleiro. Nenhum leilão atravessa a virada da temporada.

## Mundo Oficial

- As ligas são sempre de 20 clubes e formam uma pirâmide: 1 liga na divisão 1, 2 na divisão 2, 4 na 3...
- O técnico entra na divisão mais baixa que existe e assume um clube da máquina, herdando os pontos dele.
  Sem vaga, abre a próxima liga, que joga depressa até alcançar o calendário das outras.
- No fim da temporada, a liga manda os 4 últimos para baixo, 2 para cada liga logo abaixo, e recebe os 2
  primeiros de cada uma. O desempate é a classificação geral. Sem ligas abaixo, ninguém cai.
- Bilheteria e prêmios valem 3 vezes na divisão 1, 2 vezes na 2 e 1,5 vez na 3.
- A máquina se reforça com o próprio saldo para acompanhar os técnicos da liga, sem bônus escondido.
- Técnico sem abrir o app por 120 dias devolve o clube à máquina na virada da temporada.

## Motor

`src/dominio` é TypeScript puro, sem Expo, para o servidor usar o mesmo código. A semente faz a mesma
partida ter sempre o mesmo resultado. Os clubes da máquina seguem as mesmas regras do humano: a
dificuldade muda só a força dos elencos deles.

`npm run calibrar` simula várias temporadas e mostra gols por jogo, vantagem de casa, cartões e o
equilíbrio entre formações. 

## Situação

O jogo é online: a liga fica no servidor, e no aparelho (expo-sqlite) ficam só a conta e a última liga
aberta. Faltam login com a Apple, exclusão de conta e notificações. Os campos `tipo`, `divisao`, `temporada` e `donoId` da
liga já estão no modelo para isso.

## Servidor

`servidor/` usa só o Node 22 (HTTP e SQLite), sem dependências, e reaproveita `src/dominio`. O acesso ao
banco fica na interface `Banco`, em `servidor/banco.ts`: para usar PostgreSQL, basta outra implementação.

- Rodadas às 12h, 18h e 21h de Brasília. Se o servidor cair, as perdidas são jogadas na volta.
- Login com o Google pelo navegador, com o servidor falando com o Google. Só o nome e o identificador
  da conta são guardados; os tokens de sessão ficam só como hash. As credenciais vão em
  `/etc/prancheta-fc.env` (`GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`), fora do repositório.
- Inicie com `npm run servidor`. Na VPS, use `servidor/prancheta-fc.service`, limitado a 150 MB.

## Rodar

```bash
npm install
npx expo install --fix
npx expo start
```

`npm test` roda os testes do domínio e não precisa de `node_modules`.
APK: `npx eas-cli@latest build --profile preview --platform android`.
