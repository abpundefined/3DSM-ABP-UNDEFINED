jest.mock("@nestjs/config", () => ({ ConfigService: class ConfigService {} }));
jest.mock("./servicos.repository", () => ({
  ServicosRepository: class ServicosRepository {},
}));

import { ConfigService } from "@nestjs/config";
import type { CalculosService } from "../calculos/calculos.service";
import { ServicosRepository } from "./servicos.repository";
import { RegistroIntegracoesService } from "../saude/registro-integracoes.service";
import { ServicosService } from "./servicos.service";

describe("ServicosService.listarServicos", () => {
  const listarComLocalizacao = jest.fn();
  const componentes = {
    cpuW: 0.25,
    memoriaW: 0.75,
    discoW: 0.1,
    redeW: 0.1,
    totalW: 1.2,
  };
  const calcularPotencia = jest.fn().mockReturnValue(componentes);
  const service = new ServicosService(
    { listarComLocalizacao } as unknown as ServicosRepository,
    {} as ConfigService,
    new RegistroIntegracoesService(),
    { calcularPotencia } as unknown as CalculosService,
  );

  const servicoBase = {
    id: 1,
    idExterno: "billing-api",
    nome: "Billing API",
    regiaoCodigo: "br-sudeste",
    caminhoMetricas: "/metrics/billing-api",
    estadoAtual: "DISPONIVEL",
    descobertoEm: new Date("2026-11-01T00:00:00.000Z"),
    ultimaVezListadoEm: new Date("2026-11-08T00:00:00.000Z"),
    atualizadoEm: new Date("2026-11-08T00:00:00.000Z"),
  };
  const coletaRecente = {
    cpuPercent: 50,
    memoryGb: 2,
    diskGb: 10,
    networkGb: 5,
  };

  const regiaoSudeste = {
    codigo: "br-sudeste",
    pais: "Brasil",
    regiao: "Sudeste",
    cidade: "São Paulo",
    latitude: -23.55,
    longitude: -46.63,
    atualizadaEm: new Date("2026-11-08T00:00:00.000Z"),
  };

  beforeEach(() => {
    listarComLocalizacao.mockReset();
    calcularPotencia.mockReset().mockReturnValue(componentes);
  });

  it("busca os serviços com a região, do mais recente ao mais antigo", async () => {
    listarComLocalizacao.mockResolvedValue([]);

    await service.listarServicos();

    expect(listarComLocalizacao).toHaveBeenCalledWith();
  });

  it("devolve país, região e cidade de cada serviço", async () => {
    listarComLocalizacao.mockResolvedValue([
      {
        ...servicoBase,
        coletas: [coletaRecente],
        regiao: regiaoSudeste,
      },
    ]);

    const [servico] = await service.listarServicos();

    expect(servico).toEqual({
      ...servicoBase,
      localizacao: {
        codigo: "br-sudeste",
        pais: "Brasil",
        regiao: "Sudeste",
        cidade: "São Paulo",
        latitude: -23.55,
        longitude: -46.63,
      },
      componentes,
    });
    expect(servico).not.toHaveProperty("regiao");
    expect(calcularPotencia).toHaveBeenCalledWith(50, 2, 10, 5);
  });

  it("mantém a cidade e as coordenadas como null quando a API não informa", async () => {
    listarComLocalizacao.mockResolvedValue([
      {
        ...servicoBase,
        coletas: [coletaRecente],
        regiaoCodigo: "us-east",
        regiao: {
          ...regiaoSudeste,
          codigo: "us-east",
          pais: "Estados Unidos",
          regiao: "Virgínia",
          cidade: null,
          latitude: null,
          longitude: null,
        },
      },
    ]);

    const [servico] = await service.listarServicos();

    expect(servico.localizacao).toEqual({
      codigo: "us-east",
      pais: "Estados Unidos",
      regiao: "Virgínia",
      cidade: null,
      latitude: null,
      longitude: null,
    });
    expect(servico).toHaveProperty("componentes", componentes);
  });
});
