import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UsePipes,
  UseFilters,
  ValidationPipe,
} from '@nestjs/common';
import { ColetasService } from './coletas.service';
import { CreateColetaDto } from './dto/create-coleta.dto';
import { FilterColetasDto } from './dto/filter-coleta.dto';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';

@Controller('coletas')
@UseFilters(HttpExceptionFilter)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
)
export class ColetasController {
  constructor(private readonly coletasService: ColetasService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async criar(@Body() dto: CreateColetaDto) {
    return this.coletasService.registrarColeta(dto);
  }

  @Get()
  async listar(@Query() filtros: FilterColetasDto) {
    return this.coletasService.listarHistorico(filtros);
  }

  @Get('servico/:servicoId/ultima-valida')
  async obterUltimaValida(@Param('servicoId', ParseIntPipe) servicoId: number) {
    return this.coletasService.obterUltimaColetaValida(servicoId);
  }

  @Get(':id')
  async buscarPorId(@Param('id', ParseIntPipe) id: number) {
    return this.coletasService.buscarPorId(id);
  }
}