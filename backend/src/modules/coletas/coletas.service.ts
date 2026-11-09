import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ColetasRepository } from './coletas.repository';
import {
  CreateColetaDto,
  EstadoCalculoEnum,
  EstadoColetaEnum,
} from './dto/create-coleta.dto';
import { FilterColetasDto } from './dto/filter-coleta.dto';
import { CalculosService } from '../calculos/calculos.service';
import { ServicosService } from '../servicos/servicos.service';
import { possuiMedicoes } from '../../common/regras/classificacao-estado';

@Injectable()
export class ColetasService {
  private readonly logger = new Logger(ColetasService.name);

  constructor(
    private readonly coletasRepository: ColetasRepository,
    private readonly calculosService: CalculosService,
    private readonly servicosService: ServicosService,
  ) {}

  async registrarColeta(dto: CreateColetaDto) {
    dto.estadoCalculo = EstadoCalculoEnum.PENDENTE;

    const temMedicao = possuiMedicoes(dto);

    const semMedicoes = !temMedicao;

    if (semMedicoes && dto.estadoColeta !== EstadoColetaEnum.FALHA) {
      dto.estadoColeta = EstadoColetaEnum.SEM_METRICAS;
      dto.mensagemErro =
        dto.mensagemErro ??
        'Serviço acessível, porém sem medições de consumo disponíveis no payload retornado.';
    }

    if (temMedicao && dto.intervaloColetaSegundos != null) {
      try {
        const energiaKwh = this.calculosService.calcularEnergia(
          dto.cpuPercent ?? 0,
          dto.memoryGb ?? 0,
          dto.diskGb ?? 0,
          dto.networkGb ?? 0,
          dto.intervaloColetaSegundos,
        );
        dto.energiaKwh = energiaKwh;

        const servico = await this.servicosService.findById(dto.servicoId);
        if (!servico) {
          throw new NotFoundException('Serviço não encontrado');
        }

        const resultadoEmissao = await this.calculosService.calcularEmissao(
          energiaKwh,
          servico.regiaoCodigo,
        );

        dto.intensidadeCarbonoGCo2ePorKwh =
          resultadoEmissao.intensidadeCarbonoGCo2ePorKwh;
        dto.emissaoGCo2e = resultadoEmissao.emissaoGCo2e;
        dto.estadoCalculo = EstadoCalculoEnum.CONCLUIDO;
      } catch (error) {
        const mensagemErro =
          error instanceof Error ? error.message : 'Erro desconhecido';
        this.logger.error(
          `Falha ao calcular energia ou emissão da coleta ${dto.servicoId}: ${mensagemErro}`,
          error instanceof Error ? error.stack : undefined,
        );
        dto.estadoColeta = EstadoColetaEnum.SUCESSO;
        dto.estadoCalculo = EstadoCalculoEnum.FALHA;
        dto.mensagemErro = `Falha no cálculo ambiental: ${mensagemErro}`;
      }
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
      fonte: 'CACHE_FALLBACK',
      mensagem: 'Dados recuperados da última coleta válida preservada',
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
