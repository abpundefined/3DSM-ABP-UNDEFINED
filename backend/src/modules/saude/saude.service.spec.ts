jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { RegistroIntegracoesService } from "./registro-integracoes.service";
import type { SaudeRepository } from "./saude.repository";
import { SaudeService } from "./saude.service";

describe("SaudeService", () => {
  const agora = new Date("2026-11-17T12:00:00.000Z");
  let registro: RegistroIntegracoesService;
  let repository: {
    contarColetasDesde: jest.Mock;
    contarServicosPorEstado: jest.Mock;
  };
  let service: SaudeService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(agora);
    registro = new RegistroIntegracoesService();
    repository = {
      contarColetasDesde: jest.fn().mockResolvedValue([]),
      contarServicosPorEstado: jest.fn().mockResolvedValue([]),
    };
    service = new SaudeService(
      registro,
      repository as unknown as SaudeRepository,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("informa SEM_CONSULTA e zeros antes de qualquer consulta ou coleta", async () => {
    const semConsulta = {
      estado: "SEM_CONSULTA",
      ultimaConsultaEm: null,
      tempoRespostaMs: null,
      ultimoSucessoEm: null,
      mensagemErro: null,
    };

    await expect(service.obter()).resolves.toEqual({
      geradoEm: "2026-11-17T12:00:00.000Z",
      agregador: semConsulta,
      apiCarbono: semConsulta,
      ultimaDescobertaEm: null,
      coletasUltimaHora: { total: 0, falhas: 0, taxaFalha: null },
      servicosPorEstado: {
        DISPONIVEL: 0,
        INDISPONIVEL: 0,
        SEM_METRICAS: 0,
        REMOVIDO: 0,
        DESCONHECIDO: 0,
      },
    });
  });

  it("marca a integração como OPERACIONAL após uma consulta bem-sucedida", async () => {
    await registro.medir("agregador", () => {
      jest.advanceTimersByTime(120);
      return Promise.resolve(1);
    });

    const resposta = await service.obter();

    expect(resposta.agregador).toEqual({
      estado: "OPERACIONAL",
      ultimaConsultaEm: "2026-11-17T12:00:00.120Z",
      tempoRespostaMs: 120,
      ultimoSucessoEm: "2026-11-17T12:00:00.120Z",
      mensagemErro: null,
    });
    expect(resposta.ultimaDescobertaEm).toBe("2026-11-17T12:00:00.120Z");
    expect(resposta.apiCarbono.estado).toBe("SEM_CONSULTA");
  });

  it("marca FALHA com a mensagem e preserva o último sucesso", async () => {
    await registro.medir("agregador", () => Promise.resolve(1));
    jest.advanceTimersByTime(30_000);
    await expect(
      registro.medir("agregador", () =>
        Promise.reject(new Error("Tempo limite excedido")),
      ),
    ).rejects.toThrow();

    const resposta = await service.obter();

    expect(resposta.agregador).toMatchObject({
      estado: "FALHA",
      ultimaConsultaEm: "2026-11-17T12:00:30.000Z",
      ultimoSucessoEm: "2026-11-17T12:00:00.000Z",
      mensagemErro: "Tempo limite excedido",
    });
    expect(resposta.ultimaDescobertaEm).toBe("2026-11-17T12:00:00.000Z");
  });

  it("marca FALHA sem último sucesso quando a primeira consulta falha", async () => {
    await expect(
      registro.medir("agregador", () =>
        Promise.reject(new Error("fetch failed")),
      ),
    ).rejects.toThrow();

    const resposta = await service.obter();

    expect(resposta.agregador).toMatchObject({
      estado: "FALHA",
      ultimoSucessoEm: null,
      mensagemErro: "fetch failed",
    });
    expect(resposta.ultimaDescobertaEm).toBeNull();
  });

  it("resume as coletas da última hora", async () => {
    repository.contarColetasDesde.mockResolvedValue([
      { estado: "SUCESSO", quantidade: 8 },
      { estado: "FALHA", quantidade: 2 },
    ]);

    const resposta = await service.obter();

    expect(repository.contarColetasDesde).toHaveBeenCalledWith(
      new Date("2026-11-17T11:00:00.000Z"),
    );
    expect(resposta.coletasUltimaHora).toEqual({
      total: 10,
      falhas: 2,
      taxaFalha: 0.2,
    });
  });

  it("devolve todos os estados de serviço, com zero nos ausentes", async () => {
    repository.contarServicosPorEstado.mockResolvedValue([
      { estado: "DISPONIVEL", quantidade: 5 },
      { estado: "SEM_METRICAS", quantidade: 1 },
    ]);

    const resposta = await service.obter();

    expect(resposta.servicosPorEstado).toEqual({
      DISPONIVEL: 5,
      INDISPONIVEL: 0,
      SEM_METRICAS: 1,
      REMOVIDO: 0,
      DESCONHECIDO: 0,
    });
  });
});
