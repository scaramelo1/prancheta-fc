# Prancheta FC

App Android/iOS (Expo) de gerenciamento de futebol: monte o time, escolha a tática e dispute a
temporada contra clubes da máquina. Todos os clubes e jogadores são fictícios.

- **Clube**: cria a liga (10, 16 ou 20 clubes), mostra o próximo jogo e joga a rodada.
- **Elenco**: formação, estilo de jogo e troca de titulares.
- **Tabela**: classificação e resultados por rodada.
- **Partida**: narração minuto a minuto e estatísticas.

## Motor

`src/dominio` é TypeScript puro, sem Expo, para o servidor usar o mesmo código. A semente faz a mesma
partida ter sempre o mesmo resultado. Os clubes da máquina seguem as mesmas regras do humano: a
dificuldade muda só a força dos elencos deles.

`npm run calibrar` simula várias temporadas e mostra gols por jogo, vantagem de casa, cartões e o
equilíbrio entre formações. Referência atual: 2,6 gols por jogo e 44% de vitórias do mandante.

## Situação

Esta primeira etapa roda só no aparelho (expo-sqlite). Ainda faltam servidor, login, ligas de amigos
com convite, transferências e o Mundo Oficial. Os campos `tipo`, `divisao`, `temporada` e `donoId` da
liga já estão no modelo para isso.

## Rodar

```bash
npm install
npx expo install --fix
npx expo start
```

`npm test` roda os testes do domínio e não precisa de `node_modules`.
APK: `npx eas-cli@latest build --profile preview --platform android`.
