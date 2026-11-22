/**
 * Gerador de QR Code conforme ISO/IEC 18004 (modo Byte, correção de erro nível M,
 * versões 1 a 10 — até 213 bytes UTF-8). Zero dependências externas.
 */

export type MatrizQr = {
  versao: number;
  tamanho: number;
  modulos: readonly (readonly boolean[])[];
};

type BlocoConfig = {
  quantidade: number;
  dadosPorBloco: number;
};

type ConfiguracaoVersaoM = {
  versao: number;
  capacidadeBytes: number;
  ecPorBloco: number;
  blocos: readonly BlocoConfig[];
  alinhamento: readonly number[];
};

// Tabelas oficiais ISO/IEC 18004 para nível de correção de erro M (15%)
const VERSOES_M: readonly ConfiguracaoVersaoM[] = [
  {
    versao: 1,
    capacidadeBytes: 14,
    ecPorBloco: 10,
    blocos: [{ quantidade: 1, dadosPorBloco: 16 }],
    alinhamento: [],
  },
  {
    versao: 2,
    capacidadeBytes: 26,
    ecPorBloco: 16,
    blocos: [{ quantidade: 1, dadosPorBloco: 28 }],
    alinhamento: [6, 18],
  },
  {
    versao: 3,
    capacidadeBytes: 42,
    ecPorBloco: 26,
    blocos: [{ quantidade: 1, dadosPorBloco: 44 }],
    alinhamento: [6, 22],
  },
  {
    versao: 4,
    capacidadeBytes: 62,
    ecPorBloco: 18,
    blocos: [{ quantidade: 2, dadosPorBloco: 32 }],
    alinhamento: [6, 26],
  },
  {
    versao: 5,
    capacidadeBytes: 84,
    ecPorBloco: 24,
    blocos: [{ quantidade: 2, dadosPorBloco: 43 }],
    alinhamento: [6, 30],
  },
  {
    versao: 6,
    capacidadeBytes: 106,
    ecPorBloco: 16,
    blocos: [{ quantidade: 4, dadosPorBloco: 27 }],
    alinhamento: [6, 34],
  },
  {
    versao: 7,
    capacidadeBytes: 122,
    ecPorBloco: 18,
    blocos: [{ quantidade: 4, dadosPorBloco: 31 }],
    alinhamento: [6, 22, 38],
  },
  {
    versao: 8,
    capacidadeBytes: 152,
    ecPorBloco: 22,
    blocos: [
      { quantidade: 2, dadosPorBloco: 38 },
      { quantidade: 2, dadosPorBloco: 39 },
    ],
    alinhamento: [6, 24, 42],
  },
  {
    versao: 9,
    capacidadeBytes: 180,
    ecPorBloco: 22,
    blocos: [
      { quantidade: 3, dadosPorBloco: 36 },
      { quantidade: 2, dadosPorBloco: 37 },
    ],
    alinhamento: [6, 26, 46],
  },
  {
    versao: 10,
    capacidadeBytes: 213,
    ecPorBloco: 26,
    blocos: [
      { quantidade: 4, dadosPorBloco: 43 },
      { quantidade: 1, dadosPorBloco: 44 },
    ],
    alinhamento: [6, 28, 50],
  },
];

// Aritmética em GF(256) com polinômio primitivo 0x11d (x^8 + x^4 + x^3 + x^2 + 1)
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(() => {
  let valor = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = valor;
    GF_LOG[valor] = i;
    valor <<= 1;
    if (valor & 0x100) {
      valor ^= 0x11d;
    }
  }
  for (let i = 255; i < 512; i += 1) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMultiplicar(a: number, b: number): number {
  if (a === 0 || b === 0) {
    return 0;
  }
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function polinomioGeradorRs(grau: number): Uint8Array {
  let polinomio: Uint8Array = new Uint8Array([1]);
  for (let i = 0; i < grau; i += 1) {
    const proximo = new Uint8Array(polinomio.length + 1);
    const raiz = GF_EXP[i];
    for (let j = 0; j < polinomio.length; j += 1) {
      proximo[j] ^= polinomio[j];
      proximo[j + 1] ^= gfMultiplicar(polinomio[j], raiz);
    }
    polinomio = proximo;
  }
  return polinomio;
}

export function calcularReedSolomon(
  dados: Uint8Array,
  quantidadeEc: number,
): Uint8Array {
  const gerador = polinomioGeradorRs(quantidadeEc);
  const resto = new Uint8Array(quantidadeEc);

  for (let i = 0; i < dados.length; i += 1) {
    const fator = dados[i] ^ resto[0];
    resto.copyWithin(0, 1);
    resto[quantidadeEc - 1] = 0;
    if (fator !== 0) {
      for (let j = 0; j < quantidadeEc; j += 1) {
        resto[j] ^= gfMultiplicar(gerador[j + 1], fator);
      }
    }
  }

  return resto;
}

// BCH(15,5) para informação de formato (ECC M = 00) + máscara 0x5412
export function calcularBitsFormatoM(mascara: number): number {
  const dados = mascara & 0x07; // ECC M = 00 nos 2 bits mais altos
  let resto = dados << 10;
  for (let bit = 14; bit >= 10; bit -= 1) {
    if ((resto >>> bit) & 1) {
      resto ^= 0x537 << (bit - 10);
    }
  }
  return ((dados << 10) | resto) ^ 0x5412;
}

// BCH(18,6) para informação de versão (versões >= 7)
export function calcularBitsVersao(versao: number): number {
  let resto = versao << 12;
  for (let bit = 17; bit >= 12; bit -= 1) {
    if ((resto >>> bit) & 1) {
      resto ^= 0x1f25 << (bit - 12);
    }
  }
  return (versao << 12) | resto;
}

function codificarFluxoDeDados(
  bytes: Uint8Array,
  config: ConfiguracaoVersaoM,
): Uint8Array {
  const totalBytesDados = config.blocos.reduce(
    (soma, bloco) => soma + bloco.quantidade * bloco.dadosPorBloco,
    0,
  );
  const totalBits = totalBytesDados * 8;
  const bits: number[] = [];

  const adicionarBits = (valor: number, comprimento: number) => {
    for (let i = comprimento - 1; i >= 0; i -= 1) {
      bits.push((valor >>> i) & 1);
    }
  };

  // Modo Byte = 0100
  adicionarBits(0b0100, 4);
  // Quantidade de bytes (8 bits para versões 1-9, 16 bits para versão 10+)
  adicionarBits(bytes.length, config.versao <= 9 ? 8 : 16);
  for (const byte of bytes) {
    adicionarBits(byte, 8);
  }

  // Terminador (até 4 zeros)
  const terminador = Math.min(4, totalBits - bits.length);
  adicionarBits(0, terminador);

  // Alinhamento em múltiplo de 8 bits
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  // Bytes de preenchimento alternados 0xEC e 0x11
  const saida = new Uint8Array(totalBytesDados);
  for (let i = 0; i < bits.length / 8; i += 1) {
    let byte = 0;
    for (let b = 0; b < 8; b += 1) {
      byte = (byte << 1) | bits[i * 8 + b];
    }
    saida[i] = byte;
  }
  const preenchimento = [0xec, 0x11];
  for (let i = bits.length / 8, p = 0; i < totalBytesDados; i += 1, p += 1) {
    saida[i] = preenchimento[p % 2];
  }

  // Divisão em blocos, cálculo RS e intercalação (interleaving)
  const blocosDados: Uint8Array[] = [];
  const blocosEc: Uint8Array[] = [];
  let cursor = 0;
  for (const grupo of config.blocos) {
    for (let i = 0; i < grupo.quantidade; i += 1) {
      const fatia = saida.subarray(cursor, cursor + grupo.dadosPorBloco);
      blocosDados.push(fatia);
      blocosEc.push(calcularReedSolomon(fatia, config.ecPorBloco));
      cursor += grupo.dadosPorBloco;
    }
  }

  const maxDados = Math.max(...blocosDados.map((bloco) => bloco.length));
  const intercalado: number[] = [];

  for (let i = 0; i < maxDados; i += 1) {
    for (const bloco of blocosDados) {
      if (i < bloco.length) {
        intercalado.push(bloco[i]);
      }
    }
  }
  for (let i = 0; i < config.ecPorBloco; i += 1) {
    for (const ec of blocosEc) {
      intercalado.push(ec[i]);
    }
  }

  return Uint8Array.from(intercalado);
}

function criarGradeVazia(tamanho: number) {
  const modulos: boolean[][] = Array.from({ length: tamanho }, () =>
    Array.from({ length: tamanho }, () => false),
  );
  const reservado: boolean[][] = Array.from({ length: tamanho }, () =>
    Array.from({ length: tamanho }, () => false),
  );
  return { modulos, reservado };
}

function posicionarPadraoBusca(
  modulos: boolean[][],
  reservado: boolean[][],
  linhaTopo: number,
  colunaEsq: number,
) {
  const tamanho = modulos.length;
  for (let dy = -1; dy <= 7; dy += 1) {
    for (let dx = -1; dx <= 7; dx += 1) {
      const y = linhaTopo + dy;
      const x = colunaEsq + dx;
      if (y < 0 || y >= tamanho || x < 0 || x >= tamanho) {
        continue;
      }
      const escuro =
        dy >= 0 &&
        dy <= 6 &&
        dx >= 0 &&
        dx <= 6 &&
        (dy === 0 ||
          dy === 6 ||
          dx === 0 ||
          dx === 6 ||
          (dy >= 2 && dy <= 4 && dx >= 2 && dx <= 4));
      modulos[y][x] = escuro;
      reservado[y][x] = true;
    }
  }
}

function posicionarPadraoAlinhamento(
  modulos: boolean[][],
  reservado: boolean[][],
  centroY: number,
  centroX: number,
) {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const dist = Math.max(Math.abs(dy), Math.abs(dx));
      modulos[centroY + dy][centroX + dx] = dist !== 1;
      reservado[centroY + dy][centroX + dx] = true;
    }
  }
}

function escreverFormato(
  modulos: boolean[][],
  reservado: boolean[][],
  bitsFormato: number,
) {
  const tamanho = modulos.length;
  const bit = (indice: number) => ((bitsFormato >>> indice) & 1) === 1;

  // Ao redor do padrão superior esquerdo
  const coordsSuperiorEsq: readonly [number, number][] = [
    [8, 0],
    [8, 1],
    [8, 2],
    [8, 3],
    [8, 4],
    [8, 5],
    [8, 7],
    [8, 8],
    [7, 8],
    [5, 8],
    [4, 8],
    [3, 8],
    [2, 8],
    [1, 8],
    [0, 8],
  ];

  for (let i = 0; i < 15; i += 1) {
    const valor = bit(14 - i);
    const [y, x] = coordsSuperiorEsq[i];
    modulos[y][x] = valor;
    reservado[y][x] = true;
  }

  // Cópia dividida entre inferior esquerdo e superior direito
  for (let i = 0; i < 7; i += 1) {
    const valor = bit(14 - i);
    modulos[tamanho - 1 - i][8] = valor;
    reservado[tamanho - 1 - i][8] = true;
  }
  for (let i = 7; i < 15; i += 1) {
    const valor = bit(14 - i);
    modulos[8][tamanho - 15 + i] = valor;
    reservado[8][tamanho - 15 + i] = true;
  }
}

function escreverVersao(
  modulos: boolean[][],
  reservado: boolean[][],
  versao: number,
) {
  if (versao < 7) {
    return;
  }
  const tamanho = modulos.length;
  const bits = calcularBitsVersao(versao);
  for (let i = 0; i < 18; i += 1) {
    const escuro = ((bits >>> i) & 1) === 1;
    const linha = Math.floor(i / 3);
    const coluna = tamanho - 11 + (i % 3);
    modulos[linha][coluna] = escuro;
    reservado[linha][coluna] = true;
    modulos[coluna][linha] = escuro;
    reservado[coluna][linha] = true;
  }
}

function mascaraAtiva(mascara: number, y: number, x: number): boolean {
  switch (mascara) {
    case 0:
      return (y + x) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (y + x) % 3 === 0;
    case 4:
      return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5:
      return ((y * x) % 2) + ((y * x) % 3) === 0;
    case 6:
      return (((y * x) % 2) + ((y * x) % 3)) % 2 === 0;
    case 7:
      return (((y + x) % 2) + ((y * x) % 3)) % 2 === 0;
    default:
      return false;
  }
}

function calcularPenalidade(modulos: readonly (readonly boolean[])[]): number {
  const n = modulos.length;
  let penalidade = 0;

  // Regra 1: sequências de 5 ou mais módulos iguais em linhas e colunas
  for (let y = 0; y < n; y += 1) {
    let runLinha = 1;
    let runColuna = 1;
    for (let x = 1; x < n; x += 1) {
      if (modulos[y][x] === modulos[y][x - 1]) {
        runLinha += 1;
      } else {
        if (runLinha >= 5) penalidade += 3 + (runLinha - 5);
        runLinha = 1;
      }
      if (modulos[x][y] === modulos[x - 1][y]) {
        runColuna += 1;
      } else {
        if (runColuna >= 5) penalidade += 3 + (runColuna - 5);
        runColuna = 1;
      }
    }
    if (runLinha >= 5) penalidade += 3 + (runLinha - 5);
    if (runColuna >= 5) penalidade += 3 + (runColuna - 5);
  }

  // Regra 2: blocos 2x2 da mesma cor
  for (let y = 0; y < n - 1; y += 1) {
    for (let x = 0; x < n - 1; x += 1) {
      const cor = modulos[y][x];
      if (
        modulos[y][x + 1] === cor &&
        modulos[y + 1][x] === cor &&
        modulos[y + 1][x + 1] === cor
      ) {
        penalidade += 3;
      }
    }
  }

  // Regra 3: padrões semelhantes ao finder (1:1:3:1:1 com 4 claros antes ou depois)
  const ehPadraoFinder = (seq: readonly boolean[], inicio: number) => {
    const a =
      seq[inicio] &&
      !seq[inicio + 1] &&
      seq[inicio + 2] &&
      seq[inicio + 3] &&
      seq[inicio + 4] &&
      !seq[inicio + 5] &&
      seq[inicio + 6] &&
      !seq[inicio + 7] &&
      !seq[inicio + 8] &&
      !seq[inicio + 9] &&
      !seq[inicio + 10];
    const b =
      !seq[inicio] &&
      !seq[inicio + 1] &&
      !seq[inicio + 2] &&
      !seq[inicio + 3] &&
      seq[inicio + 4] &&
      !seq[inicio + 5] &&
      seq[inicio + 6] &&
      seq[inicio + 7] &&
      seq[inicio + 8] &&
      !seq[inicio + 9] &&
      seq[inicio + 10];
    return a || b;
  };

  for (let i = 0; i < n; i += 1) {
    const linha = modulos[i];
    const coluna = Array.from({ length: n }, (_, y) => modulos[y][i]);
    for (let j = 0; j <= n - 11; j += 1) {
      if (ehPadraoFinder(linha, j)) penalidade += 40;
      if (ehPadraoFinder(coluna, j)) penalidade += 40;
    }
  }

  // Regra 4: proporção de módulos escuros próxima de 50%
  let escuros = 0;
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      if (modulos[y][x]) escuros += 1;
    }
  }
  const percentualEscuro = (escuros * 100) / (n * n);
  const desvio = Math.floor(Math.abs(percentualEscuro - 50) / 5);
  penalidade += desvio * 10;

  return penalidade;
}

export function gerarMatrizQr(texto: string): MatrizQr {
  const bytes = new TextEncoder().encode(texto);
  const config = VERSOES_M.find((item) => bytes.length <= item.capacidadeBytes);
  if (!config) {
    throw new RangeError(
      `Texto excede o limite de ${VERSOES_M[VERSOES_M.length - 1].capacidadeBytes} bytes para geração de QR Code.`,
    );
  }

  const tamanho = config.versao * 4 + 17;
  const { modulos: base, reservado } = criarGradeVazia(tamanho);

  // Padrões de busca nos 3 cantos
  posicionarPadraoBusca(base, reservado, 0, 0);
  posicionarPadraoBusca(base, reservado, 0, tamanho - 7);
  posicionarPadraoBusca(base, reservado, tamanho - 7, 0);

  // Padrões de alinhamento (pulando os que sobrepõem os finders)
  for (const cy of config.alinhamento) {
    for (const cx of config.alinhamento) {
      if (!reservado[cy][cx]) {
        posicionarPadraoAlinhamento(base, reservado, cy, cx);
      }
    }
  }

  // Padrões de sincronização (linha 6 e coluna 6)
  for (let i = 8; i < tamanho - 8; i += 1) {
    const escuro = i % 2 === 0;
    if (!reservado[6][i]) {
      base[6][i] = escuro;
      reservado[6][i] = true;
    }
    if (!reservado[i][6]) {
      base[i][6] = escuro;
      reservado[i][6] = true;
    }
  }

  // Módulo escuro fixo
  base[4 * config.versao + 9][8] = true;
  reservado[4 * config.versao + 9][8] = true;

  // Reserva áreas de formato e versão antes de preencher os bits
  escreverFormato(base, reservado, 0);
  escreverVersao(base, reservado, config.versao);

  // Escreve os bits codificados em zigue-zague da direita para a esquerda
  const fluxo = codificarFluxoDeDados(bytes, config);
  let indiceBit = 0;
  let subindo = true;

  for (let coluna = tamanho - 1; coluna >= 1; coluna -= 2) {
    if (coluna === 6) {
      coluna -= 1;
    }
    for (let passo = 0; passo < tamanho; passo += 1) {
      const y = subindo ? tamanho - 1 - passo : passo;
      for (let desloc = 0; desloc < 2; desloc += 1) {
        const x = coluna - desloc;
        if (reservado[y][x]) {
          continue;
        }
        const byteIdx = indiceBit >>> 3;
        const bitIdx = 7 - (indiceBit & 7);
        const valor =
          byteIdx < fluxo.length
            ? ((fluxo[byteIdx] >>> bitIdx) & 1) === 1
            : false;
        base[y][x] = valor;
        indiceBit += 1;
      }
    }
    subindo = !subindo;
  }

  // Seleciona a máscara (0..7) com menor penalidade
  let melhorMatriz = base;
  let menorPenalidade = Number.POSITIVE_INFINITY;

  for (let mascara = 0; mascara < 8; mascara += 1) {
    const candidata = base.map((linha, y) =>
      linha.map((valor, x) =>
        reservado[y][x] ? valor : mascaraAtiva(mascara, y, x) ? !valor : valor,
      ),
    );
    escreverFormato(candidata, reservado, calcularBitsFormatoM(mascara));
    const penalidade = calcularPenalidade(candidata);
    if (penalidade < menorPenalidade) {
      menorPenalidade = penalidade;
      melhorMatriz = candidata;
    }
  }

  return {
    versao: config.versao,
    tamanho,
    modulos: melhorMatriz,
  };
}

export function gerarPathQr(matriz: MatrizQr, margem = 4): string {
  const comandos: string[] = [];
  for (let y = 0; y < matriz.tamanho; y += 1) {
    const linha = matriz.modulos[y];
    let x = 0;
    while (x < matriz.tamanho) {
      if (!linha[x]) {
        x += 1;
        continue;
      }
      const inicio = x;
      while (x < matriz.tamanho && linha[x]) {
        x += 1;
      }
      const largura = x - inicio;
      comandos.push(
        `M${inicio + margem} ${y + margem}h${largura}v1h-${largura}z`,
      );
    }
  }
  return comandos.join('');
}
