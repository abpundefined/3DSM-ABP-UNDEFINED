jest.mock("@nestjs/config", () => ({ ConfigService: class ConfigService {} }));
jest.mock("../servicos/servicos.service", () => ({
  ServicosService: class ServicosService {},
}));
jest.mock("../coletas/coletas.service", () => ({
  ColetasService: class ColetasService {},
}));
jest.mock("../configuracao/configuracao.service", () => ({
  ConfiguracaoService: class ConfiguracaoService {},
}));

import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { ColetasService } from "../coletas/coletas.service";
import { ConfiguracaoService } from "../configuracao/configuracao.service";
import { ServicosService } from "../servicos/servicos.service";
import { MonitoramentoService } from "./monitoramento.service";

describe("Agendamento do monitoramento", () => {
  let module: TestingModule;
  let service: MonitoramentoService;
  let configuracao: {
    intervaloColetaSegundos: number;
    intervaloDescobertaSegundos: number;
  };
  const obter = jest.fn();
  const verificarSchema = jest.fn();
  const syncServices = jest.fn();
  const listarServicosParaMonitoramento = jest.fn();
  const get = jest.fn();
  let warn: jest.SpyInstance;

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-11-09T12:00:00Z"));
    configuracao = {
      intervaloColetaSegundos: 60,
      intervaloDescobertaSegundos: 120,
    };
    obter
      .mockReset()
      .mockImplementation(() => Promise.resolve({ ...configuracao }));
    verificarSchema.mockReset().mockResolvedValue(undefined);
    syncServices.mockReset().mockResolvedValue([]);
    listarServicosParaMonitoramento.mockReset().mockResolvedValue([]);
    get.mockReset().mockReturnValue("30000");
    warn = jest
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, "debug").mockImplementation(() => undefined);
    module = await Test.createTestingModule({
      providers: [
        MonitoramentoService,
        { provide: ConfigService, useValue: { get } },
        { provide: ConfiguracaoService, useValue: { obter } },
        {
          provide: ServicosService,
          useValue: {
            verificarSchema,
            syncServices,
            listarServicosParaMonitoramento,
          },
        },
        { provide: ColetasService, useValue: {} },
      ],
    }).compile();
    service = module.get(MonitoramentoService);
  });

  afterEach(async () => {
    await module.close();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  async function iniciarMonitoramento() {
    await service.onModuleInit();
    await jest.advanceTimersByTimeAsync(0);
  }

  it("executa o segundo ciclo aos 60 segundos, não aos 30", async () => {
    await iniciarMonitoramento();
    expect(verificarSchema).toHaveBeenCalledTimes(1);
    expect(listarServicosParaMonitoramento).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(30000);
    expect(listarServicosParaMonitoramento).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(30000);
    expect(listarServicosParaMonitoramento).toHaveBeenCalledTimes(2);
  });

  it("relê a configuração e aplica o novo intervalo após o próximo ciclo", async () => {
    await iniciarMonitoramento();
    configuracao.intervaloColetaSegundos = 10;
    await jest.advanceTimersByTimeAsync(60000);
    expect(listarServicosParaMonitoramento).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(9999);
    expect(listarServicosParaMonitoramento).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(1);
    expect(listarServicosParaMonitoramento).toHaveBeenCalledTimes(3);
  });

  it("só repete a descoberta após o intervalo configurado", async () => {
    await iniciarMonitoramento();
    expect(syncServices).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(60000);
    expect(syncServices).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(60000);
    expect(syncServices).toHaveBeenCalledTimes(2);
    expect(listarServicosParaMonitoramento).toHaveBeenCalledTimes(3);
  });

  it("aplica alterações no intervalo de descoberta sem reiniciar", async () => {
    await iniciarMonitoramento();
    configuracao.intervaloDescobertaSegundos = 60;
    await jest.advanceTimersByTimeAsync(60000);
    expect(syncServices).toHaveBeenCalledTimes(2);
  });

  it("usa a variável de ambiente e continua quando a leitura falha", async () => {
    obter.mockRejectedValue(new Error("Banco indisponível"));
    get.mockReturnValue("45000");
    await iniciarMonitoramento();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Banco indisponível"),
    );
    await jest.advanceTimersByTimeAsync(44999);
    expect(listarServicosParaMonitoramento).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(listarServicosParaMonitoramento).toHaveBeenCalledTimes(2);
    obter.mockImplementation(() => Promise.resolve({ ...configuracao }));
    await jest.advanceTimersByTimeAsync(45000);
    await jest.advanceTimersByTimeAsync(59999);
    expect(listarServicosParaMonitoramento).toHaveBeenCalledTimes(3);
    await jest.advanceTimersByTimeAsync(1);
    expect(listarServicosParaMonitoramento).toHaveBeenCalledTimes(4);
  });

  it.each([undefined, "inválido", "0", "-1", "Infinity"])(
    "usa 30 segundos quando a configuração falha e o fallback é %s",
    async (fallback) => {
      obter.mockRejectedValue(new Error("Banco indisponível"));
      get.mockReturnValue(fallback);
      await iniciarMonitoramento();
      await jest.advanceTimersByTimeAsync(29999);
      expect(listarServicosParaMonitoramento).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(1);
      expect(listarServicosParaMonitoramento).toHaveBeenCalledTimes(2);
    },
  );

  it("rejeita intervalos inválidos retornados pelo serviço de configuração", async () => {
    configuracao.intervaloColetaSegundos = NaN;
    await iniciarMonitoramento();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Intervalos de monitoramento inválidos"),
    );
    await jest.advanceTimersByTimeAsync(30000);
    expect(listarServicosParaMonitoramento).toHaveBeenCalledTimes(2);
  });

  it("cancela o timer ao destruir o módulo", async () => {
    await iniciarMonitoramento();
    service.onModuleDestroy();
    expect(jest.getTimerCount()).toBe(0);
    await jest.advanceTimersByTimeAsync(180000);
    expect(listarServicosParaMonitoramento).toHaveBeenCalledTimes(1);
  });

  it("não reagenda se for destruído durante um ciclo", async () => {
    let concluir!: () => void;
    listarServicosParaMonitoramento.mockImplementationOnce(
      () =>
        new Promise<never[]>((resolve) => {
          concluir = () => resolve([]);
        }),
    );
    const inicializacao = service.onModuleInit();
    await jest.advanceTimersByTimeAsync(0);
    service.onModuleDestroy();
    concluir();
    await inicializacao;
    await jest.advanceTimersByTimeAsync(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("não sobrepõe ciclos e espera o ciclo terminar antes de agendar", async () => {
    let concluir!: () => void;
    listarServicosParaMonitoramento.mockImplementationOnce(
      () =>
        new Promise<never[]>((resolve) => {
          concluir = () => resolve([]);
        }),
    );
    await service.onModuleInit();
    await jest.advanceTimersByTimeAsync(0);
    expect(listarServicosParaMonitoramento).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
    await service.pollOnce();
    await jest.advanceTimersByTimeAsync(90000);
    expect(listarServicosParaMonitoramento).toHaveBeenCalledTimes(1);
    concluir();
    await jest.advanceTimersByTimeAsync(0);
    await jest.advanceTimersByTimeAsync(59999);
    expect(listarServicosParaMonitoramento).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(listarServicosParaMonitoramento).toHaveBeenCalledTimes(2);
  });

  it("usa a configuração alterada durante a coleta ao agendar o próximo ciclo", async () => {
    listarServicosParaMonitoramento.mockImplementationOnce(() => {
      configuracao.intervaloColetaSegundos = 10;
      return Promise.resolve([]);
    });
    await iniciarMonitoramento();
    await jest.advanceTimersByTimeAsync(9999);
    expect(listarServicosParaMonitoramento).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(listarServicosParaMonitoramento).toHaveBeenCalledTimes(2);
  });

  it("não cria timer se o encerramento ocorrer durante a leitura para reagendamento", async () => {
    let concluir!: () => void;
    obter
      .mockImplementationOnce(() => Promise.resolve({ ...configuracao }))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            concluir = () => resolve({ ...configuracao });
          }),
      );
    const inicializacao = service.onModuleInit();
    await jest.advanceTimersByTimeAsync(0);
    service.onModuleDestroy();
    concluir();
    await inicializacao;
    await jest.advanceTimersByTimeAsync(0);
    expect(jest.getTimerCount()).toBe(0);
    await service.pollOnce();
    expect(listarServicosParaMonitoramento).toHaveBeenCalledTimes(1);
  });

  it("tenta descobrir novamente após falha e não interrompe o agendamento", async () => {
    syncServices.mockRejectedValueOnce(new Error("Agregador indisponível"));
    await iniciarMonitoramento();
    expect(listarServicosParaMonitoramento).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(60000);
    expect(syncServices).toHaveBeenCalledTimes(2);
    expect(listarServicosParaMonitoramento).toHaveBeenCalledTimes(1);
  });
});
