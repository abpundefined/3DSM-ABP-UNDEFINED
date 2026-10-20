import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Serviço temporariamente indisponível. A última medição válida foi preservada.';

    const mensagem =
      typeof exceptionResponse === 'object'
        ? (exceptionResponse as any).message || exceptionResponse
        : exceptionResponse;

    this.logger.error(
      `[HTTP ${status}] Rota: ${request.method} ${request.url} | Detalhes: ${JSON.stringify(mensagem)}`,
    );

    response.status(status).json({
      sucesso: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      rota: request.url,
      mensagem,
    });
  }
}