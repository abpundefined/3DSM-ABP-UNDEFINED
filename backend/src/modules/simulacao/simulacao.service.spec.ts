jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { NotFoundException } from "@nestjs/common";
import { SimulacaoRepository } from "./simulacao.repository";
import { SimulacaoService } from "./simulacao.service";

describe("SimulacaoService", () => {
  const inicio = new Date("2026-11-10T12:00:00.000Z");
  const fim = new Date("2026-11-11T12:00:00.000Z");

  function criar(sobrescrever: Partial<Record<string, jest.Mock>> = {}) {
    const repository = {
      buscarServico: jest.fn().mockResolvedValue({
        id: 3,
        nome: "api-pagamentos",
        regiaoCodigo: "us-east",
      }),
      somarEnergia: jest.fn().mockResolvedValue({ energiaKwh: 2, coletas: 10 }),
      listarRegioes: jest.fn().mockResolvedValue([
        {
          codigo: "br-sudeste",
          pais: "Brasil",
          regiao: "Sudeste",
          cidade: "São Paulo",
        },
        {
          codigo: "ca-central",
          pais: "Canadá",
          regiao: "Ontário",
          cidade: null,
        },
        {
          codigo: "us-east",
          pais: "Estados Unidos",
          regiao: "Virgínia",
          cidade: null,
        },
      ]),
      mediaIntensidadePorRegiao: jest.fn().mockResolvedValue([
        { regiaoCodigo: "us-east", intensidadeMedia: 400, amostras: 20 },
        { regiaoCodigo: "br-sudeste", intensidadeMedia: 100, amostras: 8 },
      ]),
      ...sobrescrever,
    };

    return {
      repository,
      service: new SimulacaoService(
        repository as unknown as SimulacaoRepository,
      ),
    };
  }

  it("monta a simulação com o período, o serviço e as regiões", async () => {
    const { service, repository } = criar();

    const resposta = await service.simular(3, inicio, fim);

    expect(repository.somarEnergia).toHaveBeenCalledWith(3, inicio, fim);
    expect(repository.mediaIntensidadePorRegiao).toHaveBeenCalledWith(
      inicio,
      fim,
    );
    expect(resposta).toEqual({
      periodo: {
        inicio: "2026-11-10T12:00:00.000Z",
        fim: "2026-11-11T12:00:00.000Z",
      },
      servico: {
        servicoId: 3,
        nome: "api-pagamentos",
        regiaoCodigo: "us-east",
      },
      energiaKwh: 2,
      coletasConsideradas: 10,
      emissaoAtualGCo2e: 800,
      melhorRegiaoCodigo: "br-sudeste",
      regioes: [
        {
          codigo: "br-sudeste",
          pais: "Brasil",
          regiao: "Sudeste",
          cidade: "São Paulo",
          intensidadeGCo2ePorKwh: 100,
          amostrasIntensidade: 8,
          emissaoEstimadaGCo2e: 200,
          diferencaGCo2e: -600,
          diferencaPercentual: -75,
          atual: false,
          menorEmissao: true,
        },
        {
          codigo: "us-east",
          pais: "Estados Unidos",
          regiao: "Virgínia",
          cidade: null,
          intensidadeGCo2ePorKwh: 400,
          amostrasIntensidade: 20,
          emissaoEstimadaGCo2e: 800,
          diferencaGCo2e: 0,
          diferencaPercentual: 0,
          atual: true,
          menorEmissao: false,
        },
        {
          codigo: "ca-central",
          pais: "Canadá",
          regiao: "Ontário",
          cidade: null,
          intensidadeGCo2ePorKwh: null,
          amostrasIntensidade: 0,
          emissaoEstimadaGCo2e: null,
          diferencaGCo2e: null,
          diferencaPercentual: null,
          atual: false,
          menorEmissao: false,
        },
      ],
    });
  });

  it("serviço inexistente gera 404 sem consultar as coletas", async () => {
    const { service, repository } = criar({
      buscarServico: jest.fn().mockResolvedValue(null),
    });

    await expect(service.simular(99, inicio, fim)).rejects.toThrow(
      NotFoundException,
    );
    expect(repository.somarEnergia).not.toHaveBeenCalled();
  });

  it("sem coleta calculada no período, devolve energia nula e nenhum destaque", async () => {
    const { service } = criar({
      somarEnergia: jest
        .fn()
        .mockResolvedValue({ energiaKwh: null, coletas: 0 }),
    });

    const resposta = await service.simular(3, inicio, fim);

    expect(resposta.energiaKwh).toBeNull();
    expect(resposta.coletasConsideradas).toBe(0);
    expect(resposta.melhorRegiaoCodigo).toBeNull();
    expect(resposta.regioes.every((r) => r.emissaoEstimadaGCo2e === null)).toBe(
      true,
    );
  });
});
