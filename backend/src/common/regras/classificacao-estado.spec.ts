import { EstadoColetaEnum } from "../../modules/coletas/estados-coleta.enum";
import {
  classificarFalhaDeConexao,
  classificarMedicoes,
  classificarRespostaHttp,
  possuiMedicoes,
} from "./classificacao-estado";

describe("Regras de classificação de estado", () => {
  describe("possuiMedicoes", () => {
    it.each([
      ["CPU informada", { cpuPercent: 12 }, true],
      ["CPU zerada com memória em uso", { cpuPercent: 0, memoryGb: 2 }, true],
      ["somente rede informada", { networkGb: 0.4 }, true],
      [
        "todas as métricas zeradas",
        { cpuPercent: 0, memoryGb: 0, diskGb: 0, networkGb: 0 },
        false,
      ],
      ["nenhum campo informado", {}, false],
      ["valores nulos", { cpuPercent: null, memoryGb: null }, false],
      ["valor não finito", { cpuPercent: Number.NaN }, false],
      ["valor negativo", { diskGb: -1 }, false],
    ])("%s", (_cenario, medicoes, esperado) => {
      expect(possuiMedicoes(medicoes)).toBe(esperado);
    });
  });

  describe("classificarMedicoes", () => {
    it("considera o serviço disponível quando há medição útil", () => {
      expect(classificarMedicoes({ cpuPercent: 0, memoryGb: 1.5 })).toEqual({
        estadoServico: "DISPONIVEL",
        estadoColeta: EstadoColetaEnum.SUCESSO,
      });
    });

    it("considera o serviço sem métricas quando tudo vem zerado", () => {
      expect(
        classificarMedicoes({ cpuPercent: 0, memoryGb: 0, diskGb: 0 }),
      ).toEqual({
        estadoServico: "SEM_METRICAS",
        estadoColeta: EstadoColetaEnum.SEM_METRICAS,
      });
    });
  });

  describe("classificarRespostaHttp", () => {
    it("trata 404 como serviço listado sem métricas", () => {
      expect(classificarRespostaHttp(404)).toEqual({
        estadoServico: "SEM_METRICAS",
        estadoColeta: EstadoColetaEnum.SEM_METRICAS,
        codigoErro: "404",
      });
    });

    it.each([500, 502, 503, 400, 401])(
      "trata HTTP %i como indisponibilidade",
      (status) => {
        expect(classificarRespostaHttp(status)).toEqual({
          estadoServico: "INDISPONIVEL",
          estadoColeta: EstadoColetaEnum.FALHA,
          codigoErro: String(status),
        });
      },
    );
  });

  describe("classificarFalhaDeConexao", () => {
    it("identifica tempo esgotado", () => {
      expect(classificarFalhaDeConexao(true)).toEqual({
        estadoServico: "INDISPONIVEL",
        estadoColeta: EstadoColetaEnum.FALHA,
        codigoErro: "TIMEOUT",
      });
    });

    it("identifica erro de rede", () => {
      expect(classificarFalhaDeConexao(false).codigoErro).toBe("FETCH_ERROR");
    });
  });
});
