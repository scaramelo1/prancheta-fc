import { combinarSementes, criarRng, embaralhar, escolher, inteiro } from './aleatorio.ts';
import type { Rng } from './aleatorio.ts';
import { limitarNivel } from './escalacao.ts';
import { sortearPotencial } from './estrelas.ts';
import type { Clube, Dificuldade, Jogador, Personalidade, Posicao } from './tipos.ts';

// Tudo fictício: nenhum clube ou jogador real, para não depender de licenças.
const NOMES = [
  'Adriano', 'Alan', 'Anderson', 'Arthur', 'Bruno', 'Caio', 'Cauã', 'Cristian', 'Daniel', 'Danilo', 'Davi', 'Diego',
  'Douglas', 'Eduardo', 'Elias', 'Emerson', 'Enzo', 'Erick', 'Fábio', 'Felipe', 'Fernando', 'Gabriel', 'Gilberto',
  'Guilherme', 'Gustavo', 'Heitor', 'Henrique', 'Hugo', 'Igor', 'Isaque', 'Jefferson', 'João', 'Jonas', 'Jorge',
  'Júlio', 'Kauê', 'Leandro', 'Leonardo', 'Lucas', 'Luan', 'Luís', 'Marcelo', 'Marcos', 'Mateus', 'Miguel', 'Murilo',
  'Natan', 'Nicolas', 'Otávio', 'Paulo', 'Pedro', 'Rafael', 'Renan', 'Ricardo', 'Robson', 'Rodrigo', 'Samuel',
  'Sérgio', 'Thiago', 'Tomás', 'Vinícius', 'Vítor', 'Wallace', 'Wesley', 'Yuri',
];
const SOBRENOMES = [
  'Almeida', 'Alves', 'Andrade', 'Araújo', 'Barbosa', 'Barros', 'Batista', 'Borges', 'Braga', 'Cardoso', 'Carvalho',
  'Castro', 'Correia', 'Costa', 'Cunha', 'Dias', 'Duarte', 'Farias', 'Ferreira', 'Fonseca', 'Freitas', 'Garcia',
  'Gomes', 'Guimarães', 'Lima', 'Lopes', 'Macedo', 'Machado', 'Marques', 'Martins', 'Medeiros', 'Mendes', 'Monteiro',
  'Moraes', 'Moreira', 'Moura', 'Nascimento', 'Neves', 'Nogueira', 'Nunes', 'Oliveira', 'Pacheco', 'Paiva', 'Peixoto',
  'Pereira', 'Pinto', 'Prado', 'Queiroz', 'Ramos', 'Reis', 'Rezende', 'Ribeiro', 'Rocha', 'Rodrigues', 'Sales',
  'Santana', 'Santos', 'Silva', 'Siqueira', 'Soares', 'Sousa', 'Tavares', 'Teixeira', 'Vieira',
];
const CIDADES = [
  'Vila Serena', 'Porto Azul', 'Serra Alta', 'Campo Dourado', 'Rio Claro do Sul', 'Monte Verde Novo', 'Lagoa Funda',
  'Bela Aurora', 'Vale do Sol', 'Pedra Branca do Norte', 'Nova Esperança do Vale', 'Ouro Alto', 'Baía Mansa',
  'Cerro Largo do Leste', 'Santa Brisa', 'Três Colinas', 'Barra Nova', 'Alto da Mata', 'Costa Serena', 'Ponte Velha',
  'Campos da Aurora', 'Riacho Grande do Oeste', 'São Bento da Serra', 'Mirante do Sul',
];
const PREFIXOS = ['Atlético', 'Esporte Clube', 'União', 'Sport', 'Associação', 'Grêmio Recreativo', 'Operário', 'Ferroviário'];
const CORES = [
  '#E53935', '#1E88E5', '#43A047', '#FDD835', '#8E24AA', '#FB8C00', '#00ACC1', '#D81B60', '#6D4C41', '#3949AB',
  '#7CB342', '#F4511E', '#00897B', '#C0CA33', '#5E35B1', '#FFB300', '#039BE5', '#546E7A', '#EC407A', '#26A69A',
];
const PERSONALIDADES: Personalidade[] = ['retranqueiro', 'equilibrado', 'ofensivo', 'formador'];

const ELENCO: [Posicao, number][] = [['GOL', 2], ['DEF', 7], ['MEI', 7], ['ATA', 6]];
// A média dos titulares fica uns 2 pontos acima da base: um time inicial tem nível de 35 a 40.
const FORCA_BASE: Record<Dificuldade, number> = { facil: 34, normal: 35, dificil: 36 };
const FORCA_HUMANO = 35;
/** Distância entre o clube mais fraco e o mais forte da máquina em uma liga. */
const AMPLITUDE = 2;

export function gerarSigla(nome: string) {
  const palavras = nome.split(' ').filter((p) => p.length > 2);
  const sigla = palavras.length >= 3
    ? palavras.slice(0, 3).map((p) => p[0]).join('')
    : (palavras[palavras.length - 1] ?? nome).slice(0, 3);
  return sigla.toUpperCase();
}

export const CLUBES_POR_LIGA = 20;
/** Até esta idade o jogador ainda cresce em direção ao potencial. */
export const IDADE_LIMITE_DE_EVOLUCAO = 28;
const SALDO_INICIAL = 2_000_000;

export const gerarNome = (rng: Rng) => `${escolher(rng, NOMES)} ${escolher(rng, SOBRENOMES)}`;

/** Sai da base no piso da escala, seja qual for a raridade: um lendário ainda precisa crescer. */
export function gerarJovem(rng: Rng, id: number, posicao: Posicao): Jogador {
  const forca = inteiro(rng, 30, 38);
  return {
    id,
    nome: gerarNome(rng),
    posicao,
    idade: inteiro(rng, 17, 19),
    forca,
    potencial: sortearPotencial(rng, forca),
    energia: 100,
    rodadasFora: 0,
  };
}

function gerarElenco(rng: Rng, proximoId: () => number, forcaBase: number, jovem: boolean): Jogador[] {
  const elenco: Jogador[] = [];
  for (const [posicao, quantidade] of ELENCO) {
    for (let i = 0; i < quantidade; i++) {
      const idade = jovem ? inteiro(rng, 17, 25) : inteiro(rng, 19, 35);
      const forca = limitarNivel(forcaBase + inteiro(rng, -5, 5));
      elenco.push({
        id: proximoId(),
        nome: gerarNome(rng),
        posicao,
        idade,
        forca,
        potencial: idade <= IDADE_LIMITE_DE_EVOLUCAO ? sortearPotencial(rng, forca) : forca,
        energia: 100,
        rodadasFora: 0,
      });
    }
  }
  return elenco;
}

export interface OpcoesClubes {
  nomeClube: string;
  donoId: string;
  dificuldade: Dificuldade;
  semente: number;
}

/** O humano sempre é o clube 0; as outras vagas viram clubes da máquina, do mais fraco ao mais forte. */
export function gerarClubes({ nomeClube, donoId, dificuldade, semente }: OpcoesClubes): Clube[] {
  const rng = criarRng(combinarSementes(semente, 1));
  let ultimoId = 0;
  const proximoId = () => ++ultimoId;
  const cidades = embaralhar(rng, CIDADES);
  const cores = embaralhar(rng, CORES);
  const nomeLimpo = nomeClube.trim();

  const clubes: Clube[] = [{
    id: 0,
    nome: nomeLimpo,
    sigla: gerarSigla(nomeLimpo),
    cor: cores[0],
    donoId,
    personalidade: null,
    elenco: gerarElenco(rng, proximoId, FORCA_HUMANO, false),
    escalacao: null,
    assistente: true,
    saldo: SALDO_INICIAL,
  }];

  const maquinas = CLUBES_POR_LIGA - 1;
  for (let i = 0; i < maquinas; i++) {
    const nome = `${escolher(rng, PREFIXOS)} ${cidades[i]}`;
    const personalidade = PERSONALIDADES[i % PERSONALIDADES.length];
    const forca = FORCA_BASE[dificuldade] - AMPLITUDE / 2 + (AMPLITUDE * i) / Math.max(1, maquinas - 1);
    clubes.push({
      id: i + 1,
      nome,
      sigla: gerarSigla(cidades[i]),
      cor: cores[(i + 1) % cores.length],
      donoId: null,
      personalidade,
      elenco: gerarElenco(rng, proximoId, Math.round(forca), personalidade === 'formador'),
      escalacao: null,
      assistente: true,
      saldo: SALDO_INICIAL,
    });
  }
  return clubes;
}
