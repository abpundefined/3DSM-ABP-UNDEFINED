import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { ColetasModule } from './modules/coletas/coletas.module';
import { ServicosModule } from './modules/servicos/servicos.module';
import { MonitoramentoModule } from './modules/monitoramento/monitoramento.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    DatabaseModule,
    ColetasModule,
    ServicosModule,
    MonitoramentoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
