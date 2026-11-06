import { Injectable, NotFoundException } from "@nestjs/common";
import { ColetasRepository } from "./coletas.repository";
import {
  CreateColetaDto,
  EstadoCalculoEnum,
  EstadoColetaEnum,
} from "./dto/create-coleta.dto";
import { FilterColetasDto } from "./dto/filter-coleta.dto";
import { CalculosService } from "../calculos/calculos.service";
import { ServicosService } from "../servicos/servicos.service";

@Injectable()
export class ColetasService {
  constructor(
    private readonly coletasRepository: ColetasRepository,
    private readonly calculosService: CalculosService,
    private readonly servicosService: ServicosService,
  ) {}

  async registrarColeta(dto: CreateColetaDto) {
    dto.estadoCalculo = EstadoCalculoEnum.PENDENTE;

    const temMedicao =
      (dto.cpuPercent != null &&
        Number.isFinite(dto.cpuPercent) &&
        dto.cpuPercent !== 0) ||
      (dto.memoryGb != null &&
        Number.isFinite(dto.memoryGb) &&
        dto.memoryGb !== 0) ||
      (dto.diskGb != null && Number.isFinite(dto.diskGb) && dto.diskGb !== 0) ||
      (dto.networkGb != null &&
        Number.isFinite(dto.networkGb) &&
        dto.networkGb !== 0);

    const semMedicoes = !temMedicao;

    if (semMedicoes && dto.estadoColeta !== EstadoColetaEnum.FALHA) {
      dto.estadoColeta = EstadoColetaEnum.SEM_METRICAS;
      dto.mensagemErro =
        dto.mensagemErro ??
        "Serviço acessível, porém sem medições de consumo disponíveis no payload retornado.";
    }

    if (temMedicao) {
      const energiaKwh = this.calculosService.calcularEnergia(
        dto.cpuPercent ?? 0,
        dto.memoryGb ?? 0,
        dto.diskGb ?? 0,
        dto.networkGb ?? 0,
        dto.intervaloColetaSegundos ?? 60,
      );

      const servico = await this.servicosService.findById(dto.servicoId);

      if (!servico) {
        throw new NotFoundException("Serviço não encontrado");
      }

      const resultadoEmissao = await this.calculosService.calcularEmissao(
        energiaKwh,
        servico.regiaoCodigo,
      );

      dto.energiaKwh = energiaKwh;
      dto.intensidadeCarbonoGCo2ePorKwh =
        resultadoEmissao.intensidadeCarbonoGCo2ePorKwh;
      dto.emissaoGCo2e = resultadoEmissao.emissaoGCo2e;
      dto.estadoCalculo = EstadoCalculoEnum.CONCLUIDO;
    }

    return this.coletasRepository.create(dto);
  }

  async listarHistorico(filtros: FilterColetasDto) {
    return this.coletasRepository.findMany(filtros);
  }

  async obterUltimaColetaValida(servicoId: number) {
    const ultimaColeta =
      await this.coletasRepository.findLatestSuccessful(servicoId);

    if (!ultimaColeta) {
      throw new NotFoundException(
        `Nenhuma coleta válida anterior encontrada para o serviço ID ${servicoId}`,
      );
    }

    return {
      fonte: "CACHE_FALLBACK",
      mensagem: "Dados recuperados da última coleta válida preservada",
      dados: ultimaColeta,
    };
  }

  async buscarPorId(id: number) {
    const coleta = await this.coletasRepository.findById(id);
    if (!coleta) {
      throw new NotFoundException(`Coleta com id ${id} não encontrada.`);
    }
    return coleta;
  }
}
