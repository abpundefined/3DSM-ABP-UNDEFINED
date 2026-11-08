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
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import { ColetasService } from "./coletas.service";
import { CreateColetaDto } from "./dto/create-coleta.dto";
import { FilterColetasDto } from "./dto/filter-coleta.dto";
import { HttpExceptionFilter } from "../../common/filters/http-exception.filter";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

@ApiTags("Coletas")
@Controller("coletas")
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
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Registrar uma coleta" })
  async criar(@Body() dto: CreateColetaDto) {
    return this.coletasService.registrarColeta(dto);
  }

  @Get()
  @ApiOperation({ summary: "Consultar histórico de coletas" })
  async listar(@Query() filtros: FilterColetasDto) {
    return this.coletasService.listarHistorico(filtros);
  }

  @Get("servico/:servicoId/ultima-valida")
  @ApiOperation({ summary: "Consultar última coleta válida de um serviço" })
  @ApiResponse({
    status: 404,
    description: "Nenhuma coleta válida encontrada.",
  })
  async obterUltimaValida(@Param("servicoId", ParseIntPipe) servicoId: number) {
    return this.coletasService.obterUltimaColetaValida(servicoId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Consultar coleta pelo ID" })
  @ApiResponse({ status: 404, description: "Coleta não encontrada." })
  async buscarPorId(@Param("id", ParseIntPipe) id: number) {
    return this.coletasService.buscarPorId(id);
  }
}
