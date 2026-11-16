import { simularRegioes } from "./simulacao-regiao";

describe("simularRegioes", () => {
  const regioes = [
    { codigo: "us-east", intensidadeGCo2ePorKwh: 400 },
    { codigo: "br-sudeste", intensidadeGCo2ePorKwh: 100 },
    { codigo: "eu-west", intensidadeGCo2ePorKwh: 300 },
  ];

  it("estima a emissão de cada região e a diferença em g e em % para a atual", () => {
    const resultado = simularRegioes(2, "us-east", regioes);

    expect(resultado.emissaoAtualGCo2e).toBe(800);
    expect(resultado.regioes).toEqual([
      {
        codigo: "br-sudeste",
        intensidadeGCo2ePorKwh: 100,
        emissaoEstimadaGCo2e: 200,
        diferencaGCo2e: -600,
        diferencaPercentual: -75,
        atual: false,
        menorEmissao: true,
      },
      {
        codigo: "eu-west",
        intensidadeGCo2ePorKwh: 300,
        emissaoEstimadaGCo2e: 600,
        diferencaGCo2e: -200,
        diferencaPercentual: -25,
        atual: false,
        menorEmissao: false,
      },
      {
        codigo: "us-east",
        intensidadeGCo2ePorKwh: 400,
        emissaoEstimadaGCo2e: 800,
        diferencaGCo2e: 0,
        diferencaPercentual: 0,
        atual: true,
        menorEmissao: false,
      },
    ]);
    expect(resultado.melhorRegiaoCodigo).toBe("br-sudeste");
  });

  it("mostra aumento positivo quando a outra região é mais suja", () => {
    const resultado = simularRegioes(1, "br-sudeste", regioes);
    const usEast = resultado.regioes.find((r) => r.codigo === "us-east");

    expect(usEast?.diferencaGCo2e).toBe(300);
    expect(usEast?.diferencaPercentual).toBe(300);
    expect(resultado.melhorRegiaoCodigo).toBe("br-sudeste");
  });

  it("região igual à atual tem diferença zero e é a melhor quando já é a mais limpa", () => {
    const resultado = simularRegioes(5, "br-sudeste", regioes);
    const atual = resultado.regioes.find((r) => r.atual);

    expect(atual).toMatchObject({
      codigo: "br-sudeste",
      diferencaGCo2e: 0,
      diferencaPercentual: 0,
      menorEmissao: true,
    });
  });

  it("região sem intensidade fica sem estimativa, no fim da lista e fora do destaque", () => {
    const resultado = simularRegioes(2, "us-east", [
      ...regioes,
      { codigo: "ap-south", intensidadeGCo2ePorKwh: null },
    ]);
    const ultima = resultado.regioes[resultado.regioes.length - 1];

    expect(ultima).toEqual({
      codigo: "ap-south",
      intensidadeGCo2ePorKwh: null,
      emissaoEstimadaGCo2e: null,
      diferencaGCo2e: null,
      diferencaPercentual: null,
      atual: false,
      menorEmissao: false,
    });
  });

  it("sem intensidade na região atual, estima as outras mas não calcula diferença", () => {
    const resultado = simularRegioes(2, "ap-south", [
      ...regioes,
      { codigo: "ap-south", intensidadeGCo2ePorKwh: null },
    ]);
    const brasil = resultado.regioes.find((r) => r.codigo === "br-sudeste");

    expect(resultado.emissaoAtualGCo2e).toBeNull();
    expect(brasil).toMatchObject({
      emissaoEstimadaGCo2e: 200,
      diferencaGCo2e: null,
      diferencaPercentual: null,
      menorEmissao: true,
    });
  });

  it("sem nenhuma intensidade conhecida não destaca região", () => {
    const resultado = simularRegioes(2, "us-east", [
      { codigo: "us-east", intensidadeGCo2ePorKwh: null },
    ]);

    expect(resultado.melhorRegiaoCodigo).toBeNull();
    expect(resultado.regioes[0].menorEmissao).toBe(false);
  });

  it("sem energia no período não estima nada nem destaca região", () => {
    const resultado = simularRegioes(null, "us-east", regioes);

    expect(resultado.emissaoAtualGCo2e).toBeNull();
    expect(resultado.melhorRegiaoCodigo).toBeNull();
    expect(resultado.regioes.map((r) => r.codigo)).toEqual([
      "br-sudeste",
      "eu-west",
      "us-east",
    ]);
    expect(
      resultado.regioes.every(
        (r) => r.emissaoEstimadaGCo2e === null && !r.menorEmissao,
      ),
    ).toBe(true);
  });

  it("energia zero estima zero, sem percentual e sem destaque", () => {
    const resultado = simularRegioes(0, "us-east", regioes);
    const brasil = resultado.regioes.find((r) => r.codigo === "br-sudeste");

    expect(resultado.emissaoAtualGCo2e).toBe(0);
    expect(brasil).toMatchObject({
      emissaoEstimadaGCo2e: 0,
      diferencaGCo2e: 0,
      diferencaPercentual: null,
      menorEmissao: false,
    });
    expect(resultado.melhorRegiaoCodigo).toBeNull();
  });

  it("ignora valores inválidos (negativos, NaN, infinito)", () => {
    const resultado = simularRegioes(2, "us-east", [
      { codigo: "us-east", intensidadeGCo2ePorKwh: 400 },
      { codigo: "x-neg", intensidadeGCo2ePorKwh: -10 },
      { codigo: "x-nan", intensidadeGCo2ePorKwh: Number.NaN },
    ]);

    expect(
      resultado.regioes
        .filter((r) => r.codigo.startsWith("x-"))
        .map((r) => r.emissaoEstimadaGCo2e),
    ).toEqual([null, null]);
    expect(simularRegioes(-1, "us-east", regioes).emissaoAtualGCo2e).toBeNull();
    expect(
      simularRegioes(Number.POSITIVE_INFINITY, "us-east", regioes)
        .melhorRegiaoCodigo,
    ).toBeNull();
  });

  it("no empate de intensidade, prefere a região atual e depois o código", () => {
    const empate = [
      { codigo: "b", intensidadeGCo2ePorKwh: 100 },
      { codigo: "a", intensidadeGCo2ePorKwh: 100 },
      { codigo: "c", intensidadeGCo2ePorKwh: 100 },
    ];

    expect(simularRegioes(1, "c", empate).melhorRegiaoCodigo).toBe("c");
    expect(simularRegioes(1, "z", empate).regioes.map((r) => r.codigo)).toEqual(
      ["a", "b", "c"],
    );
    expect(simularRegioes(1, "z", empate).melhorRegiaoCodigo).toBe("a");
  });

  it("não altera a lista recebida", () => {
    const entrada = [...regioes];
    simularRegioes(2, "us-east", entrada);

    expect(entrada).toEqual(regioes);
  });
});
