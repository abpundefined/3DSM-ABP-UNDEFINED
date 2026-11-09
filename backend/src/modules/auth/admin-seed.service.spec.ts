jest.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));
jest.mock('../../database/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AdminSeedService } from './admin-seed.service';
import { UsuariosRepository } from './usuarios.repository';

describe('AdminSeedService', () => {
  const usuariosRepository = { findByEmail: jest.fn(), create: jest.fn() };
  let env: Record<string, string | undefined>;

  const criarService = () =>
    new AdminSeedService(
      { get: (chave: string) => env[chave] } as unknown as ConfigService,
      usuariosRepository as unknown as UsuariosRepository,
    );

  beforeEach(() => {
    usuariosRepository.findByEmail.mockReset();
    usuariosRepository.create.mockReset();
    env = {
      ADMIN_NOME: 'Admin',
      ADMIN_EMAIL: 'admin@greener.dev',
      ADMIN_PASSWORD: 'senha123',
    };
  });

  it('cria o administrador com a senha em hash quando ele ainda não existe', async () => {
    usuariosRepository.findByEmail.mockResolvedValue(null);

    await criarService().onApplicationBootstrap();

    expect(usuariosRepository.create).toHaveBeenCalledTimes(1);
    const [dados] = usuariosRepository.create.mock.calls[0] as [
      { nome: string; email: string; senhaHash: string },
    ];
    expect(dados.nome).toBe('Admin');
    expect(dados.email).toBe('admin@greener.dev');
    expect(dados.senhaHash).not.toBe('senha123');
    await expect(bcrypt.compare('senha123', dados.senhaHash)).resolves.toBe(
      true,
    );
  });

  it('não recria o administrador quando o e-mail já está cadastrado', async () => {
    usuariosRepository.findByEmail.mockResolvedValue({ id: 1 });

    await criarService().onApplicationBootstrap();

    expect(usuariosRepository.create).not.toHaveBeenCalled();
  });

  it('não cria ninguém quando as variáveis do administrador não existem', async () => {
    env = {};

    await criarService().onApplicationBootstrap();

    expect(usuariosRepository.findByEmail).not.toHaveBeenCalled();
    expect(usuariosRepository.create).not.toHaveBeenCalled();
  });
});
