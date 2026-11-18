import { Injectable } from "@nestjs/common";

export type NomeIntegracao = "agregador" | "apiCarbono";

export interface RegistroConsulta {
  ultimaConsultaEm: Date;
  sucesso: boolean;
  tempoRespostaMs: number;
  mensagemErro: string | null;
  ultimoSucessoEm: Date | null;
}

@Injectable()
export class RegistroIntegracoesService {
  private readonly registros = new Map<NomeIntegracao, RegistroConsulta>();

  async medir<T>(nome: NomeIntegracao, operacao: () => Promise<T>): Promise<T> {
    const inicio = Date.now();
    try {
      const resultado = await operacao();
      this.registrar(nome, inicio, null);
      return resultado;
    } catch (erro) {
      this.registrar(
        nome,
        inicio,
        erro instanceof Error ? erro.message : "Erro desconhecido",
      );
      throw erro;
    }
  }

  obter(nome: NomeIntegracao): RegistroConsulta | null {
    return this.registros.get(nome) ?? null;
  }

  private registrar(
    nome: NomeIntegracao,
    inicio: number,
    mensagemErro: string | null,
  ) {
    const agora = new Date();
    const sucesso = mensagemErro === null;

    this.registros.set(nome, {
      ultimaConsultaEm: agora,
      sucesso,
      tempoRespostaMs: agora.getTime() - inicio,
      mensagemErro,
      ultimoSucessoEm: sucesso
        ? agora
        : (this.registros.get(nome)?.ultimoSucessoEm ?? null),
    });
  }
}
