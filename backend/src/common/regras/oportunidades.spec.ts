import {
  avaliarMigracaoRegiao,
  avaliarMudancaHorario,
  avaliarSuperdimensionamento,
  calcularMedianaEnergia,
  gerarOportunidades,
  LIMIARES_OPORTUNIDADES,
  type CelulaHorarioRegiao,
  type RegiaoParaOportunidade,
  type ServicoParaOportunidade,
} from "./oportunidades";

const regioesBase: RegiaoParaOportunidade[] = [
  {
    codigo: "jp-east",
    rotulo: "Japão · Tóquio",
    intensidadeMediaGCo2ePorKwh: 500,
  },
  {
    codigo: "us-east",
    rotulo: "Estados Unidos · Ashburn",
    intensidadeMediaGCo2ePorKwh: 400,
  },
  {
    codigo: "br-sudeste",
    rotulo: "Brasil · São Paulo",
    intensidadeMediaGCo2ePorKwh: 100,
  },
];

function servico(
  sobrescrever: Partial<ServicoParaOportunidade> = {},
): ServicoParaOportunidade {
  return {
    servicoId: 1,
    nome: "Media CDN",
    estadoAtual: "DISPONIVEL",
    regiaoCodigo: "jp-east",
    energiaKwh: 0.2,
    emissaoGCo2e: 100,
    cpuMediaPercent: 45,
    ...sobrescrever,
  };
}

describe("Regras puras de oportunidades de redução de emissão", () => {
  describe("calcularMedianaEnergia", () => {
    it("calcula mediana para listas ímpares, pares e retorna null sem dados válidos", () => {
      expect(calcularMedianaEnergia([0.1, 0.5, 0.2])).toBe(0.2);
      expect(calcularMedianaEnergia([0.1, 0.5, 0.2, 0.4])).toBeCloseTo(0.3, 6);
      expect(calcularMedianaEnergia([null, 0, -1, undefined])).toBeNull();
    });
  });

  describe("Regra 1: Migrar de região (> 20%)", () => {
    it("dispara quando a redução supera 20% e aplica emissão × (1 - melhor/atual)", () => {
      const resultado = avaliarMigracaoRegiao(servico(), regioesBase);

      expect(resultado).not.toBeNull();
      expect(resultado?.tipo).toBe("MIGRAR_REGIAO");
      expect(resultado?.economiaPercentual).toBe(80);
      expect(resultado?.economiaEstimadaGCo2e).toBe(80);
      expect(resultado?.linkDetalhe).toBe("/servicos/1");
      expect(resultado?.explicacao).toContain("Sugestão estimada");
    });

    it("não dispara quando a redução é exatamente 20% ou menor", () => {
      const regioesLimite: RegiaoParaOportunidade[] = [
        {
          codigo: "jp-east",
          rotulo: "Tóquio",
          intensidadeMediaGCo2ePorKwh: 500,
        },
        {
          codigo: "us-east",
          rotulo: "Virgínia",
          intensidadeMediaGCo2ePorKwh: 400,
        },
      ];
      // 1 - 400/500 = 20% (precisa passar de 20%)
      expect(avaliarMigracaoRegiao(servico(), regioesLimite)).toBeNull();
      // Já está na melhor região
      expect(
        avaliarMigracaoRegiao(
          servico({ regiaoCodigo: "br-sudeste" }),
          regioesBase,
        ),
      ).toBeNull();
    });

    it("retorna null sem emissão ou sem intensidade válida", () => {
      expect(
        avaliarMigracaoRegiao(servico({ emissaoGCo2e: null }), regioesBase),
      ).toBeNull();
      expect(
        avaliarMigracaoRegiao(
          servico({ regiaoCodigo: "desconhecida" }),
          regioesBase,
        ),
      ).toBeNull();
      expect(
        avaliarMigracaoRegiao(servico(), [
          {
            codigo: "jp-east",
            rotulo: "Tóquio",
            intensidadeMediaGCo2ePorKwh: 500,
          },
          {
            codigo: "eu-west",
            rotulo: "Dublin",
            intensidadeMediaGCo2ePorKwh: null,
          },
        ]),
      ).toBeNull();
    });
  });

  describe("Regra 2: Possível superdimensionamento (CPU < 15% e energia > mediana)", () => {
    it("dispara quando CPU média está abaixo de 15% e energia está acima da mediana", () => {
      const resultado = avaliarSuperdimensionamento(
        servico({ cpuMediaPercent: 10.5, energiaKwh: 0.5, emissaoGCo2e: 200 }),
        0.2,
      );

      expect(resultado).not.toBeNull();
      expect(resultado?.tipo).toBe("SUPERDIMENSIONAMENTO");
      expect(resultado?.economiaPercentual).toBe(
        LIMIARES_OPORTUNIDADES.reducaoEstimadaSuperdimensionamentoPercentual,
      );
      expect(resultado?.economiaEstimadaGCo2e).toBe(60);
    });

    it("não dispara quando CPU é >= 15% ou energia <= mediana", () => {
      expect(
        avaliarSuperdimensionamento(
          servico({ cpuMediaPercent: 15, energiaKwh: 0.5 }),
          0.2,
        ),
      ).toBeNull();
      expect(
        avaliarSuperdimensionamento(
          servico({ cpuMediaPercent: 10, energiaKwh: 0.2 }),
          0.2,
        ),
      ).toBeNull();
    });

    it("retorna null quando faltam dados de CPU, energia, emissão ou mediana", () => {
      expect(
        avaliarSuperdimensionamento(servico({ cpuMediaPercent: null }), 0.1),
      ).toBeNull();
      expect(
        avaliarSuperdimensionamento(servico({ energiaKwh: null }), 0.1),
      ).toBeNull();
      expect(
        avaliarSuperdimensionamento(servico({ cpuMediaPercent: 8 }), null),
      ).toBeNull();
    });
  });

  describe("Regra 3: Mudar horário (janela 3h >= 20% abaixo da média)", () => {
    const celulasComJanelaLimpa: CelulaHorarioRegiao[] = [
      // Janela limpa 02h-04h de terça (media 150)
      { diaSemana: 2, hora: 2, media: 150, quantidadeAmostras: 10 },
      { diaSemana: 2, hora: 3, media: 150, quantidadeAmostras: 10 },
      { diaSemana: 2, hora: 4, media: 150, quantidadeAmostras: 10 },
      // Resto do dia com intensidade alta (media 350) -> média geral = 250, redução = 40%
      { diaSemana: 2, hora: 14, media: 350, quantidadeAmostras: 10 },
      { diaSemana: 2, hora: 15, media: 350, quantidadeAmostras: 10 },
      { diaSemana: 2, hora: 16, media: 350, quantidadeAmostras: 10 },
    ];

    it("dispara quando há janela contígua de 3h com intensidade pelo menos 20% menor que a média", () => {
      const resultado = avaliarMudancaHorario(
        servico({ emissaoGCo2e: 100 }),
        celulasComJanelaLimpa,
        "Japão · Tóquio",
      );

      expect(resultado).not.toBeNull();
      expect(resultado?.tipo).toBe("MUDAR_HORARIO");
      expect(resultado?.economiaPercentual).toBe(40);
      expect(resultado?.economiaEstimadaGCo2e).toBe(40);
      expect(resultado?.explicacao).toContain("terça-feira (02h–05h)");
    });

    it("não dispara quando a melhor janela tem redução inferior a 20% ou menos de 3h seguidas", () => {
      const celulasProximas: CelulaHorarioRegiao[] = [
        { diaSemana: 1, hora: 2, media: 180, quantidadeAmostras: 10 },
        { diaSemana: 1, hora: 3, media: 180, quantidadeAmostras: 10 },
        { diaSemana: 1, hora: 4, media: 180, quantidadeAmostras: 10 },
        { diaSemana: 1, hora: 14, media: 220, quantidadeAmostras: 10 },
        { diaSemana: 1, hora: 15, media: 220, quantidadeAmostras: 10 },
        { diaSemana: 1, hora: 16, media: 220, quantidadeAmostras: 10 },
      ];
      // média geral = 200, redução = 10% (< 20%)
      expect(avaliarMudancaHorario(servico(), celulasProximas)).toBeNull();

      // Apenas 2 horas seguidas (não forma janela de 3h)
      expect(
        avaliarMudancaHorario(servico(), [
          { diaSemana: 1, hora: 2, media: 100, quantidadeAmostras: 5 },
          { diaSemana: 1, hora: 3, media: 100, quantidadeAmostras: 5 },
          { diaSemana: 1, hora: 10, media: 500, quantidadeAmostras: 5 },
        ]),
      ).toBeNull();
    });

    it("retorna null sem células ou sem emissão válida", () => {
      expect(avaliarMudancaHorario(servico(), [])).toBeNull();
      expect(
        avaliarMudancaHorario(
          servico({ emissaoGCo2e: null }),
          celulasComJanelaLimpa,
        ),
      ).toBeNull();
    });
  });

  describe("gerarOportunidades", () => {
    it("ordena oportunidades pela maior economia e soma o potencial total", () => {
      const servicos: ServicoParaOportunidade[] = [
        servico({
          servicoId: 1,
          nome: "Media CDN",
          regiaoCodigo: "jp-east",
          energiaKwh: 0.4,
          emissaoGCo2e: 200,
          cpuMediaPercent: 10,
        }),
        servico({
          servicoId: 2,
          nome: "Auth Service",
          regiaoCodigo: "br-sudeste",
          energiaKwh: 0.05,
          emissaoGCo2e: 5,
          cpuMediaPercent: 30,
        }),
      ];

      const matriz = new Map<string, CelulaHorarioRegiao[]>([
        [
          "jp-east",
          [
            { diaSemana: 0, hora: 3, media: 150, quantidadeAmostras: 5 },
            { diaSemana: 0, hora: 4, media: 150, quantidadeAmostras: 5 },
            { diaSemana: 0, hora: 5, media: 150, quantidadeAmostras: 5 },
            { diaSemana: 0, hora: 18, media: 350, quantidadeAmostras: 5 },
            { diaSemana: 0, hora: 19, media: 350, quantidadeAmostras: 5 },
            { diaSemana: 0, hora: 20, media: 350, quantidadeAmostras: 5 },
          ],
        ],
      ]);

      const resultado = gerarOportunidades(servicos, regioesBase, matriz);

      expect(resultado.oportunidades.map((item) => item.tipo)).toEqual([
        "MIGRAR_REGIAO",
        "MUDAR_HORARIO",
        "SUPERDIMENSIONAMENTO",
      ]);
      expect(resultado.resumo.totalOportunidades).toBe(3);
      expect(resultado.resumo.reducaoPotencialGCo2e).toBe(160 + 80 + 60);
      expect(resultado.resumo.porTipo).toEqual({
        MIGRAR_REGIAO: 1,
        SUPERDIMENSIONAMENTO: 1,
        MUDAR_HORARIO: 1,
      });
      expect(resultado.aviso).toContain("não representam garantia");
    });
  });
});
