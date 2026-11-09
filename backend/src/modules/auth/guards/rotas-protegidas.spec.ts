jest.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));
jest.mock('@nestjs/jwt', () => ({ JwtService: class JwtService {} }));
jest.mock('../../../database/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ColetasController } from '../../coletas/coletas.controller';
import { ConfiguracaoController } from '../../configuracao/configuracao.controller';
import { ServicosController } from '../../servicos/servicos.controller';
import { JwtAuthGuard } from './jwt-auth.guard';

type Controller = { prototype: object };

const guardsDa = (controller: Controller, metodo: string): unknown[] => {
  const handler = (controller.prototype as Record<string, object>)[metodo];
  return (
    (Reflect.getMetadata(GUARDS_METADATA, handler) as unknown[] | undefined) ??
    []
  );
};

describe('Rotas protegidas por JWT', () => {
  it.each<[string, Controller, string]>([
    ['POST /coletas', ColetasController, 'criar'],
    ['POST /servicos/sync', ServicosController, 'sincronizar'],
    ['PUT /configuracao', ConfiguracaoController, 'atualizar'],
  ])('%s exige JWT', (_rota, controller, metodo) => {
    expect(guardsDa(controller, metodo)).toContain(JwtAuthGuard);
  });

  it.each<[string, Controller, string]>([
    ['GET /coletas', ColetasController, 'listar'],
    ['GET /coletas/:id', ColetasController, 'buscarPorId'],
    [
      'GET /coletas/servico/:servicoId/ultima-valida',
      ColetasController,
      'obterUltimaValida',
    ],
    ['GET /servicos', ServicosController, 'listar'],
    ['GET /configuracao', ConfiguracaoController, 'obter'],
  ])('%s continua pública', (_rota, controller, metodo) => {
    expect(guardsDa(controller, metodo)).not.toContain(JwtAuthGuard);
  });
});
