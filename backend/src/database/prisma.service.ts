import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: configService.getOrThrow<string>('DATABASE_URL'),
    });

    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async verifySchema(): Promise<void> {
    await this.$connect();

    const [result] = await this.$queryRaw<Array<{ missing: string[] }>>`
      SELECT ARRAY(
        SELECT required.table_name
        FROM unnest(ARRAY[
          'Regiao',
          'Servico',
          'Coleta',
          'Usuario',
          'ConfiguracaoMonitoramento'
        ]::text[]) AS required(table_name)
        WHERE to_regclass(format('public.%I', required.table_name)) IS NULL
      ) AS missing
    `;

    if (result.missing.length > 0) {
      throw new Error(
        `O banco foi conectado, mas o schema está incompleto (tabelas ausentes: ${result.missing.join(', ')}). Execute "npm run db:migrate" na pasta backend antes de iniciar o monitoramento.`,
      );
    }
  }
}
