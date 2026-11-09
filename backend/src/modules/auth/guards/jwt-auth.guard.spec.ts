jest.mock('@nestjs/jwt', () => ({ JwtService: class JwtService {} }));

import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard, RequisicaoAutenticada } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const jwtService = { verifyAsync: jest.fn() };
  const guard = new JwtAuthGuard(jwtService as unknown as JwtService);

  const criarContexto = (authorization?: string) => {
    const request = { headers: { authorization } } as RequisicaoAutenticada;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    return { request, context };
  };

  beforeEach(() => {
    jwtService.verifyAsync.mockReset();
  });

  it('bloqueia a requisição sem o header Authorization', async () => {
    const { context } = criarContexto();

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Token de acesso ausente.',
    );
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('bloqueia quando o header não usa o esquema Bearer', async () => {
    const { context } = criarContexto('Basic abc123');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('bloqueia token inválido ou expirado', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));
    const { context } = criarContexto('Bearer token-invalido');

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Token inválido ou expirado.',
    );
  });

  it('libera o token válido e anexa o usuário à requisição', async () => {
    const payload = { sub: 1, email: 'admin@greener.dev' };
    jwtService.verifyAsync.mockResolvedValue(payload);
    const { request, context } = criarContexto('Bearer token-valido');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('token-valido');
    expect(request.usuario).toEqual(payload);
  });
});
